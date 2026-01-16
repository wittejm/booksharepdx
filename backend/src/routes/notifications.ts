import { Router } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../config/database.js';
import { Notification } from '../entities/Notification.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { findByIdOrThrow, requireOwnership } from '../utils/db.js';

const router = Router();

const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(['exchange_proposed', 'exchange_confirmed', 'exchange_declined', 'message', 'moderator_action']),
  content: z.string(),
  relatedId: z.string().uuid().optional(),
});

// GET /api/notifications - Get user's notifications
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const notificationRepo = AppDataSource.getRepository(Notification);

    const notifications = await notificationRepo.find({
      where: { userId: req.user!.id },
      order: { timestamp: 'DESC' },
      take: 50,
    });

    res.json({ data: notifications.map(n => n.toJSON()) });
  } catch (error) {
    next(error);
  }
});

// POST /api/notifications - Create notification (internal use)
router.post('/', requireAuth, validateBody(createNotificationSchema), async (req, res, next) => {
  try {
    const notificationRepo = AppDataSource.getRepository(Notification);

    const notification = notificationRepo.create({
      userId: req.body.userId,
      type: req.body.type,
      content: req.body.content,
      relatedId: req.body.relatedId || null,
      read: false,
    });

    await notificationRepo.save(notification);
    res.status(201).json({ data: notification.toJSON() });
  } catch (error) {
    next(error);
  }
});

// PUT /api/notifications/:id/read - Mark as read
router.put('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const notificationRepo = AppDataSource.getRepository(Notification);

    const notification = await findByIdOrThrow(
      notificationRepo,
      id,
      'Notification not found',
      'NOT_FOUND'
    );

    requireOwnership(notification.userId, req.user!.id);

    notification.read = true;
    await notificationRepo.save(notification);

    res.json({ data: notification.toJSON() });
  } catch (error) {
    next(error);
  }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', requireAuth, async (req, res, next) => {
  try {
    const notificationRepo = AppDataSource.getRepository(Notification);

    await notificationRepo.update(
      { userId: req.user!.id, read: false },
      { read: true }
    );

    res.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
