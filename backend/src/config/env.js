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
  cookie: {
    name: process.env.COOKIE_NAME || 'civic_refresh',
    secure: String(process.env.COOKIE_SECURE ?? (isProd ? 'true' : 'false')) === 'true',
    sameSite: (process.env.COOKIE_SAME_SITE || 'lax').toLowerCase(),
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAgeDays: parseInt(process.env.COOKIE_MAX_AGE_DAYS || '7', 10),
  },
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB || '8', 10),

  log: {
    level: process.env.LOG_LEVEL || 'info',
    pretty: String(process.env.LOG_PRETTY || (isProd ? 'false' : 'true')) === 'true',
  },
  seed: {
    adminEmail: process.env.ADMIN_EMAIL || 'admin@civic.gov',
    adminPassword: process.env.ADMIN_PASSWORD || 'Admin@123456',
    officerEmail: process.env.OFFICER_EMAIL || 'officer@civic.gov',
    officerPassword: process.env.OFFICER_PASSWORD || 'Officer@123456',
    demoEnabled: String(process.env.ENABLE_DEMO_ACCOUNTS ?? 'true') === 'true',
    demoCitizenEmail: process.env.DEMO_CITIZEN_EMAIL || 'citizen@janasahaya.demo',
    demoAdminEmail: process.env.DEMO_ADMIN_EMAIL || 'admin@janasahaya.demo',
    demoPassword: process.env.DEMO_PASSWORD || 'Demo@123',
  },
};

export function validateConfig() {
  if (isProd) {
    const issues = [];
    const isPlaceholder = (value = '') => /change[_-]?me|openssl|\$\(|example_password/i.test(value);
    const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'CLIENT_ORIGIN'];
    required.forEach((name) => {
      if (!process.env[name]?.trim()) issues.push(`${name} is required in production`);
    });
    if (DEVELOPMENT_DEFAULTS.jwt.includes(env.jwt.accessSecret) || env.jwt.accessSecret.length < 32) {
      issues.push('JWT_ACCESS_SECRET must be a unique secret of at least 32 characters');
    }
    if (DEVELOPMENT_DEFAULTS.jwt.includes(env.jwt.refreshSecret) || env.jwt.refreshSecret.length < 32) {
      issues.push('JWT_REFRESH_SECRET must be a unique secret of at least 32 characters');
    }
    if (env.jwt.accessSecret === env.jwt.refreshSecret) {
      issues.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
    }
    if (isPlaceholder(env.jwt.accessSecret) || isPlaceholder(env.jwt.refreshSecret)) {
      issues.push('JWT secrets must be generated values, not placeholder commands or text');
    }
    if (isPlaceholder(env.db.password)) issues.push('DB_PASSWORD must not be a placeholder');
    if (!/^[A-Za-z0-9_]+$/.test(env.db.database)) {
      issues.push('DB_NAME may contain only letters, numbers, and underscores');
    }
    try {
      const origin = new URL(env.clientOrigin);
      if (origin.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(origin.hostname)) {
        issues.push('CLIENT_ORIGIN must use HTTPS in production');
      }
    } catch {
      issues.push('CLIENT_ORIGIN must be a valid absolute origin');
    }
    if (!['lax', 'strict', 'none'].includes(env.cookie.sameSite)) {
      issues.push('COOKIE_SAME_SITE must be lax, strict, or none');
    }
    if (env.cookie.sameSite === 'none' && !env.cookie.secure) {
      issues.push('COOKIE_SECURE must be true when COOKIE_SAME_SITE=none');
    }
    if (!Number.isInteger(env.cookie.maxAgeDays) || env.cookie.maxAgeDays < 1) {
      issues.push('COOKIE_MAX_AGE_DAYS must be a positive integer');
    }
    if (!process.env.ADMIN_EMAIL?.trim() || !process.env.ADMIN_PASSWORD?.trim()) {
      issues.push('ADMIN_EMAIL and ADMIN_PASSWORD are required to provision the owner admin');
    } else if (env.seed.adminPassword.length < 12 || isPlaceholder(env.seed.adminPassword)) {
      issues.push('ADMIN_PASSWORD must be at least 12 characters');
    }
    if (!process.env.OFFICER_PASSWORD?.trim() || env.seed.officerPassword.length < 12 || isPlaceholder(env.seed.officerPassword)) {
      issues.push('OFFICER_PASSWORD must be a non-placeholder value of at least 12 characters');
    }
    if (env.seed.demoEnabled) {
      if (!process.env.DEMO_CITIZEN_EMAIL?.trim() || !process.env.DEMO_ADMIN_EMAIL?.trim() || !process.env.DEMO_PASSWORD?.trim()) {
        issues.push('DEMO_CITIZEN_EMAIL, DEMO_ADMIN_EMAIL, and DEMO_PASSWORD are required when demo accounts are enabled');
      }
      if (env.seed.demoPassword.length < 8 || isPlaceholder(env.seed.demoPassword)) {
        issues.push('DEMO_PASSWORD must be a non-placeholder value of at least 8 characters');
      }
    }
    if (issues.length) {
      throw new Error(`Refusing to start in production:\n - ${issues.join('\n - ')}`);
    }
  }
  return env;
}

export default env;
