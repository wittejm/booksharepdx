import { Router } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../config/database.js';
import { EMAIL_VERIFICATION_ENABLED } from '../config/features.js';
import { User } from '../entities/User.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import {
  signAccessToken,
  signRefreshToken,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from '../utils/jwt.js';
import { validateBody } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// Validation schemas
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(2).max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  bio: z.string().min(1, 'Bio is required'),
});

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'), // email or username
  password: z.string(),
});

const updateSchema = z.object({
  username: z.string().min(2).max(30).regex(/^[a-zA-Z0-9_-]+$/).optional(),
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
    const { email, password, username, bio } = req.body;
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
    const passwordHash = await hashPassword(password);
    const user = userRepo.create({
      email: email.toLowerCase(),
      username,
      passwordHash,
      bio,
      verified: !EMAIL_VERIFICATION_ENABLED, // Auto-verify when email verification is disabled
      role: 'user',
      locationType: 'neighborhood',
      neighborhoodId: 'pearl-district', // Default
    });

    await userRepo.save(user);

    // Generate tokens
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

// POST /api/auth/login
router.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
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
        401,
        'INVALID_CREDENTIALS'
      );
    }

    if (user.banned) {
      throw new AppError(
        'Your account has been banned due to a violation of our community guidelines. Please contact support if you believe this is an error.',
        403,
        'ACCOUNT_BANNED'
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new AppError(
        'Incorrect password. Please try again or use the "Forgot Password" link to reset it.',
        401,
        'INVALID_CREDENTIALS'
      );
    }

    // Generate tokens
    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Set cookies
    res.cookie('accessToken', accessToken, accessTokenCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);

    res.json({ data: user.toJSON() });
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

// POST /api/auth/forgot-password (spoofed)
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    console.log(`[EMAIL] Password reset email would be sent to: ${email}`);

    res.json({ data: { success: true, message: 'Reset email sent (demo mode)' } });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/reset-password (spoofed)
router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;
    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      throw new AppError(
        'No account found with that email address. Please check the email or sign up for a new account.',
        404,
        'USER_NOT_FOUND'
      );
    }

    user.passwordHash = await hashPassword(newPassword);
    await userRepo.save(user);

    console.log(`[EMAIL] Password reset for: ${email}`);

    res.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
