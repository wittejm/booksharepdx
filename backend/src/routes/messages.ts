import { Router } from "express";
import { z } from "zod";
import { AppDataSource } from "../config/database.js";
import { MessageThread } from "../entities/MessageThread.js";
import { Message } from "../entities/Message.js";
import { Post } from "../entities/Post.js";
import { User } from "../entities/User.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validation.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  notifyBookRequested,
  notifyRequestDecision,
  notifyNewMessage,
  notifyTradeProposal,
} from "../services/notificationService.js";

const router = Router();

const createThreadSchema = z.object({
  postId: z.string().uuid(),
  recipientId: z.string().uuid(),
});

const sendMessageSchema = z
  .object({
    content: z.string().max(5000), // Allow empty for trade_proposal type
    type: z
      .enum(["user", "system", "trade_proposal"])
      .optional()
      .default("user"),
    systemMessageType: z
      .enum([
        "exchange_proposed",
        "exchange_completed",
        "exchange_declined",
        "exchange_cancelled",
        "gift_completed",
        "request_cancelled",
      ])
      .optional(),
    // Trade proposal fields (required when type is 'trade_proposal')
    offeredPostId: z.string().uuid().optional(),
    requestedPostId: z.string().uuid().optional(),
  })
  .refine(
    (data) => data.type === "trade_proposal" || data.content.length >= 1,
    {
      message: "Content is required for non-trade-proposal messages",
      path: ["content"],
    },
  );

