import { Router } from "express";
import { In } from "typeorm";
import { AppDataSource } from "../config/database.js";
import { MessageThread } from "../entities/MessageThread.js";
import { Message } from "../entities/Message.js";
import { Post } from "../entities/Post.js";
import { requireAuth } from "../middleware/auth.js";
import type { Interest, InterestSummary } from "@booksharepdx/shared";

const router = Router();

// Get interest summary for current user's shares
router.get("/summary", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;

    // Get all posts owned by current user
    const postRepo = AppDataSource.getRepository(Post);
    const myPosts = await postRepo.find({
      where: { userId },
      select: ["id"],
    });

    if (myPosts.length === 0) {
      return res.json({
        data: {
          totalCount: 0,
          uniquePeople: 0,
          uniquePosts: 0,
          interests: [],
        } as InterestSummary,
      });
    }

    const myPostIds = myPosts.map((p) => p.id);

    // Get all active message threads on my posts
    const threadRepo = AppDataSource.getRepository(MessageThread);
    const threads = await threadRepo
      .createQueryBuilder("thread")
      .where("thread.postId IN (:...postIds)", { postIds: myPostIds })
      .andWhere("thread.status = :status", { status: "active" })
      .getMany();

    // Transform threads to Interest objects
    const interests: Interest[] = threads.map((thread) => {
      const interestedUserId =
        thread.participants.find((p) => p !== userId) || "";
      return {
        id: thread.id,
        postId: thread.postId,
        interestedUserId,
        ownerId: userId,
        status: "active" as const,
        createdAt: thread.createdAt.getTime(),
      };
    });

    // Calculate summary
    const uniquePeople = new Set(interests.map((i) => i.interestedUserId)).size;
    const uniquePosts = new Set(interests.map((i) => i.postId)).size;

    const summary: InterestSummary = {
      totalCount: interests.length,
      uniquePeople,
      uniquePosts,
      interests,
    };

    res.json({ data: summary });
  } catch (error) {
    next(error);
  }
});

// Get interests for a specific post
router.get("/post/:postId", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { postId } = req.params;

    // Verify user owns this post
    const postRepo = AppDataSource.getRepository(Post);
    const post = await postRepo.findOne({ where: { id: postId, userId } });

    if (!post) {
      return res
        .status(404)
        .json({ error: "Post not found or not owned by you" });
    }

    // Get active threads for this post
    const threadRepo = AppDataSource.getRepository(MessageThread);
    const threads = await threadRepo.find({
      where: { postId, status: "active" },
    });

    // Check which threads have pending trade proposals
    const threadIds = threads.map((t) => t.id);
    const messageRepo = AppDataSource.getRepository(Message);
    const pendingProposals =
      threadIds.length > 0
        ? await messageRepo.find({
            where: {
              threadId: In(threadIds),
              type: "trade_proposal",
              proposalStatus: "pending",
            },
            select: ["threadId"],
          })
        : [];
    const threadsWithPendingProposal = new Set(
      pendingProposals.map((m) => m.threadId),
    );

    const interests: Interest[] = threads.map((thread) => {
      const interestedUserId =
        thread.participants.find((p) => p !== userId) || "";
      return {
        id: thread.id,
        postId: thread.postId,
        interestedUserId,
        ownerId: userId,
        status: "active" as const,
        createdAt: thread.createdAt.getTime(),
        hasPendingProposal: threadsWithPendingProposal.has(thread.id),
      };
    });

    res.json({ data: interests });
  } catch (error) {
    next(error);
  }
});

// Create interest - called when someone messages about a post (usually automatic)
router.post("/", requireAuth, async (req, res, next) => {
  try {
    // Interest is created implicitly when a thread is created
    // This endpoint exists for API completeness but may not be needed
    res
      .status(501)
      .json({
        error: "Interest is created automatically when messaging about a post",
      });
  } catch (error) {
    next(error);
  }
});

// Resolve interest - when exchange is completed or declined
router.patch("/:interestId", requireAuth, async (req, res, next) => {
  try {
    // Interest is resolved by changing the thread status
    // This endpoint exists for API completeness
    res
      .status(501)
      .json({ error: "Use thread status updates to resolve interest" });
  } catch (error) {
    next(error);
  }
});

export default router;
