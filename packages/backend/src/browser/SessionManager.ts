import { chromium, Browser, BrowserContext, Page, CDPSession } from 'playwright';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

export interface BrowserSession {
  id: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  cdpSession: CDPSession;
  eventEmitter: EventEmitter;
  recording: boolean;
  steps: TestStep[];
}

export interface TestStep {
  id: string;
  type: 'navigate' | 'click' | 'type' | 'waitFor' | 'assert';
  timestamp: number;
  target?: SelectorInfo;
  value?: string;
  url?: string;
}

export interface SelectorInfo {
  candidates: SelectorCandidate[];
  element: {
    tagName: string;
    outerHTML: string;
    attributes: Record<string, string>;
    boundingBox: { x: number; y: number; width: number; height: number } | null;
    textContent: string;
  };
}

export interface SelectorCandidate {
  selector: string;
  type: 'testid' | 'role' | 'text' | 'css' | 'xpath';
  score: number;
  uniqueness: number; // 1 = unique, >1 = multiple matches
}

export class BrowserSessionManager {
  private sessions: Map<string, BrowserSession> = new Map();

  async createSession(baseUrl?: string): Promise<string> {
    const sessionId = uuidv4();
    
    // Launch in HEADFUL mode - real browser window for interactive testing
    const browser = await chromium.launch({
      headless: false,  // ✨ Real browser window!
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--start-maximized',  // Start maximized for better visibility
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: undefined, // Can enable for video recording
    });

    const page = await context.newPage();
    
    // Enable CDP
    const client = await context.newCDPSession(page);
    await client.send('DOM.enable');
    await client.send('Overlay.enable');
    await client.send('Network.enable');
    await client.send('Log.enable');

    const eventEmitter = new EventEmitter();

    const session: BrowserSession = {
      id: sessionId,
      browser,
      context,
      page,
      cdpSession: client,
      eventEmitter,
      recording: false,
      steps: [],
    };

    this.sessions.set(sessionId, session);

    // Navigate to base URL if provided
    if (baseUrl) {
      // Auto-add protocol if missing
      let url = baseUrl.trim();
      if (!url.match(/^https?:\/\//i)) {
        url = `https://${url}`;
      }
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }

    return sessionId;
  }

  getSession(sessionId: string): BrowserSession | undefined {
    return this.sessions.get(sessionId);
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      await session.browser.close();
      this.sessions.delete(sessionId);
    }
  }

  async cleanup(): Promise<void> {
    const closePromises = Array.from(this.sessions.keys()).map((id) =>
      this.closeSession(id)
    );
    await Promise.all(closePromises);
  }
}

