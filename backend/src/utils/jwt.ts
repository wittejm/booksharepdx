import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as JwtPayload;
}

// Cookie options
// For cross-origin setups (frontend/backend on different domains),
// we need SameSite=None + Secure=true for cookies to work
const isDeployed = env.isProd || env.isStaging;

export const accessTokenCookieOptions = {
  httpOnly: true,
  secure: isDeployed,
  sameSite: isDeployed ? ('none' as const) : ('lax' as const),
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: '/',
};

export const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: isDeployed,
  sameSite: isDeployed ? ('none' as const) : ('lax' as const),
  maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
  path: '/',
};

// Magic link tokens (short-lived, single-use tokens for email verification)
export interface MagicLinkPayload {
  userId: string;
  email: string;
  type: 'magic-link';
}

export function signMagicLinkToken(payload: Omit<MagicLinkPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'magic-link' }, env.jwtSecret, {
    expiresIn: '30m', // 30 minutes
  });
}

export function verifyMagicLinkToken(token: string): MagicLinkPayload {
  const payload = jwt.verify(token, env.jwtSecret) as MagicLinkPayload;
  if (payload.type !== 'magic-link') {
    throw new Error('Invalid token type');
  }
  return payload;
}
