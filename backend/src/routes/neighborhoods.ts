import { Router } from 'express';
import { AppDataSource } from '../config/database.js';
import { Neighborhood } from '../entities/Neighborhood.js';
import { Post } from '../entities/Post.js';
import { User } from '../entities/User.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/neighborhoods - Get all neighborhoods
router.get('/', async (req, res, next) => {
  try {
    const neighborhoodRepo = AppDataSource.getRepository(Neighborhood);
    const neighborhoods = await neighborhoodRepo.find({
      order: { name: 'ASC' },
    });

    res.json({ data: neighborhoods.map(n => n.toJSON()) });
  } catch (error) {
    next(error);
  }
});

// GET /api/neighborhoods/:id - Get neighborhood by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const neighborhoodRepo = AppDataSource.getRepository(Neighborhood);

    const neighborhood = await neighborhoodRepo.findOne({ where: { id } });
    if (!neighborhood) {
      throw new AppError('Neighborhood not found', 404, 'NOT_FOUND');
    }

    res.json({ data: neighborhood.toJSON() });
  } catch (error) {
    next(error);
  }
});

// GET /api/neighborhoods/book-counts - Get book counts per neighborhood
router.get('/stats/book-counts', async (req, res, next) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const postRepo = AppDataSource.getRepository(Post);

    // Get all active posts with their users
    const posts = await postRepo.find({
      where: { status: 'active' },
      relations: ['user'],
    });

    // Count posts per neighborhood
    const counts: Record<string, number> = {};

    for (const post of posts) {
      if (post.user?.locationType === 'neighborhood' && post.user?.neighborhoodId) {
        const neighborhoodId = post.user.neighborhoodId;
        counts[neighborhoodId] = (counts[neighborhoodId] || 0) + 1;
      }
    }

    res.json({ data: counts });
  } catch (error) {
    next(error);
  }
});

export default router;
