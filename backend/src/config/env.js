import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

const DEVELOPMENT_DEFAULTS = {
  jwt: ['dev_access_secret', 'dev_refresh_secret'],
};

const env = {
  nodeEnv,
  isDev: !isProd,
  isProd,
  service: process.env.SERVICE_NAME || 'civic-issues-api',
  version: process.env.SERVICE_VERSION || '1.0.0',
  port: parseInt(process.env.PORT || '4000', 10),
  trustProxy: String(process.env.TRUST_PROXY || '1') === '1',

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'civic_issues',
    connectionLimit: parseInt(process.env.DB_POOL_SIZE || '10', 10),
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  rateLimit: {
    windowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MIN || '15', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
    authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '20', 10),
    registerMax: parseInt(process.env.RATE_LIMIT_REGISTER_MAX || '5', 10),
    passwordMax: parseInt(process.env.RATE_LIMIT_PASSWORD_MAX || '10', 10),
    reportMax: parseInt(process.env.RATE_LIMIT_REPORT_MAX || '30', 10),
    commentMax: parseInt(process.env.RATE_LIMIT_COMMENT_MAX || '60', 10),
    interactionMax: parseInt(process.env.RATE_LIMIT_INTERACTION_MAX || '120', 10),
  },

  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  cookieName: process.env.COOKIE_NAME || 'civic_refresh',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB || '8', 10),

  log: {
    level: process.env.LOG_LEVEL || 'info',
    pretty: String(process.env.LOG_PRETTY || (isProd ? 'false' : 'true')) === 'true',
  },
};

export function validateConfig() {
  if (isProd) {
    const issues = [];
    if (DEVELOPMENT_DEFAULTS.jwt.includes(env.jwt.accessSecret)) {
      issues.push('JWT_ACCESS_SECRET must be set to a strong secret in production');
    }
    if (DEVELOPMENT_DEFAULTS.jwt.includes(env.jwt.refreshSecret)) {
      issues.push('JWT_REFRESH_SECRET must be set to a strong secret in production');
    }
    if (issues.length) {
      throw new Error(`Refusing to start in production:\n - ${issues.join('\n - ')}`);
    }
  }
  return env;
}

export default env;