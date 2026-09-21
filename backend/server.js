import http from 'node:http';
import app from './src/app.js';
import env from './src/config/env.js';
import logger from './src/utils/logger.js';
import { initSocket, liveConnections } from './src/sockets/emitter.js';
import { query } from './src/config/database.js';

const server = http.createServer(app);
initSocket(server);

server.listen(env.port, () => {
  logger.info(
    `Civic Issues API running on http://localhost:${env.port} (${env.nodeEnv})`,
  );
});

async function verifyDb() {
  try {
    await query('SELECT 1');
    logger.info('MySQL connection verified');
  } catch (err) {
    logger.error('Cannot reach MySQL: %s', err.message);
    logger.info('Run `npm run db:setup` after configuring backend/.env');
  }
}

verifyDb();

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