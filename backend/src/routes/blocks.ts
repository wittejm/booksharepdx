import { Router } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../config/database.js';
import { Block } from '../entities/Block.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const blockSchema = z.object({
  blockedId: z.string().uuid(),
});

// GET /api/blocks - Get blocked users
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const blockRepo = AppDataSource.getRepository(Block);

    const blocks = await blockRepo.find({
      where: { blockerId: req.user!.id },
      relations: ['blocked'],
    });

    res.json({
      data: blocks.map(b => b.blockedId),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/blocks - Block user
router.post('/', requireAuth, validateBody(blockSchema), async (req, res, next) => {
  try {
    const { blockedId } = req.body;
    const blockRepo = AppDataSource.getRepository(Block);

    // Can't block yourself
    if (blockedId === req.user!.id) {
      throw new AppError(
        'You cannot block yourself.',
        400,
        'CANNOT_BLOCK_SELF'
      );
    }

    // Check if already blocked
    const existing = await blockRepo.findOne({
      where: { blockerId: req.user!.id, blockedId },
    });

    if (existing) {
      return res.json({ data: { success: true, message: 'User already blocked' } });
    }

    const block = blockRepo.create({
      blockerId: req.user!.id,
      blockedId,
    });

    await blockRepo.save(block);
    res.status(201).json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/blocks/:blockedId - Unblock user
router.delete('/:blockedId', requireAuth, async (req, res, next) => {
  try {
    const { blockedId } = req.params;
    const blockRepo = AppDataSource.getRepository(Block);

    const block = await blockRepo.findOne({
      where: { blockerId: req.user!.id, blockedId },
    });

    if (!block) {
      throw new AppError(
        'This user is not currently blocked. They may have already been unblocked.',
        404,
        'BLOCK_NOT_FOUND'
      );
    }

    await blockRepo.remove(block);
    res.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
});

// GET /api/blocks/check/:userId - Check if blocked
router.get('/check/:userId', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const blockRepo = AppDataSource.getRepository(Block);

    const block = await blockRepo.findOne({
      where: [
        { blockerId: req.user!.id, blockedId: userId },
        { blockerId: userId, blockedId: req.user!.id },
      ],
    });

    res.json({ data: { isBlocked: !!block } });
  } catch (error) {
    next(error);
  }
});

export default router;