// GET /api/messages/threads - Get user's message threads
router.get("/threads", requireAuth, async (req, res, next) => {
  try {
    const threadRepo = AppDataSource.getRepository(MessageThread);

    const threads = await threadRepo
      .createQueryBuilder("thread")
      .leftJoinAndSelect("thread.post", "post")
      .where("thread.participants @> :userId::jsonb", {
        userId: JSON.stringify([req.user!.id]),
      })
      .andWhere("thread.status != :cancelledStatus", {
        cancelledStatus: "cancelled_by_requester",
      })
      .orderBy("thread.lastMessageAt", "DESC")
      .getMany();

    res.json({
      data: threads.map((t) => ({
        ...t.toJSON(),
        post: t.post?.toJSON(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/messages/threads/:threadId - Get messages in thread
router.get("/threads/:threadId", requireAuth, async (req, res, next) => {
  try {
    const { threadId } = req.params;
    const threadRepo = AppDataSource.getRepository(MessageThread);
    const messageRepo = AppDataSource.getRepository(Message);

    // Verify user is participant
    const thread = await threadRepo.findOne({ where: { id: threadId } });
    if (!thread) {
      throw new AppError(
        "This conversation could not be found. It may have been deleted.",
        404,
        "THREAD_NOT_FOUND",
      );
    }
    if (!thread.participants.includes(req.user!.id)) {
      throw new AppError(
        "You do not have access to this conversation. Only participants can view messages.",
        403,
        "NOT_THREAD_PARTICIPANT",
      );
    }

    const messages = await messageRepo.find({
      where: { threadId },
      relations: ["sender"],
      order: { timestamp: "ASC" },
    });

    res.json({
      data: messages.map((m) => ({
        ...m.toJSON(),
        sender: m.sender?.toJSON(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/messages/threads - Create thread
router.post(
  "/threads",
  requireAuth,
  validateBody(createThreadSchema),
  async (req, res, next) => {
    try {
      const { postId, recipientId } = req.body;
      const threadRepo = AppDataSource.getRepository(MessageThread);
      const postRepo = AppDataSource.getRepository(Post);

      // Verify post exists
      const post = await postRepo.findOne({ where: { id: postId } });
      if (!post) {
        throw new AppError(
          "The book listing for this conversation could not be found. It may have been deleted.",
          404,
          "POST_NOT_FOUND",
        );
      }

      const participants = [req.user!.id, recipientId].sort();

      // Check if thread already exists
      const existing = await threadRepo
        .createQueryBuilder("thread")
        .where("thread.postId = :postId", { postId })
        .andWhere("thread.participants = :participants", {
          participants: JSON.stringify(participants),
        })
        .getOne();

      if (existing) {
        return res.json({ data: existing.toJSON() });
      }

      const thread = threadRepo.create({
        postId,
        participants,
        lastMessageAt: new Date(),
        unreadCount: {},
      });

      await threadRepo.save(thread);

      // Note: Don't send notification here - the first message will trigger the book_requested email

      res.status(201).json({ data: thread.toJSON() });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/messages/threads/:threadId/messages - Send message
router.post(
  "/threads/:threadId/messages",
  requireAuth,
  validateBody(sendMessageSchema),
  async (req, res, next) => {
    try {
      const { threadId } = req.params;
      const {
        content,
        type,
        systemMessageType,
        offeredPostId,
        requestedPostId,
      } = req.body;
      const threadRepo = AppDataSource.getRepository(MessageThread);
      const messageRepo = AppDataSource.getRepository(Message);

      const thread = await threadRepo.findOne({ where: { id: threadId } });
      if (!thread) {
        throw new AppError(
          "This conversation could not be found. It may have been deleted.",
          404,
          "THREAD_NOT_FOUND",
        );
      }
      if (!thread.participants.includes(req.user!.id)) {
        throw new AppError(
          "You cannot send messages in this conversation. Only participants can send messages.",
          403,
          "NOT_THREAD_PARTICIPANT",
        );
      }

      const message = messageRepo.create({
        threadId,
        senderId: req.user!.id,
        content,
        type,
        systemMessageType: systemMessageType || null,
        // Trade proposal fields
        offeredPostId: type === "trade_proposal" ? offeredPostId : null,
        requestedPostId: type === "trade_proposal" ? requestedPostId : null,
        proposalStatus: type === "trade_proposal" ? "pending" : null,
      });

      await messageRepo.save(message);

      // Update thread
      thread.lastMessageAt = message.timestamp;
      const otherParticipant = thread.participants.find(
        (p) => p !== req.user!.id,
      );
      if (otherParticipant) {
        thread.unreadCount[otherParticipant] =
          (thread.unreadCount[otherParticipant] || 0) + 1;
      }

      // Reopen thread if requester cancelled and is now messaging again (changed their mind)
      // Note: 'dismissed' should NOT reopen - that's when requester dismissed after owner declined
      if (thread.status === "cancelled_by_requester") {
        thread.status = "active";
      }

      await threadRepo.save(thread);

      // Send email notification to the other participant
      if (otherParticipant && (type === "user" || type === "trade_proposal")) {
        const userRepo = AppDataSource.getRepository(User);
        const postRepo = AppDataSource.getRepository(Post);
        const [recipient, post] = await Promise.all([
          userRepo.findOne({ where: { id: otherParticipant } }),
          postRepo.findOne({ where: { id: thread.postId } }),
        ]);

        if (recipient && post) {
          // Determine recipient's role based on post ownership
          const recipientRole: "sharer" | "requester" =
            otherParticipant === post.userId ? "sharer" : "requester";

          if (type === "trade_proposal" && offeredPostId) {
            // Trade proposal notification
            const offeredPost = await postRepo.findOne({
              where: { id: offeredPostId },
            });
            if (offeredPost) {
              notifyTradeProposal(
                recipient,
                req.user!,
                { title: offeredPost.book.title },
                { title: post.book.title },
                threadId,
                recipientRole,
              ).catch((err) =>
                console.error("[NOTIFY] Failed to send trade proposal email:", err),
              );
            }
          } else if (type === "user") {
            // Check if this is the first message (book request)
            const messageCount = await messageRepo.count({
              where: { threadId },
            });

            if (messageCount === 1) {
              // First message = book request notification (includes message content)
              notifyBookRequested(
                recipient,
                req.user!,
                post.book,
                post.type,
                content,
                threadId,
              ).catch((err) =>
                console.error("[NOTIFY] Failed to send book requested email:", err),
              );
            } else {
              // Subsequent messages (debounced in service)
              notifyNewMessage(
                recipient,
                req.user!,
                { title: post.book.title },
                post.type,
                content,
                threadId,
                recipientRole,
              ).catch((err) =>
                console.error("[NOTIFY] Failed to send new message email:", err),
              );
            }
          }
        }
      }

      res.status(201).json({ data: message.toJSON() });
    } catch (error) {
      next(error);
    }
  },
);

const updateStatusSchema = z.object({
  status: z.enum([
    "declined_by_owner",
    "cancelled_by_requester",
    "dismissed",
    "accepted",
  ]),
  loanDueDate: z.number().optional(), // timestamp for loan due date
  convertToGift: z.boolean().optional(), // if true, converts loan to gift
});

// PATCH /api/messages/threads/:threadId/status - Update thread status
router.patch(
  "/threads/:threadId/status",
  requireAuth,
  validateBody(updateStatusSchema),
  async (req, res, next) => {
    try {
      const { threadId } = req.params;
      const { status, loanDueDate, convertToGift } = req.body;
      const userId = req.user!.id;
      const threadRepo = AppDataSource.getRepository(MessageThread);
      const postRepo = AppDataSource.getRepository(Post);

      const thread = await threadRepo.findOne({
        where: { id: threadId },
        relations: ["post"],
      });

      if (!thread) {
        throw new AppError("Thread not found", 404, "THREAD_NOT_FOUND");
      }
      if (!thread.participants.includes(userId)) {
        throw new AppError("Not a participant", 403, "NOT_THREAD_PARTICIPANT");
      }

      const isOwner = thread.post?.userId === userId;
      const isRequester = !isOwner;

      // Validate status transition based on role
      if (status === "declined_by_owner" && !isOwner) {
        throw new AppError("Only the post owner can decline", 403, "NOT_OWNER");
      }
      if (status === "cancelled_by_requester" && !isRequester) {
        throw new AppError(
          "Only the requester can cancel",
          403,
          "NOT_REQUESTER",
        );
      }
      if (status === "accepted" && !isOwner) {
        throw new AppError("Only the post owner can accept", 403, "NOT_OWNER");
      }

      // Handle "give forever" for loans - convert to gift
      if (convertToGift && thread.post?.type === "loan") {
        await postRepo.update(thread.postId, { type: "giveaway" });
        thread.post.type = "giveaway";
      }

      // Update thread status
      thread.status = status;

      // Set loan due date if provided and it's a loan
      if (loanDueDate && thread.post?.type === "loan") {
        thread.loanDueDate = new Date(loanDueDate);
      }

      await threadRepo.save(thread);

      // Send system message for cancellation (so it persists in history even after re-requesting)
      if (status === "cancelled_by_requester") {
        const messageRepo = AppDataSource.getRepository(Message);
        const cancelMessage = messageRepo.create({
          threadId,
          senderId: userId,
          content: "Request cancelled",
          type: "system",
          systemMessageType: "request_cancelled",
        });
        await messageRepo.save(cancelMessage);
      }

      // If owner accepts this requester, mark other threads as given_to_other
      if (status === "accepted" && thread.post) {
        await threadRepo
          .createQueryBuilder()
          .update(MessageThread)
          .set({ status: "given_to_other" })
          .where("postId = :postId", { postId: thread.postId })
          .andWhere("id != :threadId", { threadId })
          .andWhere("status = :activeStatus", { activeStatus: "active" })
          .execute();

        // Update post status to pending
        await postRepo.update(thread.postId, { status: "agreed_upon" });
      }

      // Notify requester of owner's decision (accepted or declined)
      if (
        (status === "accepted" || status === "declined_by_owner") &&
        thread.post
      ) {
        const userRepo = AppDataSource.getRepository(User);
        const requesterId = thread.participants.find((p) => p !== userId);
        if (requesterId) {
          const requester = await userRepo.findOne({
            where: { id: requesterId },
          });
          if (requester) {
            notifyRequestDecision(
              requester,
              req.user!,
              { title: thread.post.book.title },
              status === "accepted" ? "accepted" : "declined",
              threadId,
            ).catch((err) =>
              console.error("[NOTIFY] Failed to send request decision email:", err),
            );
          }
        }
      }

      res.json({ data: thread.toJSON() });
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/messages/threads/:threadId/read - Mark thread as read
router.put("/threads/:threadId/read", requireAuth, async (req, res, next) => {
  try {
    const { threadId } = req.params;
    const threadRepo = AppDataSource.getRepository(MessageThread);

    const thread = await threadRepo.findOne({ where: { id: threadId } });
    if (!thread) {
      throw new AppError(
        "This conversation could not be found. It may have been deleted.",
        404,
        "THREAD_NOT_FOUND",
      );
    }
    if (!thread.participants.includes(req.user!.id)) {
      throw new AppError(
        "You do not have access to this conversation.",
        403,
        "NOT_THREAD_PARTICIPANT",
      );
    }

    thread.unreadCount[req.user!.id] = 0;
    await threadRepo.save(thread);

    res.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
});

const respondToProposalSchema = z.object({
  messageId: z.string().uuid(),
  response: z.enum(["accept", "decline"]),
});

// POST /api/messages/threads/:threadId/respond-proposal - Accept or decline a trade proposal
router.post(
  "/threads/:threadId/respond-proposal",
  requireAuth,
  validateBody(respondToProposalSchema),
  async (req, res, next) => {
    try {
      const { threadId } = req.params;
      const { messageId, response } = req.body;
      const userId = req.user!.id;
      const threadRepo = AppDataSource.getRepository(MessageThread);
      const messageRepo = AppDataSource.getRepository(Message);
      const postRepo = AppDataSource.getRepository(Post);

      const thread = await threadRepo.findOne({
        where: { id: threadId },
        relations: ["post"],
      });

      if (!thread) {
        throw new AppError("Thread not found", 404, "THREAD_NOT_FOUND");
      }
      if (!thread.participants.includes(userId)) {
        throw new AppError("Not a participant", 403, "NOT_THREAD_PARTICIPANT");
      }

      // Find the proposal message
      const proposalMessage = await messageRepo.findOne({
        where: { id: messageId, threadId, type: "trade_proposal" },
      });

      if (!proposalMessage) {
        throw new AppError(
          "Trade proposal not found",
          404,
          "PROPOSAL_NOT_FOUND",
        );
      }

      if (proposalMessage.proposalStatus !== "pending") {
        throw new AppError(
          "This proposal has already been responded to",
          400,
          "PROPOSAL_ALREADY_RESPONDED",
        );
      }

      // Only the recipient (not the sender) can respond
      if (proposalMessage.senderId === userId) {
        throw new AppError(
          "You cannot respond to your own proposal",
          403,
          "CANNOT_RESPOND_TO_OWN_PROPOSAL",
        );
      }

      if (response === "decline") {
        // Just mark as declined
        proposalMessage.proposalStatus = "declined";
        await messageRepo.save(proposalMessage);

        // Send system message
        const declineMessage = messageRepo.create({
          threadId,
          senderId: userId,
          content: "Exchange proposal declined.",
          type: "system",
          systemMessageType: "exchange_declined",
        });
        await messageRepo.save(declineMessage);

        res.json({
          data: {
            proposalMessage: proposalMessage.toJSON(),
            thread: thread.toJSON(),
          },
        });
        return;
      }

      // Accept the proposal
      proposalMessage.proposalStatus = "accepted";
      await messageRepo.save(proposalMessage);

      const offeredPostId = proposalMessage.offeredPostId!; // The proposer's book
      const requestedPostId = proposalMessage.requestedPostId!; // The book they want (the recipient's book)

      // Verify posts exist
      const offeredPost = await postRepo.findOne({
        where: { id: offeredPostId },
      });
      const requestedPost = await postRepo.findOne({
        where: { id: requestedPostId },
      });

      if (!offeredPost || !requestedPost) {
        throw new AppError(
          "One or both posts not found",
          404,
          "POST_NOT_FOUND",
        );
      }

      // Update both posts to agreed_upon with trade info
      // offeredPost is owned by the proposer (responder), requestedPost is owned by the accepter (sharer)
      const proposerId = thread.participants.find((p) => p !== userId)!;

      const exchangeDetails = {
        responderUserId: proposerId,
        sharerUserId: userId,
        responderPostId: offeredPostId,
        sharerPostId: requestedPostId,
        timestamp: Date.now(),
      };

      await postRepo.update(offeredPostId, {
        status: "agreed_upon",
        agreedExchange: exchangeDetails,
      });
      await postRepo.update(requestedPostId, {
        status: "agreed_upon",
        type: "exchange", // Ensure it's marked as exchange since it's part of a trade
        agreedExchange: exchangeDetails,
      });

      // Update thread to accepted
      thread.status = "accepted";
      await threadRepo.save(thread);

      // Mark other threads on both posts as given_to_other
      await threadRepo
        .createQueryBuilder()
        .update(MessageThread)
        .set({ status: "given_to_other" })
        .where("postId IN (:...postIds)", {
          postIds: [offeredPostId, requestedPostId],
        })
        .andWhere("id != :threadId", { threadId })
        .andWhere("status = :activeStatus", { activeStatus: "active" })
        .execute();

      // Send system message confirming trade
      const acceptMessage = messageRepo.create({
        threadId,
        senderId: userId,
        content: `Exchange accepted! Both books are now pending exchange. Coordinate the handoff via messages, then mark as complete.`,
        type: "system",
        systemMessageType: "exchange_proposed",
      });
      await messageRepo.save(acceptMessage);

      res.json({
        data: {
          proposalMessage: proposalMessage.toJSON(),
          thread: thread.toJSON(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/messages/threads/:threadId/complete - Mark gift/trade as completed by current user
router.post(
  "/threads/:threadId/complete",
  requireAuth,
  async (req, res, next) => {
    try {
      const { threadId } = req.params;
      const userId = req.user!.id;
      const threadRepo = AppDataSource.getRepository(MessageThread);
      const postRepo = AppDataSource.getRepository(Post);
      const messageRepo = AppDataSource.getRepository(Message);

      const thread = await threadRepo.findOne({
        where: { id: threadId },
        relations: ["post"],
      });

      if (!thread) {
        throw new AppError("Thread not found", 404, "THREAD_NOT_FOUND");
      }
      if (!thread.participants.includes(userId)) {
        throw new AppError("Not a participant", 403, "NOT_THREAD_PARTICIPANT");
      }
      if (thread.status !== "accepted") {
        throw new AppError(
          "Thread must be in accepted status to complete",
          400,
          "INVALID_STATUS",
        );
      }

      const isOwner = thread.post?.userId === userId;
      const postType = thread.post?.type;
      const ownerId = thread.post?.userId;
      const requesterId = thread.participants.find((p) => p !== ownerId)!;

      // Import User entity for stats update
      const { User } = await import("../entities/User.js");
      const userRepo = AppDataSource.getRepository(User);

      // Each user's completion is independent - update their flag and stats immediately
      if (isOwner && !thread.ownerCompleted) {
        thread.ownerCompleted = true;

        if (postType === "loan") {
          // For loans: transition to on_loan status
          thread.status = "on_loan";
        } else {
          // Record who received the book (status stays agreed_upon - each user's view depends on their own completion flag)
          await postRepo.update(thread.post!.id, {
            givenTo: requesterId,
          });

          // Update owner's stats
          if (postType === "exchange") {
            await userRepo.increment({ id: ownerId }, "booksTraded", 1);
          } else {
            await userRepo.increment({ id: ownerId }, "booksGiven", 1);
          }

          // Send system message
          const message = messageRepo.create({
            threadId,
            senderId: userId,
            content:
              postType === "exchange" ? "Trade completed!" : "Gift completed!",
            type: "system",
            systemMessageType:
              postType === "exchange" ? "exchange_completed" : "gift_completed",
          });
          await messageRepo.save(message);
        }
      } else if (!isOwner && !thread.requesterCompleted) {
        thread.requesterCompleted = true;

        // Update requester's stats (post may already be archived, that's fine)
        if (postType !== "loan") {
          if (postType === "exchange") {
            await userRepo.increment({ id: requesterId }, "booksTraded", 1);
          } else {
            await userRepo.increment({ id: requesterId }, "booksReceived", 1);
          }
        }
      }

      await threadRepo.save(thread);

      res.json({
        data: thread.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  },
);

const confirmReturnSchema = z.object({
  relistPost: z.boolean().optional(), // only for owner - if true, relist the book
});

// POST /api/messages/threads/:threadId/confirm-return - Confirm loan return
router.post(
  "/threads/:threadId/confirm-return",
  requireAuth,
  validateBody(confirmReturnSchema),
  async (req, res, next) => {
    try {
      const { threadId } = req.params;
      const { relistPost } = req.body;
      const userId = req.user!.id;
      const threadRepo = AppDataSource.getRepository(MessageThread);
      const postRepo = AppDataSource.getRepository(Post);

      const thread = await threadRepo.findOne({
        where: { id: threadId },
        relations: ["post"],
      });

      if (!thread) {
        throw new AppError("Thread not found", 404, "THREAD_NOT_FOUND");
      }
      if (!thread.participants.includes(userId)) {
        throw new AppError("Not a participant", 403, "NOT_THREAD_PARTICIPANT");
      }
      if (thread.status !== "on_loan") {
        throw new AppError(
          "Thread must be in on_loan status to confirm return",
          400,
          "INVALID_STATUS",
        );
      }

      const isOwner = thread.post?.userId === userId;

      // Update the appropriate return flag
      if (isOwner) {
        thread.ownerConfirmedReturn = true;
      } else {
        thread.requesterConfirmedReturn = true;
      }

      await threadRepo.save(thread);

      // Check if both parties have confirmed return
      if (
        thread.ownerConfirmedReturn &&
        thread.requesterConfirmedReturn &&
        thread.post
      ) {
        // Import User entity for stats update
        const { User } = await import("../entities/User.js");
        const userRepo = AppDataSource.getRepository(User);

        const ownerId = thread.post.userId;
        const borrowerId = thread.participants.find((p) => p !== ownerId)!;

        // Update stats
        await userRepo.increment({ id: ownerId }, "booksLoaned", 1);
        await userRepo.increment({ id: borrowerId }, "booksBorrowed", 1);

        // Handle post status based on owner's choice
        if (relistPost) {
          // Relist the book
          await postRepo.update(thread.post.id, {
            status: "active",
          });
        } else {
          // Archive the post
          await postRepo.update(thread.post.id, {
            status: "archived",
            archivedAt: new Date(),
          });
        }

        // Reset thread to allow future loans (or mark as complete)
        thread.status = "dismissed"; // Mark as dismissed/complete
        await threadRepo.save(thread);

        // Send system message
        const messageRepo = AppDataSource.getRepository(Message);
        const message = messageRepo.create({
          threadId,
          senderId: userId,
          content: relistPost
            ? "Book returned and relisted! The loan is complete."
            : "Book returned! The loan is complete.",
          type: "system",
          systemMessageType: "gift_completed", // Reuse for now
        });
        await messageRepo.save(message);
      }

      res.json({
        data: {
          ...thread.toJSON(),
          bothConfirmedReturn:
            thread.ownerConfirmedReturn && thread.requesterConfirmedReturn,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
