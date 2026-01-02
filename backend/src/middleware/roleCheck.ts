import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';
import { UserRole } from '../entities/User.js';

/**
 * Middleware to require specific roles
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403, 'FORBIDDEN'));
    }

    next();
  };
}

/**
 * Require moderator or admin role
 */
export const requireModerator = requireRole('moderator', 'admin');

/**
 * Require admin role
 */
export const requireAdmin = requireRole('admin');
