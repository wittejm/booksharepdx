import { Router } from 'express';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import postRoutes from './posts.js';
import messageRoutes from './messages.js';
import blockRoutes from './blocks.js';
import reportRoutes from './reports.js';
import moderationRoutes from './moderation.js';
import vouchRoutes from './vouches.js';
import notificationRoutes from './notifications.js';
import savedPostRoutes from './savedPosts.js';
import neighborhoodRoutes from './neighborhoods.js';
import bookRoutes from './books.js';
import uploadRoutes from './uploads.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/messages', messageRoutes);
router.use('/blocks', blockRoutes);
router.use('/reports', reportRoutes);
router.use('/moderation', moderationRoutes);
router.use('/vouches', vouchRoutes);
router.use('/notifications', notificationRoutes);
router.use('/saved-posts', savedPostRoutes);
router.use('/neighborhoods', neighborhoodRoutes);
router.use('/books', bookRoutes);
router.use('/uploads', uploadRoutes);

export default router;
