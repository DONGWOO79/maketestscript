import { Page, CDPSession } from 'playwright';
import { BrowserSession, TestStep, SelectorInfo, SelectorCandidate } from './SessionManager';
import { v4 as uuidv4 } from 'uuid';

export class Recorder {
  private session: BrowserSession;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(session: BrowserSession) {
    this.session = session;
  }

  async startRecording(): Promise<void> {
    this.session.recording = true;
    const { page, cdpSession } = this.session;

    console.log('🎬 Recording started - Browser actions will be captured automatically');

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
        console.log('📍 Navigation recorded:', frame.url());
      }
    });

    // Define recorder script
    const recorderScript = () => {
      console.log('🎯 Recorder script injected - Ready to capture events');
      (window as any).__recorder_events = [];
      (window as any).__recorder_active = true;
      
      // Capture clicks
      document.addEventListener('click', (e) => {
        if (!(window as any).__recorder_active) return;
        
        const target = e.target as HTMLElement;
        const rect = target.getBoundingClientRect();
        
        console.log('🖱️ Click captured:', {
          tagName: target.tagName,
          id: target.id,
          class: target.className,
          x: e.clientX,
          y: e.clientY,
        });
        
        (window as any).__recorder_events.push({
          type: 'click',
          timestamp: Date.now(),
          x: e.clientX,
          y: e.clientY,
          tagName: target.tagName,
          targetInfo: {
            id: target.id,
            className: target.className,
            textContent: target.textContent?.trim().slice(0, 50),
          }
        });
      }, true);

      // Capture inputs
      let inputTimeout: any = null;
      document.addEventListener('input', (e) => {
        if (!(window as any).__recorder_active) return;
        
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          // Debounce input events
          clearTimeout(inputTimeout);
          inputTimeout = setTimeout(() => {
            const rect = target.getBoundingClientRect();
            console.log('⌨️ Input captured:', {
              tagName: target.tagName,
              id: target.id,
              value: (target as HTMLInputElement).value,
            });
            
            (window as any).__recorder_events.push({
              type: 'input',
              timestamp: Date.now(),
              value: (target as HTMLInputElement).value,
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              targetInfo: {
                id: target.id,
                className: target.className,
                tagName: target.tagName,
              }
            });
          }, 500); // Wait 500ms after user stops typing
        }
      }, true);
    };

    // Inject into current page immediately
    await page.evaluate(recorderScript);
    console.log('✅ Recorder script injected into current page');

    // Also inject for future pages
    await page.addInitScript(recorderScript);

    console.log('✅ Auto-recording enabled - All clicks and inputs will be tracked');

    // Poll for recorded events from the browser
    this.startEventPolling();
  }

  private async startEventPolling(): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    console.log('🔄 Starting event polling (every 1 second)...');

    this.pollingInterval = setInterval(async () => {
      if (!this.session.recording) return;

      try {
        // Get events from browser
        const events = await this.session.page.evaluate(() => {
          const events = (window as any).__recorder_events || [];
          (window as any).__recorder_events = []; // Clear processed events
          return events;
        });

        if (events.length > 0) {
          console.log(`📥 Polled ${events.length} events from browser`);
        }

        // Process each event
        for (const event of events) {
          await this.processRecordedEvent(event);
        }
      } catch (error) {
        console.error('❌ Error polling events:', error);
      }
    }, 1000); // Poll every 1 second
  }

  private async processRecordedEvent(event: any): Promise<void> {
    console.log('📝 Processing event:', event.type, event.targetInfo);

    if (event.type === 'click') {
      // Get selector info for the clicked element
      const selectorInfo = await this.handleClickAt(event.x, event.y);
      
      if (selectorInfo && selectorInfo.candidates.length > 0) {
        const step: TestStep = {
          id: uuidv4(),
          type: 'click',
          timestamp: event.timestamp,
          target: selectorInfo,
        };
        this.session.steps.push(step);
        console.log(`✅ Click step recorded, emitting to WebSocket...`);
        this.session.eventEmitter.emit('step-recorded', step);
        console.log(`📤 step-recorded event emitted for step ${step.id}`);
      } else {
        console.log('⚠️ Click ignored - no valid selector found');
      }
    } else if (event.type === 'input') {
      // Get selector info for the input element
      const selectorInfo = await this.handleClickAt(event.x, event.y);
      
      if (selectorInfo && selectorInfo.candidates.length > 0) {
        const step: TestStep = {
          id: uuidv4(),
          type: 'type',
          timestamp: event.timestamp,
          target: selectorInfo,
          value: event.value,
        };
        this.session.steps.push(step);
        console.log(`✅ Input step recorded: "${event.value}", emitting to WebSocket...`);
        this.session.eventEmitter.emit('step-recorded', step);
        console.log(`📤 step-recorded event emitted for step ${step.id}`);
      } else {
        console.log('⚠️ Input ignored - no valid selector found');
      }
    }
  }

  stopRecording(): void {
    this.session.recording = false;
    
    // Stop polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Disable recorder in browser
    this.session.page.evaluate(() => {
      (window as any).__recorder_active = false;
    }).catch(() => {
      // Page might be closed
    });

    console.log('⏹️ Recording stopped');
  }

  async handleClickAt(x: number, y: number): Promise<SelectorInfo | null> {
    const { page, cdpSession } = this.session;

    try {
      console.log(`Getting element at location: (x: ${x}, y: ${y})`);
      
      // Use CDP to get node at location
      const { backendNodeId } = await cdpSession.send('DOM.getNodeForLocation', {
        x: Math.round(x),
        y: Math.round(y),
      });

      if (!backendNodeId) {
        console.log('No backendNodeId found');
        return null;
      }

      console.log(`Found backendNodeId: ${backendNodeId}`);

      // Get element info directly using CDP and page evaluation at the exact location
      const elementInfo = await page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y);
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
      }, { x, y });

      if (!elementInfo) {
        console.log('No element info found');
        return null;
      }

      console.log(`Element found: ${elementInfo.tagName}`, elementInfo.attributes);

      // Generate selector candidates
      const candidates = await this.generateSelectors(page, elementInfo, cdpSession, backendNodeId);

      console.log(`Generated ${candidates.length} selector candidates`);

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

