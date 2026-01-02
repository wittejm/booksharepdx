import { Router } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../config/database.js';
import { Post } from '../entities/Post.js';
import { User } from '../entities/User.js';
import { Block } from '../entities/Block.js';
import { Neighborhood } from '../entities/Neighborhood.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// Validation schemas
const createPostSchema = z.object({
  book: z.object({
    title: z.string().min(1),
    author: z.string().min(1),
    coverImage: z.string().optional(),
    genre: z.string(),
    isbn: z.string().optional(),
  }),
  type: z.enum(['giveaway', 'exchange']),
  notes: z.string().optional(),
});

const updatePostSchema = z.object({
  notes: z.string().optional(),
  status: z.enum(['active', 'pending_exchange', 'archived']).optional(),
  pendingExchange: z.object({
    initiatorUserId: z.string(),
    recipientUserId: z.string(),
    givingPostId: z.string(),
    receivingPostId: z.string(),
    timestamp: z.number(),
  }).optional().nullable(),
  givenTo: z.string().optional().nullable(),
});

// Helper function to calculate distance in miles
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GET /api/posts - List posts with filters
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
    const radius = req.query.radius ? parseFloat(req.query.radius as string) : undefined;
    const neighborhoodId = req.query.neighborhoodId as string | undefined;
    const type = req.query.type as 'giveaway' | 'exchange' | undefined;
    const genre = req.query.genre as string | undefined;
    const status = req.query.status as 'active' | 'pending_exchange' | 'archived' | undefined;
    const search = req.query.search as string | undefined;
    const userId = req.query.userId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const postRepo = AppDataSource.getRepository(Post);
    const userRepo = AppDataSource.getRepository(User);
    const neighborhoodRepo = AppDataSource.getRepository(Neighborhood);
    const blockRepo = AppDataSource.getRepository(Block);

    // Build query
    let query = postRepo.createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .orderBy('post.createdAt', 'DESC');

    // Filter by status (default to active)
    if (status) {
      query = query.andWhere('post.status = :status', { status });
    } else {
      query = query.andWhere('post.status = :status', { status: 'active' });
    }

    // Filter by type
    if (type) {
      query = query.andWhere('post.type = :type', { type });
    }

    // Filter by user
    if (userId) {
      query = query.andWhere('post.userId = :userId', { userId });
    }

    // Search by title/author
    if (search) {
      query = query.andWhere(
        "(post.book->>'title' ILIKE :search OR post.book->>'author' ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    // Filter by genre
    if (genre) {
      query = query.andWhere("post.book->>'genre' = :genre", { genre });
    }

    // Filter out blocked users if authenticated
    if (req.user) {
      const blocks = await blockRepo.find({
        where: [
          { blockerId: req.user.id },
          { blockedId: req.user.id },
        ],
      });
      const blockedIds = blocks.map(b => b.blockerId === req.user!.id ? b.blockedId : b.blockerId);
      if (blockedIds.length > 0) {
        query = query.andWhere('post.userId NOT IN (:...blockedIds)', { blockedIds });
      }
    }

    // Execute query
    const [posts, total] = await query
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    // Calculate distances if lat/lng provided
    let postsWithDistance = posts.map(post => ({
      ...post.toJSON(),
      user: post.user?.toJSON(),
      distance: undefined as number | undefined,
    }));

    if (lat !== undefined && lng !== undefined) {
      // Get neighborhoods for centroid lookup
      const neighborhoods = await neighborhoodRepo.find();
      const neighborhoodMap = new Map(neighborhoods.map(n => [n.id, n]));

      postsWithDistance = await Promise.all(postsWithDistance.map(async (post) => {
        const postUser = await userRepo.findOne({ where: { id: post.userId } });
        if (!postUser) return post;

        let userLat: number, userLng: number;

        if (postUser.locationType === 'pin' && postUser.locationLat && postUser.locationLng) {
          userLat = postUser.locationLat;
          userLng = postUser.locationLng;
        } else if (postUser.locationType === 'neighborhood' && postUser.neighborhoodId) {
          const neighborhood = neighborhoodMap.get(postUser.neighborhoodId);
          if (neighborhood) {
            userLat = neighborhood.centroidLat;
            userLng = neighborhood.centroidLng;
          } else {
            return post;
          }
        } else {
          return post;
        }

        const distance = haversineDistance(lat, lng, userLat, userLng);
        return { ...post, distance: Math.round(distance * 10) / 10 };
      }));

      // Filter by radius if specified
      if (radius) {
        postsWithDistance = postsWithDistance.filter(p =>
          p.distance === undefined || p.distance <= radius
        );
      }

      // Sort by distance
      postsWithDistance.sort((a, b) => {
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      });
    }

    res.json({
      data: postsWithDistance,
      meta: { total, limit, offset },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/posts/active - List active posts only
router.get('/active', optionalAuth, async (req, res, next) => {
  try {
    const postRepo = AppDataSource.getRepository(Post);

    const posts = await postRepo.find({
      where: { status: 'active' },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    res.json({
      data: posts.map(p => ({
        ...p.toJSON(),
        user: p.user?.toJSON(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/posts/:id - Get post by ID
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const postRepo = AppDataSource.getRepository(Post);

    const post = await postRepo.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!post) {
      throw new AppError('Post not found', 404, 'NOT_FOUND');
    }

    res.json({
      data: {
        ...post.toJSON(),
        user: post.user?.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/posts/user/:userId - Get posts by user
router.get('/user/:userId', optionalAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const postRepo = AppDataSource.getRepository(Post);

    const posts = await postRepo.find({
      where: { userId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    res.json({
      data: posts.map(p => ({
        ...p.toJSON(),
        user: p.user?.toJSON(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/posts - Create post
router.post('/', requireAuth, validateBody(createPostSchema), async (req, res, next) => {
  try {
    const postRepo = AppDataSource.getRepository(Post);

    const post = postRepo.create({
      userId: req.user!.id,
      book: req.body.book,
      type: req.body.type,
      notes: req.body.notes,
      status: 'active',
    });

    await postRepo.save(post);

    res.status(201).json({ data: post.toJSON() });
  } catch (error) {
    next(error);
  }
});

// PUT /api/posts/:id - Update post
router.put('/:id', requireAuth, validateBody(updatePostSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const postRepo = AppDataSource.getRepository(Post);
    const userRepo = AppDataSource.getRepository(User);

    const post = await postRepo.findOne({ where: { id } });
    if (!post) {
      throw new AppError('Post not found', 404, 'NOT_FOUND');
    }

    // Can only update own posts (or admin)
    if (post.userId !== req.user!.id && req.user!.role !== 'admin') {
      throw new AppError('Cannot update other users\' posts', 403, 'FORBIDDEN');
    }

    // Handle status change to archived (given/exchanged)
    const wasActive = post.status === 'active' || post.status === 'pending_exchange';
    const becomingArchived = req.body.status === 'archived' && wasActive;

    // Apply updates
    if (req.body.notes !== undefined) post.notes = req.body.notes;
    if (req.body.status !== undefined) post.status = req.body.status;
    if (req.body.pendingExchange !== undefined) post.pendingExchange = req.body.pendingExchange;
    if (req.body.givenTo !== undefined) post.givenTo = req.body.givenTo;

    if (req.body.status === 'archived') {
      post.archivedAt = new Date();
    }

    await postRepo.save(post);

    // Update stats if post was given/exchanged
    if (becomingArchived && post.givenTo) {
      const giver = await userRepo.findOne({ where: { id: post.userId } });
      const receiver = await userRepo.findOne({ where: { id: post.givenTo } });

      if (giver) {
        giver.booksGiven += 1;
        await userRepo.save(giver);
      }
      if (receiver) {
        receiver.booksReceived += 1;
        await userRepo.save(receiver);
      }
    }

    res.json({ data: post.toJSON() });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/posts/:id - Delete post
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const postRepo = AppDataSource.getRepository(Post);

    const post = await postRepo.findOne({ where: { id } });
    if (!post) {
      throw new AppError('Post not found', 404, 'NOT_FOUND');
    }

    // Can only delete own posts (or admin)
    if (post.userId !== req.user!.id && req.user!.role !== 'admin') {
      throw new AppError('Cannot delete other users\' posts', 403, 'FORBIDDEN');
    }

    await postRepo.remove(post);
    res.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
