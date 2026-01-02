import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
      },
    });
  }

  // Validation errors from Zod
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: {
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: env.isDev ? err : undefined,
      },
    });
  }

  // TypeORM errors
  if (err.name === 'QueryFailedError') {
    const message = env.isDev ? err.message : 'Database error';
    return res.status(500).json({
      error: {
        message,
        code: 'DATABASE_ERROR',
      },
    });
  }

  // Default error
  return res.status(500).json({
    error: {
      message: env.isDev ? err.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
}
