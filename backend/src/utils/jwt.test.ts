import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

// Mock the env module
vi.mock('../config/env.js', () => ({
  env: {
    jwtSecret: 'test-jwt-secret',
    jwtRefreshSecret: 'test-refresh-secret',
    jwtExpiresIn: '15m',
    jwtRefreshExpiresIn: '7d',
    isProd: false,
    isStaging: false,
  },
}));

import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
  type JwtPayload,
} from './jwt.js';

describe('JWT utilities', () => {
  const testPayload: JwtPayload = {
    userId: 'test-user-123',
    email: 'test@example.com',
    role: 'user',
    username: 'testuser',
  };

  describe('signAccessToken', () => {
    it('should sign a valid JWT token', () => {
      const token = signAccessToken(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include payload data in token', () => {
      const token = signAccessToken(testPayload);
      const decoded = jwt.decode(token) as JwtPayload;

      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
      expect(decoded.username).toBe(testPayload.username);
    });

    it('should include expiration claim', () => {
      const token = signAccessToken(testPayload);
      const decoded = jwt.decode(token) as { exp: number };

      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });
  });

  describe('signRefreshToken', () => {
    it('should sign a valid refresh token', () => {
      const token = signRefreshToken(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should be different from access token for same payload', () => {
      const accessToken = signAccessToken(testPayload);
      const refreshToken = signRefreshToken(testPayload);

      expect(accessToken).not.toBe(refreshToken);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify and decode a valid token', () => {
      const token = signAccessToken(testPayload);
      const decoded = verifyAccessToken(token);

      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
      expect(decoded.username).toBe(testPayload.username);
    });

    it('should throw for invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow();
    });

    it('should throw for tampered token', () => {
      const token = signAccessToken(testPayload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      expect(() => verifyAccessToken(tamperedToken)).toThrow();
    });

    it('should throw for refresh token used as access token', () => {
      const refreshToken = signRefreshToken(testPayload);

      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify and decode a valid refresh token', () => {
      const token = signRefreshToken(testPayload);
      const decoded = verifyRefreshToken(token);

      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
      expect(decoded.username).toBe(testPayload.username);
    });

    it('should throw for access token used as refresh token', () => {
      const accessToken = signAccessToken(testPayload);

      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });
  });

  describe('cookie options', () => {
    it('should have correct access token cookie options', () => {
      expect(accessTokenCookieOptions.httpOnly).toBe(true);
      expect(accessTokenCookieOptions.path).toBe('/');
      expect(accessTokenCookieOptions.maxAge).toBe(15 * 60 * 1000); // 15 minutes
    });

    it('should have correct refresh token cookie options', () => {
      expect(refreshTokenCookieOptions.httpOnly).toBe(true);
      expect(refreshTokenCookieOptions.path).toBe('/');
      expect(refreshTokenCookieOptions.maxAge).toBe(365 * 24 * 60 * 60 * 1000); // 1 year
    });

    it('should have secure=false in non-prod (test) environment', () => {
      expect(accessTokenCookieOptions.secure).toBe(false);
      expect(refreshTokenCookieOptions.secure).toBe(false);
    });

    it('should have lax sameSite in non-prod environment', () => {
      expect(accessTokenCookieOptions.sameSite).toBe('lax');
      expect(refreshTokenCookieOptions.sameSite).toBe('lax');
    });
  });

  describe('token expiration', () => {
    it('should create tokens with different expiration times', () => {
      const accessToken = signAccessToken(testPayload);
      const refreshToken = signRefreshToken(testPayload);

      const accessDecoded = jwt.decode(accessToken) as { exp: number };
      const refreshDecoded = jwt.decode(refreshToken) as { exp: number };

      // Refresh token should expire later than access token
      expect(refreshDecoded.exp).toBeGreaterThan(accessDecoded.exp);
    });
  });
});
