import { Router } from "express";
import authRoutes from "./auth.js";
import userRoutes from "./users.js";
import postRoutes from "./posts.js";
import messageRoutes from "./messages.js";
import blockRoutes from "./blocks.js";
import notificationRoutes from "./notifications.js";
import neighborhoodRoutes from "./neighborhoods.js";
import bookRoutes from "./books.js";
import uploadRoutes from "./uploads.js";
import interestRoutes from "./interests.js";
import feedbackRoutes from "./feedback.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/posts", postRoutes);
router.use("/messages", messageRoutes);
router.use("/blocks", blockRoutes);
router.use("/notifications", notificationRoutes);
router.use("/neighborhoods", neighborhoodRoutes);
router.use("/books", bookRoutes);
router.use("/uploads", uploadRoutes);
router.use("/interests", interestRoutes);
router.use("/feedback", feedbackRoutes);

export default router;
