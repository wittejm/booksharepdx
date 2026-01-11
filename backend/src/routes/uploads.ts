import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { getStorage } from '../services/storage/index.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// Configure multer for memory storage (we'll process and save manually)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  },
});

// POST /api/uploads - Upload a file
router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError(
        'No file was provided. Please select an image file to upload.',
        400,
        'NO_FILE'
      );
    }

    const storage = getStorage();
    const url = await storage.upload(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.status(201).json({
      data: {
        url,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/uploads - Delete a file
router.delete('/', requireAuth, async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) {
      throw new AppError(
        'No file URL was provided. Please specify which file to delete.',
        400,
        'NO_URL'
      );
    }

    const storage = getStorage();
    await storage.delete(url);

    res.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
