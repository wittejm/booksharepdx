import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validation.js";
import { sendFeedbackEmail } from "../services/emailService.js";

const router = Router();

const feedbackSchema = z.object({
  message: z.string().min(1).max(5000),
  pageUrl: z.string().optional(),
});

// POST /api/feedback - Send feedback email to hello@booksharepdx.com
router.post(
  "/",
  requireAuth,
  validateBody(feedbackSchema),
  async (req, res, next) => {
    try {
      const sent = await sendFeedbackEmail({
        message: req.body.message,
        userName: req.user!.username || req.user!.preferredName || "Unknown",
        userEmail: req.user!.email,
        userId: req.user!.id,
        pageUrl: req.body.pageUrl,
      });

      if (!sent) {
        res.status(500).json({
          error: {
            message: "Failed to send feedback email. Please try again later.",
            code: "EMAIL_SEND_FAILED",
          },
        });
        return;
      }

      res.json({ data: { success: true } });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
