import { FastifyInstance } from 'fastify';
import { Recorder } from '../browser/Recorder';

export function setupWebSocketRoutes(fastify: FastifyInstance) {
  fastify.get('/ws', { websocket: true }, (socket, request) => {
    let currentSessionId: string | null = null;
    let recorder: Recorder | null = null;

    // Send helper
    const send = (type: string, data: any) => {
      socket.send(JSON.stringify({ type, data, timestamp: Date.now() }));
    };

    socket.on('message', async (rawMessage: Buffer) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        const { type, data } = message;

        switch (type) {
          case 'session:start':
            {
              try {
                fastify.log.info(`Creating session for: ${data.baseUrl}`);
                const sessionId = await fastify.sessionManager.createSession(data.baseUrl);
                currentSessionId = sessionId;
                const session = fastify.sessionManager.getSession(sessionId)!;
                recorder = new Recorder(session);

                // Listen to step recordings
                session.eventEmitter.on('step-recorded', (step) => {
                  fastify.log.info(`📤 Sending step to frontend: ${step.type} (${step.id})`);
                  send('step:recorded', step);
                });

                fastify.log.info('Taking initial screenshot...');
                // Send initial screenshot
                const screenshotBuffer = await session.page.screenshot({ 
                  type: 'png'
                });
                const screenshot = screenshotBuffer.toString('base64');
                
                fastify.log.info(`Screenshot captured, size: ${screenshot.length} chars`);
                
                send('session:started', {
                  sessionId,
                  url: session.page.url(),
                  screenshot,
                });
              } catch (error) {
                const errorMessage = (error as Error).message;
                const errorStack = (error as Error).stack;
                fastify.log.error(`Failed to start session: ${errorMessage}`, { stack: errorStack });
                
                // Send user-friendly error
                let userMessage = errorMessage;
                if (errorMessage.includes('net::ERR') || errorMessage.includes('timeout')) {
                  userMessage = `페이지를 로드할 수 없습니다: ${data.baseUrl}`;
                } else if (errorMessage.includes('Navigation')) {
                  userMessage = `URL로 이동할 수 없습니다. URL을 확인해주세요.`;
                }
                
                send('error', { 
                  message: userMessage,
                  details: errorMessage
                });
              }
            }
            break;

          case 'session:close':
            if (currentSessionId) {
              await fastify.sessionManager.closeSession(currentSessionId);
              currentSessionId = null;
              recorder = null;
              send('session:closed', {});
            }
            break;

          case 'recorder:start':
            if (recorder) {
              await recorder.startRecording();
              send('recorder:started', {});
            }
            break;

          case 'recorder:stop':
            if (recorder) {
              recorder.stopRecording();
              send('recorder:stopped', {});
            }
            break;

          case 'page:navigate':
            {
              const session = fastify.sessionManager.getSession(currentSessionId!);
              if (session) {
                await session.page.goto(data.url);
                const screenshotBuffer = await session.page.screenshot({ type: 'png' });
                const screenshot = screenshotBuffer.toString('base64');
                send('page:navigated', { url: session.page.url(), screenshot });
              }
            }
            break;

          case 'page:screenshot':
            {
              const session = fastify.sessionManager.getSession(currentSessionId!);
              if (session) {
                try {
                  if (session.page.isClosed()) {
                    fastify.log.warn('Cannot take screenshot: page is closed');
                    break;
                  }
                  const screenshotBuffer = await session.page.screenshot({ type: 'png' });
                  const screenshot = screenshotBuffer.toString('base64');
                  send('page:screenshot', { screenshot });
                } catch (error) {
                  fastify.log.error('Failed to take screenshot:', error);
                  // Don't send error to frontend for screenshot failures
                }
              }
            }
            break;

          case 'element:inspect':
            {
              if (recorder) {
                const { x, y } = data;
                const selectorInfo = await recorder.handleClickAt(x, y);
                send('element:inspected', selectorInfo);
              }
            }
            break;

          case 'step:add':
            {
              if (recorder) {
                const step = await recorder.addStep(data.step);
                send('step:added', step);
              }
            }
            break;

          case 'script:run':
            {
              const session = fastify.sessionManager.getSession(currentSessionId!);
              if (!session) {
                send('error', { 
                  message: '세션이 종료되었습니다. 새로운 세션을 시작해주세요.',
                });
                break;
              }

              // Check if browser/page is still open
              try {
                const isClosed = session.page.isClosed();
                if (isClosed) {
                  fastify.log.error('Browser page is closed');
                  send('error', { 
                    message: '브라우저가 닫혔습니다. 새로운 세션을 시작해주세요.',
                  });
                  break;
                }
              } catch (error) {
                fastify.log.error('Failed to check page status:', error);
                send('error', { 
                  message: '브라우저 상태를 확인할 수 없습니다. 새로운 세션을 시작해주세요.',
                });
                break;
              }

              // Import runner dynamically
              const { Runner } = await import('../runner/Runner');
              const runner = new Runner(session);
              
              // Listen to step execution events
              session.eventEmitter.on('step-executed', (result) => {
                send('step:executed', result);
              });
              
              send('script:started', {});
              
              try {
                fastify.log.info(`Starting script execution with ${data.steps.length} steps`);
                await runner.run(data.steps);
                fastify.log.info('✅ Script execution completed successfully');
                send('script:completed', { success: true });
              } catch (error: any) {
                fastify.log.error('❌ Script execution failed:', error.message);
                send('script:error', { 
                  message: error.message,
                  step: error.step,
                });
              } finally {
                // Clean up event listener
                session.eventEmitter.removeAllListeners('step-executed');
              }
            }
            break;

          default:
            fastify.log.warn(`Unknown message type: ${type}`);
        }
      } catch (error) {
        fastify.log.error(error);
        send('error', { message: (error as Error).message });
      }
    });

    socket.on('close', () => {
      if (currentSessionId) {
        fastify.sessionManager.closeSession(currentSessionId);
      }
    });

    // Send initial greeting
    send('connected', { serverTime: Date.now() });
  });
}

