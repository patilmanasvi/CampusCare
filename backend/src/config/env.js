/**
 * Environment configuration loader and validator
 */
require('dotenv').config();

const envName = process.env.NODE_ENV || 'development';
const isProduction = envName === 'production';
const jwtSecret = process.env.JWT_SECRET || (isProduction ? '' : 'campuscare_jwt_default_secret_key');
const cookieSecret = process.env.COOKIE_SECRET || process.env.JWT_SECRET || (isProduction ? '' : 'campuscare_cookie_secret_key');

if (isProduction && (jwtSecret.length < 32 || cookieSecret.length < 32)) {
  throw new Error('JWT_SECRET and COOKIE_SECRET must each be configured with at least 32 characters in production.');
}

const config = {
  env: envName,
  port: parseInt(process.env.PORT, 10) || 5000,
  frontendUrl: process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'campuscare_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_MAX_CONNECTIONS, 10) || 20,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS, 10) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS, 10) || 5000,
  },
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  auth: {
    cookieName: process.env.COOKIE_NAME || 'campuscare_token',
    cookieSecret,
    cookieSecure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
    cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
    rateLimitWindowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 mins
    rateLimitMax: parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 10, // 10 attempts per window
  },
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads/',
    maxSizeBytes: parseInt(process.env.MAX_FILE_SIZE_BYTES, 10) || 10485760, // 10MB
  },
};

module.exports = config;
