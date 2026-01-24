/**
 * API Service - Backend API calls for all data operations
 */

import type {
  User,
  Post,
  MessageThread,
  Message,
  Neighborhood,
  Block,
  Notification,
  Interest,
  InterestSummary,
  CreatePostInput,
} from "@booksharepdx/shared";
import { apiClient, ApiError } from "./apiClient";
import { neighborhoods } from "../data/neighborhoods";

// Authentication Service
export const authService = {
  // Returns User if direct login (dev mode), or success message if email sent
  sendMagicLink: async (
    identifier: string,
  ): Promise<User | { success: boolean; message: string }> => {
    const response = await apiClient.post<{
      data: User | { success: boolean; message: string };
    }>("/auth/send-magic-link", { identifier });
    return response.data;
  },

  // Returns User if direct login (dev mode), or success message if email verification required
  signup: async (data: {
    email: string;
    username: string;
    preferredName?: string;
    bio: string;
  }): Promise<
    User | { success: boolean; message: string; requiresVerification: boolean }
  > => {
    const response = await apiClient.post<{
      data:
        | User
        | { success: boolean; message: string; requiresVerification: boolean };
    }>("/auth/signup", data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout", {});
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const response = await apiClient.get<{ data: User }>("/auth/me");
      return response.data;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) return null;
      throw error;
    }
  },

  updateCurrentUser: async (updates: Partial<User>): Promise<User> => {
    const response = await apiClient.put<{ data: User }>("/auth/me", updates);
    return response.data;
  },

  verifyMagicLink: async (token: string): Promise<User> => {
    const response = await apiClient.get<{ data: User }>(
      `/auth/verify-magic-link?token=${encodeURIComponent(token)}`,
    );
    return response.data;
  },
};

// User Service
export const userService = {
  getAll: async (): Promise<User[]> => {
    const response = await apiClient.get<{ data: User[] }>("/users");
    return response.data;
  },

  getById: async (id: string): Promise<User | null> => {
    try {
      const response = await apiClient.get<{ data: User }>(`/users/${id}`);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) return null;
      throw error;
    }
  },

  getByUsername: async (username: string | undefined): Promise<User | null> => {
    try {
      if (!username) return null;
      const response = await apiClient.get<{ data: User }>(
        `/users/username/${username}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) return null;
      throw error;
    }
  },

  update: async (id: string, updates: Partial<User>): Promise<User> => {
    const response = await apiClient.patch<{ data: User }>(
      `/users/${id}`,
      updates,
    );
    return response.data;
  },

  // Generic stat increment - pass stat names to increment
  incrementStats: async (
    userId: string,
    stats: Partial<Record<keyof User["stats"], number>>,
  ): Promise<User | null> => {
    const user = await userService.getById(userId);
    if (!user) return null;

    const updatedStats = { ...user.stats };
    for (const [key, amount] of Object.entries(stats)) {
      updatedStats[key as keyof User["stats"]] += amount;
    }

    return await userService.update(userId, { stats: updatedStats });
  },

  // Convenience methods
  incrementBooksGiven: (userId: string) =>
    userService.incrementStats(userId, { booksGiven: 1 }),
  incrementBooksReceived: (userId: string) =>
    userService.incrementStats(userId, { booksReceived: 1 }),
  incrementBooksTraded: (userId: string) =>
    userService.incrementStats(userId, { booksTraded: 1 }),
};

// Post Service
export const postService = {
  getAll: async (): Promise<Post[]> => {
    const response = await apiClient.get<{ data: Post[] }>("/posts");
    return response.data;
  },

  getById: async (id: string): Promise<Post | null> => {
    try {
      const response = await apiClient.get<{ data: Post }>(`/posts/${id}`);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) return null;
      throw error;
    }
  },

  getByUserId: async (
    userId: string,
    status?: "active" | "agreed_upon" | "archived",
  ): Promise<Post[]> => {
    const statusParam = status ? `&status=${status}` : "";
    const response = await apiClient.get<{ data: Post[] }>(
      `/posts?userId=${userId}${statusParam}`,
    );
    return response.data;
  },

  getActive: async (): Promise<Post[]> => {
    const response = await apiClient.get<{ data: Post[] }>(
      "/posts?status=active&limit=500",
    );
    return response.data;
  },

  create: async (post: CreatePostInput): Promise<Post> => {
    const response = await apiClient.post<{ data: Post }>("/posts", post);
    return response.data;
  },

  update: async (id: string, updates: Partial<Post>): Promise<Post> => {
    const response = await apiClient.patch<{ data: Post }>(
      `/posts/${id}`,
      updates,
    );
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/posts/${id}`);
  },
};

