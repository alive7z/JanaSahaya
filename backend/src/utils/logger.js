import pino from 'pino';
import env, { validateConfig } from '../config/env.js';

validateConfig();

const logger = pino({
  level: env.log.level,
  base: { service: env.service, version: env.version },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.accessToken',
      '*.refreshToken',
    ],
    censor: '[redacted]',
  },
  ...(env.log.pretty
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l', ignore: 'pid,hostname' },
        },
      }
    : {}),
});

export default logger;