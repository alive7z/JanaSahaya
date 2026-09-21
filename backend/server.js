import http from 'node:http';
import fs from 'node:fs';
import app from './src/app.js';
import env, { validateConfig } from './src/config/env.js';
import logger from './src/utils/logger.js';
import { initSocket, liveConnections } from './src/sockets/emitter.js';
import { query } from './src/config/database.js';

// Fail fast with a clear message before any network work happens.
validateConfig();

logger.info('Starting JanaSahaya API (env: %s, version: %s)', env.nodeEnv, env.version);

// Render's filesystem can be empty on boot; never assume uploads/ exists.
fs.mkdirSync(env.uploadDir, { recursive: true });

const server = http.createServer(app);
initSocket(server);
logger.info('Socket.IO initialized');

async function start() {
  try {
    logger.info('Connecting to MySQL at %s:%s (database: %s)', env.db.host, env.db.port, env.db.database);
    await query('SELECT 1');
    logger.info('Database connection established');
    server.listen(env.port, '0.0.0.0', () => {
      logger.info('Server listening on port %d (0.0.0.0)', env.port);
    });
  } catch (err) {
    logger.fatal(
      { err },
      'Database connection failed: unable to connect to configured MySQL host %s:%s',
      env.db.host,
      env.db.port,
    );
    process.exit(1);
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
