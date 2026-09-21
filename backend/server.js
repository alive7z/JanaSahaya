import http from 'node:http';
import app from './src/app.js';
import env from './src/config/env.js';
import logger from './src/utils/logger.js';
import { initSocket, liveConnections } from './src/sockets/emitter.js';
import { query } from './src/config/database.js';

const server = http.createServer(app);
initSocket(server);

async function start() {
  try {
    await query('SELECT 1');
    logger.info('MySQL connection verified');
    server.listen(env.port, () => {
      logger.info({ port: env.port, environment: env.nodeEnv }, 'JanaSahaya API started');
    });
  } catch (err) {
    logger.fatal({ err }, 'Cannot reach MySQL; refusing to start');
    process.exitCode = 1;
  }
}

await start();

process.on('SIGTERM', () => {
  logger.info('Shutting down... live sockets: %d', liveConnections());
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection: %s', reason?.stack || reason);
});

export default server;
