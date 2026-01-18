import { Router } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../config/database.js';
import { Post } from '../entities/Post.js';
import { User } from '../entities/User.js';
import { Block } from '../entities/Block.js';
import { getNeighborhoodCentroid } from '../data/neighborhoodCentroids.js';
import { haversineDistance } from '../utils/geo.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';
import { findByIdOrThrow, requireOwnership } from '../utils/db.js';
import { findOrCreateBook, incrementBookCounter, getBookById } from '../services/bookService.js';

const router = Router();

// Validation schemas
const createPostSchema = z.object({
  book: z.object({
    googleBooksId: z.string().optional(),
    title: z.string().min(1),
    author: z.string().min(1),
    coverImage: z.string().optional(),
    genre: z.string().optional(),
    isbn: z.string().optional(),
  }),
  bookId: z.string().optional(),
  type: z.enum(['giveaway', 'exchange', 'loan']),
  notes: z.string().optional(),
  loanDuration: z.number().optional(),
});

const updatePostSchema = z.object({
  notes: z.string().optional(),
  status: z.enum(['active', 'agreed_upon', 'archived']).optional(),
  agreedExchange: z.object({
    responderUserId: z.string(),
    sharerUserId: z.string(),
    responderPostId: z.string(),
    sharerPostId: z.string(),
    timestamp: z.number(),
  }).optional().nullable(),
  givenTo: z.string().optional().nullable(),
});

// GET /api/posts - List posts with filters
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined;
    const radius = req.query.radius ? parseFloat(req.query.radius as string) : undefined;
    const neighborhoodId = req.query.neighborhoodId as string | undefined;
    const type = req.query.type as 'giveaway' | 'exchange' | undefined;
    const genre = req.query.genre as string | undefined;
    const status = req.query.status as 'active' | 'agreed_upon' | 'archived' | undefined;
    const search = req.query.search as string | undefined;
    const userId = req.query.userId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const postRepo = AppDataSource.getRepository(Post);
    const userRepo = AppDataSource.getRepository(User);
    const blockRepo = AppDataSource.getRepository(Block);

    // Build query
    let query = postRepo.createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.book', 'book')
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

    // Search by title/author (using book relation)
    if (search) {
      query = query.andWhere(
        '(book.title ILIKE :search OR book.author ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Filter by genre
    if (genre) {
      query = query.andWhere('book.genre = :genre', { genre });
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
      postsWithDistance = await Promise.all(postsWithDistance.map(async (post) => {
        const postUser = await userRepo.findOne({ where: { id: post.userId } });
        if (!postUser) return post;

        let userLat: number, userLng: number;

        if (postUser.locationType === 'pin' && postUser.locationLat && postUser.locationLng) {
          userLat = postUser.locationLat;
          userLng = postUser.locationLng;
        } else if (postUser.locationType === 'neighborhood' && postUser.neighborhoodId) {
          const centroid = getNeighborhoodCentroid(postUser.neighborhoodId);
          if (centroid) {
            userLat = centroid.lat;
            userLng = centroid.lng;
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

    const posts = await postRepo.createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.book', 'book')
      .where('post.status = :status', { status: 'active' })
      .orderBy('post.createdAt', 'DESC')
      .getMany();

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

    const post = await postRepo.createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.book', 'book')
      .where('post.id = :id', { id })
      .getOne();

    if (!post) {
      throw new AppError(
        'This book listing could not be found. It may have been removed or archived by the owner.',
        404,
        'POST_NOT_FOUND'
      );
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

    const posts = await postRepo.createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.book', 'book')
      .where('post.userId = :userId', { userId })
      .orderBy('post.createdAt', 'DESC')
      .getMany();

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

    // Find or create the book entity
    const book = await findOrCreateBook(req.body.book);

    const post = postRepo.create({
      userId: req.user!.id,
      bookId: book.id,
      type: req.body.type,
      notes: req.body.notes,
      status: 'active',
      loanDuration: req.body.loanDuration,
    });

    await postRepo.save(post);

    // Reload with relations for response
    const savedPost = await postRepo.findOne({
      where: { id: post.id },
      relations: ['book', 'user'],
    });

    res.status(201).json({ data: savedPost!.toJSON() });
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

    const post = await findByIdOrThrow(
      postRepo,
      id,
      'This book listing could not be found. It may have been removed or archived.',
      'POST_NOT_FOUND'
    );

    requireOwnership(post.userId, req.user!.id, req.user!.role, {
      allowAdmin: true,
      errorMessage: 'You can only edit your own book listings. This listing belongs to another user.',
      errorCode: 'NOT_POST_OWNER',
    });

    // Handle status change to archived (given/exchanged)
    const wasActive = post.status === 'active' || post.status === 'agreed_upon';
    const becomingArchived = req.body.status === 'archived' && wasActive;

    // Apply updates
    if (req.body.notes !== undefined) post.notes = req.body.notes;
    if (req.body.status !== undefined) post.status = req.body.status;
    if (req.body.agreedExchange !== undefined) post.agreedExchange = req.body.agreedExchange;
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

      // Increment book sharing counter
      const book = await getBookById(post.bookId);
      if (book) {
        await incrementBookCounter(book, post.type);
      }
    }

    // Reload with book relation for response
    const updatedPost = await postRepo.findOne({
      where: { id: post.id },
      relations: ['book', 'user'],
    });

    res.json({ data: updatedPost!.toJSON() });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/posts/:id - Delete post
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const postRepo = AppDataSource.getRepository(Post);

    const post = await findByIdOrThrow(
      postRepo,
      id,
      'This book listing could not be found. It may have already been deleted.',
      'POST_NOT_FOUND'
    );

    requireOwnership(post.userId, req.user!.id, req.user!.role, {
      allowAdmin: true,
      errorMessage: 'You can only delete your own book listings. This listing belongs to another user.',
      errorCode: 'NOT_POST_OWNER',
    });

    await postRepo.remove(post);
    res.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
