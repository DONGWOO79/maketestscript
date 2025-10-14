import { Page, CDPSession } from 'playwright';
import { BrowserSession, TestStep, SelectorInfo, SelectorCandidate } from './SessionManager';
import { v4 as uuidv4 } from 'uuid';

export class Recorder {
  private session: BrowserSession;

  constructor(session: BrowserSession) {
    this.session = session;
  }

  async startRecording(): Promise<void> {
    this.session.recording = true;
    const { page, cdpSession } = this.session;

    // Listen to navigation
    page.on('framenavigated', async (frame) => {
      if (frame === page.mainFrame()) {
        const step: TestStep = {
          id: uuidv4(),
          type: 'navigate',
          timestamp: Date.now(),
          url: frame.url(),
        };
        this.session.steps.push(step);
        this.session.eventEmitter.emit('step-recorded', step);
      }
    });

    // Inject recorder script to capture clicks/inputs
    await page.addInitScript(() => {
      (window as any).__recorder_events = [];
      
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        (window as any).__recorder_events.push({
          type: 'click',
          timestamp: Date.now(),
          x: e.clientX,
          y: e.clientY,
          tagName: target.tagName,
        });
      }, true);

      document.addEventListener('input', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          (window as any).__recorder_events.push({
            type: 'input',
            timestamp: Date.now(),
            value: (target as HTMLInputElement).value,
            x: target.getBoundingClientRect().left,
            y: target.getBoundingClientRect().top,
          });
        }
      }, true);
    });
  }

  stopRecording(): void {
    this.session.recording = false;
  }

  async handleClickAt(x: number, y: number): Promise<SelectorInfo | null> {
    const { page, cdpSession } = this.session;

    try {
      // Use CDP to get node at location
      const { backendNodeId } = await cdpSession.send('DOM.getNodeForLocation', {
        x: Math.round(x),
        y: Math.round(y),
      });

      if (!backendNodeId) return null;

      // Get node details
      const { node } = await cdpSession.send('DOM.describeNode', {
        backendNodeId,
      });

      // Get element handle from page
      const elementHandle = await page.evaluateHandle((nodeId) => {
        // Find element by walking DOM (simplified)
        return document.body; // Placeholder - need proper node resolution
      }, node.nodeId);

      // Extract element info
      const elementInfo = await page.evaluate((el) => {
        if (!(el instanceof HTMLElement)) return null;
        
        const rect = el.getBoundingClientRect();
        const attributes: Record<string, string> = {};
        for (const attr of el.attributes) {
          attributes[attr.name] = attr.value;
        }

        return {
          tagName: el.tagName.toLowerCase(),
          outerHTML: el.outerHTML.slice(0, 500), // Truncate for performance
          attributes,
          boundingBox: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
          textContent: el.textContent?.trim() || '',
        };
      }, elementHandle);

      if (!elementInfo) return null;

      // Generate selector candidates
      const candidates = await this.generateSelectors(page, elementInfo, cdpSession, backendNodeId);

      const selectorInfo: SelectorInfo = {
        element: elementInfo,
        candidates,
      };

      return selectorInfo;
    } catch (error) {
      console.error('Error getting element at location:', error);
      return null;
    }
  }

  private async generateSelectors(
    page: Page,
    elementInfo: any,
    cdpSession: CDPSession,
    backendNodeId: number
  ): Promise<SelectorCandidate[]> {
    const candidates: SelectorCandidate[] = [];

    // 1. Test ID (data-testid, data-qa, etc.)
    for (const attr of ['data-testid', 'data-qa', 'data-test']) {
      if (elementInfo.attributes[attr]) {
        const selector = `[${attr}="${elementInfo.attributes[attr]}"]`;
        const uniqueness = await this.countMatches(page, selector);
        candidates.push({
          selector,
          type: 'testid',
          score: 40,
          uniqueness,
        });
      }
    }

    // 2. ARIA Role + Name (if applicable)
    if (elementInfo.attributes.role || ['button', 'input', 'a'].includes(elementInfo.tagName)) {
      const role = elementInfo.attributes.role || this.inferRole(elementInfo.tagName);
      const name = elementInfo.textContent || elementInfo.attributes['aria-label'];
      if (name) {
        const selector = `role=${role}[name="${name}"]`; // Playwright-style
        candidates.push({
          selector,
          type: 'role',
          score: 25,
          uniqueness: 1, // Assume unique for MVP
        });
      }
    }

    // 3. Text content
    if (elementInfo.textContent && elementInfo.textContent.length < 50) {
      const selector = `text="${elementInfo.textContent}"`;
      const uniqueness = await this.countMatches(page, selector);
      candidates.push({
        selector,
        type: 'text',
        score: 15,
        uniqueness,
      });
    }

    // 4. CSS (ID, then class)
    if (elementInfo.attributes.id) {
      const selector = `#${elementInfo.attributes.id}`;
      const uniqueness = await this.countMatches(page, selector);
      candidates.push({
        selector,
        type: 'css',
        score: this.isDynamicId(elementInfo.attributes.id) ? 5 : 10,
        uniqueness,
      });
    }

    if (elementInfo.attributes.class) {
      const classes = elementInfo.attributes.class.split(' ').filter(Boolean);
      if (classes.length > 0) {
        const selector = `${elementInfo.tagName}.${classes.join('.')}`;
        const uniqueness = await this.countMatches(page, selector);
        candidates.push({
          selector,
          type: 'css',
          score: 5,
          uniqueness,
        });
      }
    }

    // Sort by score (descending)
    candidates.sort((a, b) => b.score - a.score);

    return candidates;
  }

  private async countMatches(page: Page, selector: string): Promise<number> {
    try {
      const count = await page.locator(selector).count();
      return count;
    } catch {
      return 999; // Invalid selector
    }
  }

  private inferRole(tagName: string): string {
    const roleMap: Record<string, string> = {
      button: 'button',
      a: 'link',
      input: 'textbox',
      textarea: 'textbox',
      select: 'combobox',
    };
    return roleMap[tagName] || 'generic';
  }

  private isDynamicId(id: string): boolean {
    // Simple heuristic: contains numbers or UUIDs
    return /\d{4,}|[a-f0-9]{8}-[a-f0-9]{4}/.test(id);
  }

  async addStep(step: Omit<TestStep, 'id' | 'timestamp'>): Promise<TestStep> {
    const fullStep: TestStep = {
      ...step,
      id: uuidv4(),
      timestamp: Date.now(),
    };
    this.session.steps.push(fullStep);
    this.session.eventEmitter.emit('step-recorded', fullStep);
    return fullStep;
  }
}

