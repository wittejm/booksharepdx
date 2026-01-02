import { Router } from 'express';
import { AppDataSource } from '../config/database.js';
import { User } from '../entities/User.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { requireModerator } from '../middleware/roleCheck.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/users - List all users (moderators only)
router.get('/', requireAuth, requireModerator, async (req, res, next) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const users = await userRepo.find({
      order: { createdAt: 'DESC' },
    });

    res.json({ data: users.map(u => u.toJSON()) });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo.findOne({ where: { id } });
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    res.json({ data: user.toJSON() });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/username/:username - Get user by username
router.get('/username/:username', optionalAuth, async (req, res, next) => {
  try {
    const { username } = req.params;
    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo.findOne({ where: { username } });
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    res.json({ data: user.toJSON() });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/:id - Update user (self or admin)
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;

    // Can only update self unless admin
    if (currentUser.id !== id && currentUser.role !== 'admin') {
      throw new AppError('Cannot update other users', 403, 'FORBIDDEN');
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id } });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    // Apply updates
    const allowedFields = ['username', 'bio', 'profilePicture', 'readingPreferences', 'socialLinks'];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        (user as any)[field] = req.body[field];
      }
    }

    // Handle location update
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

export default router;
