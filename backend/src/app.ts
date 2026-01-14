import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow images from uploads
  }));

  // CORS - allow frontend origins with credentials
  const corsOrigin = env.isDev
    ? /^http:\/\/localhost(:\d+)?$/
    : /^https:\/\/(staging\.|www\.)?booksharepdx\.com$/;
  app.use(cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Cookie parsing
  app.use(cookieParser());

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      // Skip health checks and static files from logs
      if (req.path !== '/health' && !req.path.startsWith('/uploads')) {
        logger.request(req.method, req.path, res.statusCode, duration);
      }
    });
    next();
  });

  // Serve uploaded files statically
  const uploadsPath = path.resolve(__dirname, '..', env.uploadDir);
  app.use('/uploads', express.static(uploadsPath));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api', routes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: {
        message: `The requested endpoint "${req.method} ${req.path}" does not exist. This is an engineering error.`,
        code: 'ENDPOINT_NOT_FOUND',
      },
    });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}
