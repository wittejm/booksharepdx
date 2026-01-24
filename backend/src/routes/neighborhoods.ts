import { Router } from "express";
import { AppDataSource } from "../config/database.js";
import { Post } from "../entities/Post.js";

const router = Router();

// GET /api/neighborhoods/book-counts - Get active post counts per neighborhood
// This is the only neighborhoods endpoint - everything else is static frontend data
router.get("/book-counts", async (req, res, next) => {
  try {
    const postRepo = AppDataSource.getRepository(Post);

    // Get all active posts with their users
    const posts = await postRepo.find({
      where: { status: "active" },
      relations: ["user"],
    });

    // Count posts per neighborhood
    const counts: Record<string, number> = {};

    for (const post of posts) {
      if (
        post.user?.locationType === "neighborhood" &&
        post.user?.neighborhoodId
      ) {
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
