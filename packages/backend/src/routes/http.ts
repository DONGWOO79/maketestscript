import { FastifyInstance } from 'fastify';
import { BrowserSessionManager } from '../browser/SessionManager';

declare module 'fastify' {
  interface FastifyInstance {
    sessionManager: BrowserSessionManager;
  }
}

export function setupHttpRoutes(fastify: FastifyInstance) {
  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
  });

  // Create new browser session
  fastify.post<{ Body: { baseUrl?: string } }>('/api/sessions', async (request, reply) => {
    const { baseUrl } = request.body;
    const sessionId = await fastify.sessionManager.createSession(baseUrl);
    return { sessionId };
  });

  // Close session
  fastify.delete<{ Params: { sessionId: string } }>(
    '/api/sessions/:sessionId',
    async (request, reply) => {
      await fastify.sessionManager.closeSession(request.params.sessionId);
      return { success: true };
    }
  );

  // Get session info
  fastify.get<{ Params: { sessionId: string } }>(
    '/api/sessions/:sessionId',
    async (request, reply) => {
      const session = fastify.sessionManager.getSession(request.params.sessionId);
      if (!session) {
        reply.code(404);
        return { error: 'Session not found' };
      }
      return {
        id: session.id,
        recording: session.recording,
        steps: session.steps,
        url: session.page.url(),
      };
    }
  );

  // Get steps for a session
  fastify.get<{ Params: { sessionId: string } }>(
    '/api/sessions/:sessionId/steps',
    async (request, reply) => {
      const session = fastify.sessionManager.getSession(request.params.sessionId);
      if (!session) {
        reply.code(404);
        return { error: 'Session not found' };
      }
      return { steps: session.steps };
    }
  );
}

