import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { BrowserSessionManager } from './browser/SessionManager';
import { setupWebSocketRoutes } from './routes/websocket';
import { setupHttpRoutes } from './routes/http';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

async function start() {
  const fastify = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
      },
    },
  });

  // CORS
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:3002',
    credentials: true,
  });

  // WebSocket
  await fastify.register(websocket);

  // Browser session manager (singleton)
  const sessionManager = new BrowserSessionManager();
  fastify.decorate('sessionManager', sessionManager);

  // Routes
  setupHttpRoutes(fastify);
  setupWebSocketRoutes(fastify);

  // Graceful shutdown
  const shutdown = async () => {
    fastify.log.info('Shutting down...');
    await sessionManager.cleanup();
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`Backend listening on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();

