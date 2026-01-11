import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, verifyRefreshToken, signAccessToken, accessTokenCookieOptions, JwtPayload } from '../utils/jwt.js';
import { AppError } from './errorHandler.js';
import { AppDataSource } from '../config/database.js';
import { User } from '../entities/User.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      jwtPayload?: JwtPayload;
    }
  }
}

/**
 * Middleware to require authentication
 * Checks access token from cookie, refreshes if expired
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const accessToken = req.cookies?.accessToken;
    const refreshToken = req.cookies?.refreshToken;

    if (!accessToken && !refreshToken) {
      throw new AppError(
        'You must be logged in to access this feature. Please log in and try again.',
        401,
        'UNAUTHORIZED'
      );
    }

    let payload: JwtPayload | null = null;

    // Try access token first
    if (accessToken) {
      try {
        payload = verifyAccessToken(accessToken);
      } catch {
        // Access token expired or invalid, try refresh token
      }
    }

    // If access token failed, try refresh token
    if (!payload && refreshToken) {
      try {
        payload = verifyRefreshToken(refreshToken);
        // Issue new access token
        const newAccessToken = signAccessToken(payload);
        res.cookie('accessToken', newAccessToken, accessTokenCookieOptions);
      } catch {
        throw new AppError(
          'Your session has expired. Please log in again to continue.',
          401,
          'SESSION_EXPIRED'
        );
      }
    }

    if (!payload) {
      throw new AppError(
        'You must be logged in to access this feature. Please log in and try again.',
        401,
        'UNAUTHORIZED'
      );
    }

    // Get user from database
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: payload.userId } });

    if (!user) {
      throw new AppError(
        'Your account could not be found. It may have been deleted. Please contact support if you need assistance.',
        401,
        'USER_NOT_FOUND'
      );
    }

    if (user.banned) {
      throw new AppError(
        'Your account has been banned due to a violation of our community guidelines. Please contact support if you believe this is an error.',
        403,
        'ACCOUNT_BANNED'
      );
    }

    req.user = user;
    req.jwtPayload = payload;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional auth - populates req.user if token exists, but doesn't require it
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const accessToken = req.cookies?.accessToken;
    const refreshToken = req.cookies?.refreshToken;

    if (!accessToken && !refreshToken) {
      return next();
    }

    let payload: JwtPayload | null = null;

    if (accessToken) {
      try {
        payload = verifyAccessToken(accessToken);
      } catch {
        // Token invalid
      }
    }

    if (!payload && refreshToken) {
      try {
        payload = verifyRefreshToken(refreshToken);
        const newAccessToken = signAccessToken(payload);
        res.cookie('accessToken', newAccessToken, accessTokenCookieOptions);
      } catch {
        // Refresh token also invalid
      }
    }

    if (payload) {
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { id: payload.userId } });
      if (user && !user.banned) {
        req.user = user;
        req.jwtPayload = payload;
      }
    }

    next();
  } catch {
    next();
  }
}