// Message Service
export const messageService = {
  getThreads: async (): Promise<MessageThread[]> => {
    const response = await apiClient.get<{ data: MessageThread[] }>(
      "/messages/threads",
    );
    return response.data;
  },

  getMessages: async (threadId: string): Promise<Message[]> => {
    const response = await apiClient.get<{ data: Message[] }>(
      `/messages/threads/${threadId}`,
    );
    return response.data;
  },

  sendMessage: async (params: {
    threadId: string;
    content: string;
    type?: "user" | "system" | "trade_proposal";
    systemMessageType?:
      | "exchange_proposed"
      | "exchange_completed"
      | "exchange_declined"
      | "exchange_cancelled"
      | "gift_completed";
    // Trade proposal fields (required when type is 'trade_proposal')
    offeredPostId?: string;
    requestedPostId?: string;
  }): Promise<Message> => {
    const response = await apiClient.post<{ data: Message }>(
      `/messages/threads/${params.threadId}/messages`,
      {
        content: params.content,
        type: params.type || "user",
        systemMessageType: params.systemMessageType,
        offeredPostId: params.offeredPostId,
        requestedPostId: params.requestedPostId,
      },
    );
    return response.data;
  },

  createThread: async (
    postId: string,
    recipientId: string,
  ): Promise<MessageThread> => {
    const response = await apiClient.post<{ data: MessageThread }>(
      "/messages/threads",
      {
        postId,
        recipientId,
      },
    );
    return response.data;
  },

  getOrCreateThread: async (
    currentUserId: string,
    otherUserId: string,
    postId: string,
  ): Promise<MessageThread> => {
    const threads = await messageService.getThreads();
    let thread = threads.find(
      (t) => t.postId === postId && t.participants.includes(otherUserId),
    );

    if (!thread) {
      thread = await messageService.createThread(postId, otherUserId);
    }

    return thread;
  },

  markAsRead: async (threadId: string): Promise<void> => {
    await apiClient.put(`/messages/threads/${threadId}/read`);
  },

  updateThreadStatus: async (
    threadId: string,
    status:
      | "declined_by_owner"
      | "cancelled_by_requester"
      | "dismissed"
      | "accepted",
    options?: { loanDueDate?: number; convertToGift?: boolean },
  ): Promise<MessageThread> => {
    const response = await apiClient.patch<{ data: MessageThread }>(
      `/messages/threads/${threadId}/status`,
      { status, ...options },
    );
    return response.data;
  },

  markComplete: async (
    threadId: string,
  ): Promise<MessageThread & { bothCompleted: boolean }> => {
    const response = await apiClient.post<{
      data: MessageThread & { bothCompleted: boolean };
    }>(`/messages/threads/${threadId}/complete`);
    return response.data;
  },

  confirmReturn: async (
    threadId: string,
    relistPost?: boolean,
  ): Promise<MessageThread & { bothConfirmedReturn: boolean }> => {
    const response = await apiClient.post<{
      data: MessageThread & { bothConfirmedReturn: boolean };
    }>(`/messages/threads/${threadId}/confirm-return`, { relistPost });
    return response.data;
  },

  respondToProposal: async (
    threadId: string,
    messageId: string,
    response: "accept" | "decline",
  ): Promise<{ proposalMessage: Message; thread: MessageThread }> => {
    const resp = await apiClient.post<{
      data: { proposalMessage: Message; thread: MessageThread };
    }>(`/messages/threads/${threadId}/respond-proposal`, {
      messageId,
      response,
    });
    return resp.data;
  },
};

