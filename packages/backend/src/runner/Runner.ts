import { BrowserSession, TestStep } from '../browser/SessionManager';

export class Runner {
  private session: BrowserSession;

  constructor(session: BrowserSession) {
    this.session = session;
  }

  async run(steps: TestStep[]): Promise<void> {
    const { page } = this.session;

    for (const step of steps) {
      try {
        switch (step.type) {
          case 'navigate':
            if (step.url) {
              await page.goto(step.url, { waitUntil: 'domcontentloaded' });
            }
            break;

          case 'click':
            if (step.target) {
              const selector = this.getBestSelector(step.target);
              await page.locator(selector).click({ timeout: 5000 });
            }
            break;

          case 'type':
            if (step.target && step.value) {
              const selector = this.getBestSelector(step.target);
              await page.locator(selector).fill(step.value, { timeout: 5000 });
            }
            break;

          case 'waitFor':
            // Simple wait for now
            await page.waitForTimeout(1000);
            break;

          case 'assert':
            if (step.target) {
              const selector = this.getBestSelector(step.target);
              await page.locator(selector).waitFor({ state: 'visible', timeout: 5000 });
            }
            break;

          default:
            console.warn(`Unknown step type: ${step.type}`);
        }

        // Emit progress
        this.session.eventEmitter.emit('step-executed', { step, success: true });
      } catch (error) {
        // Emit error
        this.session.eventEmitter.emit('step-executed', { 
          step, 
          success: false, 
          error: (error as Error).message 
        });
        throw Object.assign(error as Error, { step });
      }
    }
  }

  private getBestSelector(target: any): string {
    // Use the highest-scoring, unique selector
    const candidates = target.candidates || [];
    const best = candidates.find((c: any) => c.uniqueness === 1) || candidates[0];
    return best?.selector || 'body';
  }
}

