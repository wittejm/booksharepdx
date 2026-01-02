import { Router } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../config/database.js';
import { MessageThread } from '../entities/MessageThread.js';
import { Message } from '../entities/Message.js';
import { Post } from '../entities/Post.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const createThreadSchema = z.object({
  postId: z.string().uuid(),
  recipientId: z.string().uuid(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  type: z.enum(['user', 'system']).optional().default('user'),
  systemMessageType: z.enum([
    'exchange_proposed',
    'exchange_completed',
    'exchange_declined',
    'exchange_cancelled',
    'gift_completed',
  ]).optional(),
});

// GET /api/messages/threads - Get user's message threads
router.get('/threads', requireAuth, async (req, res, next) => {
  try {
    const threadRepo = AppDataSource.getRepository(MessageThread);

    const threads = await threadRepo
      .createQueryBuilder('thread')
      .leftJoinAndSelect('thread.post', 'post')
      .where(':userId = ANY(thread.participants)', { userId: req.user!.id })
      .orderBy('thread.lastMessageAt', 'DESC')
      .getMany();

    res.json({
      data: threads.map(t => ({
        ...t.toJSON(),
        post: t.post?.toJSON(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/messages/threads/:threadId - Get messages in thread
router.get('/threads/:threadId', requireAuth, async (req, res, next) => {
  try {
    const { threadId } = req.params;
    const threadRepo = AppDataSource.getRepository(MessageThread);
    const messageRepo = AppDataSource.getRepository(Message);

    // Verify user is participant
    const thread = await threadRepo.findOne({ where: { id: threadId } });
    if (!thread) {
      throw new AppError('Thread not found', 404, 'NOT_FOUND');
    }
    if (!thread.participants.includes(req.user!.id)) {
      throw new AppError('Not a participant in this thread', 403, 'FORBIDDEN');
    }

    const messages = await messageRepo.find({
      where: { threadId },
      relations: ['sender'],
      order: { timestamp: 'ASC' },
    });

    res.json({
      data: messages.map(m => ({
        ...m.toJSON(),
        sender: m.sender?.toJSON(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/messages/threads - Create thread
router.post('/threads', requireAuth, validateBody(createThreadSchema), async (req, res, next) => {
  try {
    const { postId, recipientId } = req.body;
    const threadRepo = AppDataSource.getRepository(MessageThread);
    const postRepo = AppDataSource.getRepository(Post);

    // Verify post exists
    const post = await postRepo.findOne({ where: { id: postId } });
    if (!post) {
      throw new AppError('Post not found', 404, 'NOT_FOUND');
    }

    const participants = [req.user!.id, recipientId].sort();

    // Check if thread already exists
    const existing = await threadRepo
      .createQueryBuilder('thread')
      .where('thread.postId = :postId', { postId })
      .andWhere('thread.participants = :participants', { participants: JSON.stringify(participants) })
      .getOne();

    if (existing) {
      return res.json({ data: existing.toJSON() });
    }

    const thread = threadRepo.create({
      postId,
      participants,
      lastMessageAt: new Date(),
      unreadCount: {},
    });

    await threadRepo.save(thread);
    res.status(201).json({ data: thread.toJSON() });
  } catch (error) {
    next(error);
  }
});

// POST /api/messages/threads/:threadId/messages - Send message
router.post('/threads/:threadId/messages', requireAuth, validateBody(sendMessageSchema), async (req, res, next) => {
  try {
    const { threadId } = req.params;
    const { content, type, systemMessageType } = req.body;
    const threadRepo = AppDataSource.getRepository(MessageThread);
    const messageRepo = AppDataSource.getRepository(Message);

    const thread = await threadRepo.findOne({ where: { id: threadId } });
    if (!thread) {
      throw new AppError('Thread not found', 404, 'NOT_FOUND');
    }
    if (!thread.participants.includes(req.user!.id)) {
      throw new AppError('Not a participant in this thread', 403, 'FORBIDDEN');
    }

    const message = messageRepo.create({
      threadId,
      senderId: req.user!.id,
      content,
      type,
      systemMessageType: systemMessageType || null,
    });

    await messageRepo.save(message);

    // Update thread
    thread.lastMessageAt = message.timestamp;
    const otherParticipant = thread.participants.find(p => p !== req.user!.id);
    if (otherParticipant) {
      thread.unreadCount[otherParticipant] = (thread.unreadCount[otherParticipant] || 0) + 1;
    }
    await threadRepo.save(thread);

    res.status(201).json({ data: message.toJSON() });
  } catch (error) {
    next(error);
  }
});

// PUT /api/messages/threads/:threadId/read - Mark thread as read
router.put('/threads/:threadId/read', requireAuth, async (req, res, next) => {
  try {
    const { threadId } = req.params;
    const threadRepo = AppDataSource.getRepository(MessageThread);

    const thread = await threadRepo.findOne({ where: { id: threadId } });
    if (!thread) {
      throw new AppError('Thread not found', 404, 'NOT_FOUND');
    }
    if (!thread.participants.includes(req.user!.id)) {
      throw new AppError('Not a participant in this thread', 403, 'FORBIDDEN');
    }

    thread.unreadCount[req.user!.id] = 0;
    await threadRepo.save(thread);

    res.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
