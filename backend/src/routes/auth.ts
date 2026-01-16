import { Router } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../config/database.js';
import { EMAIL_VERIFICATION_ENABLED } from '../config/features.js';
import { User } from '../entities/User.js';
import {
  signAccessToken,
  signRefreshToken,
  signMagicLinkToken,
  verifyMagicLinkToken,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from '../utils/jwt.js';
import { validateBody } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { env } from '../config/env.js';

const router = Router();

// Validation schemas
const signupSchema = z.object({
  email: z.string().email(),
  username: z.string().min(2).max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  preferredName: z.string().max(50).optional(),
  bio: z.string().min(1, 'Bio is required'),
});

const sendMagicLinkSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'), // email or username
});

const updateSchema = z.object({
  username: z.string().min(2).max(30).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  preferredName: z.string().max(50).optional(),
  bio: z.string().optional(),
  profilePicture: z.string().optional(),
  readingPreferences: z.object({
    favoriteGenres: z.array(z.string()).optional(),
    favoriteAuthors: z.array(z.string()).optional(),
    favoriteBooks: z.array(z.any()).optional(),
    lookingForBooks: z.array(z.any()).optional(),
    lookingForGenres: z.array(z.string()).optional(),
    lookingForAuthors: z.array(z.string()).optional(),
  }).optional(),
  socialLinks: z.array(z.object({
    label: z.string(),
    url: z.string().url(),
  })).optional(),
  location: z.object({
    type: z.enum(['neighborhood', 'pin']),
    neighborhoodId: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).optional(),
}).partial();

// POST /api/auth/signup
router.post('/signup', validateBody(signupSchema), async (req, res, next) => {
  try {
    const { email, username, preferredName, bio } = req.body;
    const userRepo = AppDataSource.getRepository(User);

    // Check if email exists
    const existingEmail = await userRepo.findOne({ where: { email: email.toLowerCase() } });
    if (existingEmail) {
      throw new AppError(
        'This email address is already registered. Please log in or use a different email.',
        400,
        'EMAIL_TAKEN'
      );
    }

    // Check if username exists
    const existingUsername = await userRepo.findOne({ where: { username: username.toLowerCase() } });
    if (existingUsername) {
      throw new AppError(
        `The username "${username}" is already taken. Please choose a different username.`,
        400,
        'USERNAME_TAKEN'
      );
    }

    // Create user
    const user = userRepo.create({
      email: email.toLowerCase(),
      username,
      preferredName: preferredName || null,
      bio,
      verified: !EMAIL_VERIFICATION_ENABLED, // Auto-verify when email verification is disabled
      role: 'user',
      locationType: 'neighborhood',
      neighborhoodId: null, // Not selected - user chooses on LocationSelectionPage
    });

    await userRepo.save(user);

    // TODO: Generate magic link token and send verification email
    // For now, just log that we would send it
    console.log(`[EMAIL] Verification magic link would be sent to: ${user.email}`);

    // Generate tokens - user is logged in immediately
    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Set cookies
    res.cookie('accessToken', accessToken, accessTokenCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

    res.status(201).json({ data: user.toJSON() });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/send-magic-link
router.post('/send-magic-link', validateBody(sendMagicLinkSchema), async (req, res, next) => {
  try {
    const { identifier } = req.body;
    const userRepo = AppDataSource.getRepository(User);

    // Check if identifier is email or username
    const isEmail = identifier.includes('@');
    const user = await userRepo.findOne({
      where: isEmail
        ? { email: identifier.toLowerCase() }
        : { username: identifier.toLowerCase() },
    });

    if (!user) {
      throw new AppError(
        'No account found with that email or username. Please check your credentials or sign up for a new account.',
        404,
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

    // When email verification is disabled, log in directly (dev mode)
    if (!EMAIL_VERIFICATION_ENABLED) {
      const payload = { userId: user.id, email: user.email, role: user.role };
      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);

      res.cookie('accessToken', accessToken, accessTokenCookieOptions);
      res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

      return res.json({ data: user.toJSON() });
    }

    // Generate magic link token
    const magicToken = signMagicLinkToken({ userId: user.id, email: user.email });
    const magicLinkUrl = `${env.frontendUrl}/verify-magic-link?token=${magicToken}`;

    // TODO: Send actual email with magic link
    console.log(`[EMAIL] Magic sign-in link would be sent to: ${user.email}`);
    console.log(`[EMAIL] Magic link URL: ${magicLinkUrl}`);

    res.json({
      data: {
        success: true,
        message: 'If an account exists with that email or username, a sign-in link has been sent.',
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
  res.json({ data: { success: true } });
});

// GET /api/auth/verify-magic-link - Verify magic link token and log user in
router.get('/verify-magic-link', async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      throw new AppError('Invalid or missing token', 400, 'INVALID_TOKEN');
    }

    // Verify the magic link token
    let payload;
    try {
      payload = verifyMagicLinkToken(token);
    } catch {
      throw new AppError(
        'This sign-in link has expired or is invalid. Please request a new one.',
        400,
        'INVALID_TOKEN'
      );
    }

    // Find the user
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: payload.userId } });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (user.banned) {
      throw new AppError(
        'Your account has been banned due to a violation of our community guidelines.',
        403,
        'ACCOUNT_BANNED'
      );
    }

    // Generate access and refresh tokens
    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Set cookies
    res.cookie('accessToken', accessToken, accessTokenCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

    res.json({ data: user.toJSON() });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ data: req.user!.toJSON() });
});

// PUT /api/auth/me
router.put('/me', requireAuth, validateBody(updateSchema), async (req, res, next) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = req.user!;

    // Check if username is being changed and is taken
    if (req.body.username && req.body.username !== user.username) {
      const existing = await userRepo.findOne({ where: { username: req.body.username.toLowerCase() } });
      if (existing) {
        throw new AppError(
          `The username "${req.body.username}" is already taken by another user. Please choose a different username.`,
          400,
          'USERNAME_TAKEN'
        );
      }
    }

    // Update fields
    if (req.body.username) user.username = req.body.username;
    if (req.body.preferredName !== undefined) user.preferredName = req.body.preferredName || null;
    if (req.body.bio !== undefined) user.bio = req.body.bio;
    if (req.body.profilePicture !== undefined) user.profilePicture = req.body.profilePicture;
    if (req.body.readingPreferences !== undefined) user.readingPreferences = req.body.readingPreferences;
    if (req.body.socialLinks !== undefined) user.socialLinks = req.body.socialLinks;

    if (req.body.location) {
      user.locationType = req.body.location.type;
      user.neighborhoodId = req.body.location.neighborhoodId || null;
      user.locationLat = req.body.location.lat || null;
      user.locationLng = req.body.location.lng || null;
    }

    await userRepo.save(user);
    res.json({ data: user.toJSON() });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/verify-email (spoofed - auto-verifies)
router.post('/verify-email', requireAuth, async (req, res, next) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = req.user!;

    user.verified = true;
    await userRepo.save(user);

    console.log(`[EMAIL] Verification email would be sent to: ${user.email}`);

    res.json({ data: { success: true, message: 'Email verified (demo mode)' } });
  } catch (error) {
    next(error);
  }
});

export default router;
