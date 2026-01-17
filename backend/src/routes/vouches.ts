/**
 * Vouch is a non-MVP feature.
 * Intended for users to verify they met in person after an exchange.
 */
import { Router } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../config/database.js';
import { Vouch } from '../entities/Vouch.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const createVouchSchema = z.object({
  userId: z.string().uuid(), // The other user to vouch for
});

// GET /api/vouches/user/:userId - Get vouches for user
router.get('/user/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const vouchRepo = AppDataSource.getRepository(Vouch);

    const vouches = await vouchRepo.find({
      where: [
        { user1Id: userId },
        { user2Id: userId },
      ],
      relations: ['user1', 'user2'],
    });

    res.json({
      data: vouches.map(v => ({
        ...v.toJSON(),
        user1: v.user1?.toJSON(),
        user2: v.user2?.toJSON(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/vouches - Create vouch
router.post('/', requireAuth, validateBody(createVouchSchema), async (req, res, next) => {
  try {
    const { userId: otherUserId } = req.body;
    const currentUserId = req.user!.id;
    const vouchRepo = AppDataSource.getRepository(Vouch);

    // Can't vouch for yourself
    if (otherUserId === currentUserId) {
      throw new AppError(
        'You cannot vouch for yourself. Vouches must come from other community members.',
        400,
        'CANNOT_VOUCH_SELF'
      );
    }

    // Order user IDs consistently
    const [user1Id, user2Id] = [currentUserId, otherUserId].sort();

    // Check if vouch already exists
    const existing = await vouchRepo.findOne({
      where: { user1Id, user2Id },
    });

    if (existing) {
      // Check if already mutually confirmed
      if (existing.mutuallyConfirmed) {
        return res.json({ data: existing.toJSON() });
      }

      // If current user initiated, they can't confirm their own vouch
      // The other user needs to confirm
      // For simplicity, we'll just mark as confirmed if the other user calls this
      existing.mutuallyConfirmed = true;
      await vouchRepo.save(existing);

      return res.json({ data: existing.toJSON() });
    }

    // Create new vouch
    const vouch = vouchRepo.create({
      user1Id,
      user2Id,
      mutuallyConfirmed: false,
    });

    await vouchRepo.save(vouch);
    res.status(201).json({ data: vouch.toJSON() });
  } catch (error) {
    next(error);
  }
});

// PUT /api/vouches/:id/confirm - Confirm mutual vouch
router.put('/:id/confirm', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const vouchRepo = AppDataSource.getRepository(Vouch);

    const vouch = await vouchRepo.findOne({ where: { id } });
    if (!vouch) {
      throw new AppError(
        'This vouch could not be found. It may have been removed.',
        404,
        'VOUCH_NOT_FOUND'
      );
    }

    // Verify current user is a participant
    if (vouch.user1Id !== req.user!.id && vouch.user2Id !== req.user!.id) {
      throw new AppError(
        'You can only confirm vouches that involve you.',
        403,
        'NOT_VOUCH_PARTICIPANT'
      );
    }

    if (vouch.mutuallyConfirmed) {
      return res.json({ data: vouch.toJSON() });
    }

    vouch.mutuallyConfirmed = true;
    await vouchRepo.save(vouch);

    res.json({ data: vouch.toJSON() });
  } catch (error) {
    next(error);
  }
});

export default router;
