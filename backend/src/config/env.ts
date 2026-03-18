import { config } from "dotenv";

config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3001", 10),

  // Database
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://dev:dev@localhost:5432/booksharepdx",

  // JWT
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-in-production",
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "365d",

  // Book APIs
  googleBooksApiKey: process.env.GOOGLE_BOOKS_API_KEY || "",

  // Email (Resend)
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom:
    process.env.EMAIL_FROM || "BookSharePDX <hello@booksharepdx.com>",

  // Storage
  storageProvider: process.env.STORAGE_PROVIDER || "local",
  uploadDir: process.env.UPLOAD_DIR || "./uploads",

  // Cloudflare R2 (S3-compatible)
  r2AccountId: process.env.R2_ACCOUNT_ID || "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  r2BucketName: process.env.R2_BUCKET_NAME || "",
  r2PublicUrl: process.env.R2_PUBLIC_URL || "",

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

  // Cookie domain for cross-subdomain auth (e.g., .booksharepdx.com)
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,

  isDev: process.env.NODE_ENV === "development",
  isStaging: process.env.NODE_ENV === "staging",
  isProd: process.env.NODE_ENV === "production",
};
