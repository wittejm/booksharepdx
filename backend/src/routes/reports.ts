import { Router } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../config/database.js';
import { Report } from '../entities/Report.js';
import { requireAuth } from '../middleware/auth.js';
import { requireModerator } from '../middleware/roleCheck.js';
import { validateBody } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const createReportSchema = z.object({
  reportedUserId: z.string().uuid().optional(),
  reportedPostId: z.string().uuid().optional(),
  reportedCommentId: z.string().uuid().optional(),
  reasons: z.array(z.enum(['spam', 'harassment', 'scam', 'inappropriate', 'other'])).min(1),
  details: z.string().optional(),
  includeMessageHistory: z.boolean().optional(),
});

const updateReportSchema = z.object({
  status: z.enum(['new', 'in_review', 'resolved']).optional(),
  claimedBy: z.string().uuid().optional().nullable(),
  resolution: z.object({
    action: z.enum(['dismissed', 'warned', 'content_removed', 'suspended', 'escalated']),
    moderatorId: z.string().uuid(),
    reason: z.string(),
    timestamp: z.number(),
  }).optional(),
});

// POST /api/reports - Create report
router.post('/', requireAuth, validateBody(createReportSchema), async (req, res, next) => {
  try {
    const reportRepo = AppDataSource.getRepository(Report);

    const report = reportRepo.create({
      reporterId: req.user!.id,
      reportedUserId: req.body.reportedUserId || null,
      reportedPostId: req.body.reportedPostId || null,
      reportedCommentId: req.body.reportedCommentId || null,
      reasons: req.body.reasons,
      details: req.body.details || null,
      includeMessageHistory: req.body.includeMessageHistory || false,
      status: 'new',
    });

    await reportRepo.save(report);
    res.status(201).json({ data: report.toJSON() });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports - List reports (moderators only)
router.get('/', requireAuth, requireModerator, async (req, res, next) => {
  try {
    const reportRepo = AppDataSource.getRepository(Report);
    const { status } = req.query;

    let query = reportRepo.createQueryBuilder('report')
      .leftJoinAndSelect('report.reporter', 'reporter')
      .leftJoinAndSelect('report.reportedUser', 'reportedUser')
      .orderBy('report.timestamp', 'DESC');

    if (status) {
      query = query.where('report.status = :status', { status });
    }

    const reports = await query.getMany();

    res.json({
      data: reports.map(r => ({
        ...r.toJSON(),
        reporter: r.reporter?.toJSON(),
        reportedUser: r.reportedUser?.toJSON(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/:id - Get report
router.get('/:id', requireAuth, requireModerator, async (req, res, next) => {
  try {
    const { id } = req.params;
    const reportRepo = AppDataSource.getRepository(Report);

    const report = await reportRepo.findOne({
      where: { id },
      relations: ['reporter', 'reportedUser'],
    });

    if (!report) {
      throw new AppError(
        'This report could not be found. It may have been deleted or resolved.',
        404,
        'REPORT_NOT_FOUND'
      );
    }

    res.json({
      data: {
        ...report.toJSON(),
        reporter: report.reporter?.toJSON(),
        reportedUser: report.reportedUser?.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/reports/:id - Update report
router.put('/:id', requireAuth, requireModerator, validateBody(updateReportSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const reportRepo = AppDataSource.getRepository(Report);

    const report = await reportRepo.findOne({ where: { id } });
    if (!report) {
      throw new AppError(
        'This report could not be found. It may have been deleted.',
        404,
        'REPORT_NOT_FOUND'
      );
    }

    if (req.body.status) report.status = req.body.status;
    if (req.body.claimedBy !== undefined) report.claimedBy = req.body.claimedBy;
    if (req.body.resolution) report.resolution = req.body.resolution;

    await reportRepo.save(report);
    res.json({ data: report.toJSON() });
  } catch (error) {
    next(error);
  }
});

export default router;
