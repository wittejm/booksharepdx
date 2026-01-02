import { Router } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../config/database.js';
import { Comment } from '../entities/Comment.js';
import { Post } from '../entities/Post.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const createCommentSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().min(1).max(2000),
});

// GET /api/comments/post/:postId - Get comments for post
router.get('/post/:postId', optionalAuth, async (req, res, next) => {
  try {
    const { postId } = req.params;
    const commentRepo = AppDataSource.getRepository(Comment);

    const comments = await commentRepo.find({
      where: { postId },
      relations: ['user'],
      order: { timestamp: 'ASC' },
    });

    res.json({
      data: comments.map(c => ({
        ...c.toJSON(),
        user: c.user?.toJSON(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/comments - Create comment
router.post('/', requireAuth, validateBody(createCommentSchema), async (req, res, next) => {
  try {
    const { postId, content } = req.body;
    const commentRepo = AppDataSource.getRepository(Comment);
    const postRepo = AppDataSource.getRepository(Post);

    // Verify post exists and is active
    const post = await postRepo.findOne({ where: { id: postId } });
    if (!post) {
      throw new AppError('Post not found', 404, 'NOT_FOUND');
    }
    if (post.status === 'archived') {
      throw new AppError('Cannot comment on archived posts', 400, 'POST_ARCHIVED');
    }

    const comment = commentRepo.create({
      postId,
      userId: req.user!.id,
      content,
    });

    await commentRepo.save(comment);

    res.status(201).json({ data: comment.toJSON() });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/comments/:id - Delete comment
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const commentRepo = AppDataSource.getRepository(Comment);

    const comment = await commentRepo.findOne({ where: { id } });
    if (!comment) {
      throw new AppError('Comment not found', 404, 'NOT_FOUND');
    }

    // Can only delete own comments (or admin/moderator)
    if (comment.userId !== req.user!.id && !['admin', 'moderator'].includes(req.user!.role)) {
      throw new AppError('Cannot delete other users\' comments', 403, 'FORBIDDEN');
    }

    await commentRepo.remove(comment);
    res.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
