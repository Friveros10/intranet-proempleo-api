import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 4000),

  jwt: {
    secret: required('JWT_SECRET', 'dev_secret_change_me'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me'),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },

  cookies: {
    accessTokenName: process.env.COOKIE_NAME ?? 'access_token',
    refreshTokenName: process.env.REFRESH_COOKIE_NAME ?? 'refresh_token',
  },

  cors: {
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((o) => o.trim()),
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 100),
    loginWindowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
    loginMax: Number(process.env.LOGIN_RATE_LIMIT_MAX ?? 5),
  },

  sqlServer: {
    host: required('DB_HOST'),
    port: Number(process.env.DB_PORT ?? 1433),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_NAME'),
    encrypt: (process.env.DB_ENCRYPT ?? 'false') === 'true',
    trustServerCertificate: (process.env.DB_TRUST_SERVER_CERT ?? 'true') === 'true',
  },
};