// Block Service
export const blockService = {
  getBlocked: async (userId: string): Promise<string[]> => {
    const response = await apiClient.get<{ data: Block[] }>(
      `/blocks?blockerId=${userId}`,
    );
    return response.data.map((b) => b.blockedId);
  },

  block: async (blockerId: string, blockedId: string): Promise<void> => {
    await apiClient.post<{ data: Block }>("/blocks", {
      blockerId,
      blockedId,
    });
  },

  unblock: async (blockerId: string, blockedId: string): Promise<void> => {
    await apiClient.delete(`/blocks/${blockerId}/${blockedId}`);
  },

  isBlocked: async (userId1: string, userId2: string): Promise<boolean> => {
    try {
      const blocked = await blockService.getBlocked(userId1);
      if (blocked.includes(userId2)) return true;
      const blocked2 = await blockService.getBlocked(userId2);
      return blocked2.includes(userId1);
    } catch (error) {
      return false;
    }
  },
};

// Notification Service
export const notificationService = {
  getByUserId: async (userId: string): Promise<Notification[]> => {
    const response = await apiClient.get<{ data: Notification[] }>(
      `/notifications?userId=${userId}`,
    );
    return response.data;
  },

  create: async (
    notification: Omit<Notification, "id" | "timestamp" | "read">,
  ): Promise<Notification> => {
    const response = await apiClient.post<{ data: Notification }>(
      "/notifications",
      notification,
    );
    return response.data;
  },

  markAsRead: async (id: string): Promise<void> => {
    await apiClient.patch(`/notifications/${id}`, { read: true });
  },

  markAllAsRead: async (userId: string): Promise<void> => {
    await apiClient.post(`/notifications/mark-all-read`, { userId });
  },
};

// Neighborhood Service - uses static data for boundaries, API only for book counts
export const neighborhoodService = {
  getAll: (): Neighborhood[] => {
    return neighborhoods;
  },

  getById: (id: string): Neighborhood | null => {
    return neighborhoods.find((n) => n.id === id) || null;
  },

  getBookCounts: async (): Promise<Record<string, number>> => {
    try {
      const response = await apiClient.get<{ data: Record<string, number> }>(
        "/neighborhoods/book-counts",
      );
      return response.data;
    } catch (error) {
      // Return empty counts if API fails
      return {};
    }
  },
};

// Interest Service - tracks interest in shares
export const interestService = {
  // Get summary of active interest for the current user's shares
  getSummary: async (): Promise<InterestSummary> => {
    try {
      const response = await apiClient.get<{ data: InterestSummary }>(
        "/interests/summary",
      );
      return response.data;
    } catch {
      return { totalCount: 0, uniquePeople: 0, uniquePosts: 0, interests: [] };
    }
  },

  // Get active interests for a specific post
  getByPostId: async (postId: string): Promise<Interest[]> => {
    try {
      const response = await apiClient.get<{ data: Interest[] }>(
        `/interests/post/${postId}`,
      );
      return response.data;
    } catch {
      return [];
    }
  },

  // Create interest (called when someone messages about a post)
  create: async (postId: string): Promise<Interest> => {
    const response = await apiClient.post<{ data: Interest }>("/interests", {
      postId,
    });
    return response.data;
  },

  // Resolve interest (when exchange is completed or declined)
  resolve: async (interestId: string): Promise<Interest> => {
    const response = await apiClient.patch<{ data: Interest }>(
      `/interests/${interestId}`,
      { status: "resolved" },
    );
    return response.data;
  },
};

// Book Service - for book matching/deduplication
export const bookService = {
  // Find similar books for manual entry confirmation
  match: async (
    title: string,
    author: string,
  ): Promise<
    Array<{
      id: string;
      googleBooksId?: string;
      title: string;
      author: string;
      coverImage?: string;
      genre?: string;
      isbn?: string;
    }>
  > => {
    const params = new URLSearchParams();
    if (title) params.set("title", title);
    if (author) params.set("author", author);
    const response = await apiClient.get<{
      data: Array<{
        id: string;
        googleBooksId?: string;
        title: string;
        author: string;
        coverImage?: string;
        genre?: string;
        isbn?: string;
      }>;
    }>(`/books/match?${params.toString()}`);
    return response.data;
  },
};
