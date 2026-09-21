import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import { pinoHttp } from 'pino-http';
import env from './config/env.js';
import logger from './utils/logger.js';
import { query } from './config/database.js';
import { apiLimiter } from './middleware/rateLimiter.middleware.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import issueRoutes from './routes/issue.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import adminRoutes from './routes/admin.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import metaRoutes from './routes/meta.routes.js';
import docsRoutes, { swaggerSpec } from './routes/docs.routes.js';
import swaggerUi from 'swagger-ui-express';

const app = express();

app.set('trust proxy', 1);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Unique request ID, echoed back in the x-request-id header and used in logs.
app.use((req, res, next) => {
  req.requestId =
    req.headers['x-request-id'] || crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  res.setHeader('x-request-id', req.requestId);
  next();
});

// Structured request logging (timestamp, level, requestId, method, url, status, latency, IP).
app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const id = req.requestId;
      res.setHeader('x-request-id', id);
      return id;
    },
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    autoLogging: env.isProd || true,
    redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url,
          remoteAddress: req.remoteAddress,
          remotePort: req.remotePort,
          userId: req.user?.id ?? null,
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use('/uploads', express.static(env.uploadDir));
app.use('/api/v1', apiLimiter());

app.get('/health', (_req, res) =>
  res.json({ success: true, status: 'ok', uptime: process.uptime() }),
);

app.get('/ready', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    logger.error({ err }, 'readiness check failed');
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/issues', issueRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/meta', metaRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Civic Issues API Docs',
  swaggerOptions: { persistAuthorization: true },
}));

app.use(notFound);
app.use(errorHandler);

export default app;