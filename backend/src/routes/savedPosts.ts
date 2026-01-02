import { Router } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../config/database.js';
import { SavedPost } from '../entities/SavedPost.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const savePostSchema = z.object({
  postId: z.string().uuid(),
  expressedInterest: z.boolean().optional().default(false),
});

// GET /api/saved-posts - Get saved posts
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const savedPostRepo = AppDataSource.getRepository(SavedPost);

    const savedPosts = await savedPostRepo.find({
      where: { userId: req.user!.id },
      relations: ['post', 'post.user'],
      order: { timestamp: 'DESC' },
    });

    res.json({
      data: savedPosts.map(sp => ({
        ...sp.toJSON(),
        post: sp.post?.toJSON(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/saved-posts - Save post
router.post('/', requireAuth, validateBody(savePostSchema), async (req, res, next) => {
  try {
    const { postId, expressedInterest } = req.body;
    const savedPostRepo = AppDataSource.getRepository(SavedPost);

    // Check if already saved
    const existing = await savedPostRepo.findOne({
      where: { userId: req.user!.id, postId },
    });

    if (existing) {
      // Update expressedInterest if needed
      if (expressedInterest && !existing.expressedInterest) {
        existing.expressedInterest = true;
        await savedPostRepo.save(existing);
      }
      return res.json({ data: existing.toJSON() });
    }

    const savedPost = savedPostRepo.create({
      userId: req.user!.id,
      postId,
      expressedInterest,
    });

    await savedPostRepo.save(savedPost);
    res.status(201).json({ data: savedPost.toJSON() });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/saved-posts/:postId - Unsave post
router.delete('/:postId', requireAuth, async (req, res, next) => {
  try {
    const { postId } = req.params;
    const savedPostRepo = AppDataSource.getRepository(SavedPost);

    const savedPost = await savedPostRepo.findOne({
      where: { userId: req.user!.id, postId },
    });

    if (!savedPost) {
      throw new AppError('Saved post not found', 404, 'NOT_FOUND');
    }

    await savedPostRepo.remove(savedPost);
    res.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
