import { Router } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../config/database.js';
import { ModerationAction } from '../entities/ModerationAction.js';
import { ModeratorNote } from '../entities/ModeratorNote.js';
import { User } from '../entities/User.js';
import { requireAuth } from '../middleware/auth.js';
import { requireModerator, requireAdmin } from '../middleware/roleCheck.js';
import { validateBody } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const createActionSchema = z.object({
  targetUserId: z.string().uuid(),
  action: z.enum(['warning', 'content_removed', 'suspended', 'banned']),
  reason: z.string().min(1),
  targetContentId: z.string().uuid().optional(),
  suspensionDuration: z.number().int().positive().optional(), // days
});

const createNoteSchema = z.object({
  reportId: z.string().uuid(),
  note: z.string().min(1),
});

// GET /api/moderation/actions - List moderation actions
router.get('/actions', requireAuth, requireModerator, async (req, res, next) => {
  try {
    const actionRepo = AppDataSource.getRepository(ModerationAction);

    const actions = await actionRepo.find({
      relations: ['moderator', 'targetUser'],
      order: { timestamp: 'DESC' },
      take: 100,
    });

    res.json({
      data: actions.map(a => ({
        ...a.toJSON(),
        moderator: a.moderator?.toJSON(),
        targetUser: a.targetUser?.toJSON(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/moderation/actions - Create moderation action
router.post('/actions', requireAuth, requireModerator, validateBody(createActionSchema), async (req, res, next) => {
  try {
    const { targetUserId, action, reason, targetContentId, suspensionDuration } = req.body;
    const actionRepo = AppDataSource.getRepository(ModerationAction);
    const userRepo = AppDataSource.getRepository(User);

    // Ban requires admin
    if (action === 'banned' && req.user!.role !== 'admin') {
      throw new AppError('Only admins can ban users', 403, 'FORBIDDEN');
    }

    const targetUser = await userRepo.findOne({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new AppError('Target user not found', 404, 'NOT_FOUND');
    }

    // Create action
    const modAction = actionRepo.create({
      moderatorId: req.user!.id,
      targetUserId,
      action,
      reason,
      targetContentId: targetContentId || null,
      suspensionDuration: suspensionDuration || null,
    });

    await actionRepo.save(modAction);

    // Apply action to user
    if (action === 'suspended' && suspensionDuration) {
      const until = Date.now() + suspensionDuration * 24 * 60 * 60 * 1000;
      targetUser.suspended = { until, reason };
      await userRepo.save(targetUser);
    } else if (action === 'banned') {
      targetUser.banned = true;
      await userRepo.save(targetUser);
    }

    res.status(201).json({ data: modAction.toJSON() });
  } catch (error) {
    next(error);
  }
});

// GET /api/moderation/actions/user/:userId - Get actions against user
router.get('/actions/user/:userId', requireAuth, requireModerator, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const actionRepo = AppDataSource.getRepository(ModerationAction);

    const actions = await actionRepo.find({
      where: { targetUserId: userId },
      relations: ['moderator'],
      order: { timestamp: 'DESC' },
    });

    res.json({
      data: actions.map(a => ({
        ...a.toJSON(),
        moderator: a.moderator?.toJSON(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/moderation/notes - Add moderator note
router.post('/notes', requireAuth, requireModerator, validateBody(createNoteSchema), async (req, res, next) => {
  try {
    const { reportId, note } = req.body;
    const noteRepo = AppDataSource.getRepository(ModeratorNote);

    const modNote = noteRepo.create({
      reportId,
      moderatorId: req.user!.id,
      note,
    });

    await noteRepo.save(modNote);
    res.status(201).json({ data: modNote.toJSON() });
  } catch (error) {
    next(error);
  }
});

// GET /api/moderation/notes/:reportId - Get notes for report
router.get('/notes/:reportId', requireAuth, requireModerator, async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const noteRepo = AppDataSource.getRepository(ModeratorNote);

    const notes = await noteRepo.find({
      where: { reportId },
      relations: ['moderator'],
      order: { timestamp: 'ASC' },
    });

    res.json({
      data: notes.map(n => ({
        ...n.toJSON(),
        moderator: n.moderator?.toJSON(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/moderation/users/:userId/unban - Unban user (admin only)
router.put('/users/:userId/unban', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    user.banned = false;
    user.suspended = null;
    await userRepo.save(user);

    res.json({ data: user.toJSON() });
  } catch (error) {
    next(error);
  }
});

export default router;
