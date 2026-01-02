import { config } from 'dotenv';

config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: 3001, // Always use port 3001

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://dev:dev@localhost:5432/booksharepdx',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Book APIs
  googleBooksApiKey: process.env.GOOGLE_BOOKS_API_KEY || '',

  // Storage
  storageProvider: process.env.STORAGE_PROVIDER || 'local',
  uploadDir: process.env.UPLOAD_DIR || './uploads',

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
};
