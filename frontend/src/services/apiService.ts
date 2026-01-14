/**
 * API Service - Backend API calls for all data operations
 */

import type {
  User,
  Post,
  MessageThread,
  Message,
  Comment,
  Report,
  Vouch,
  Neighborhood,
  SavedPost,
  Block,
  ModerationAction,
  Notification,
} from '@booksharepdx/shared';
import { apiClient } from './apiClient';
import { neighborhoods } from '../data/neighborhoods';

// Authentication Service
export const authService = {
  // Returns User if direct login (dev mode), or success message if email sent
  sendMagicLink: async (identifier: string): Promise<User | { success: boolean; message: string }> => {
    const response = await apiClient.post<{ data: User | { success: boolean; message: string } }>(
      '/auth/send-magic-link',
      { identifier }
    );
    return response.data;
  },

  signup: async (data: { email: string; username: string; preferredName?: string; bio: string }): Promise<User> => {
    const response = await apiClient.post<{ data: User }>(
      '/auth/signup',
      data
    );
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout', {});
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const response = await apiClient.get<{ data: User }>('/auth/me');
      return response.data;
    } catch (error) {
      return null;
    }
  },

  updateCurrentUser: async (updates: Partial<User>): Promise<User> => {
    const response = await apiClient.put<{ data: User }>('/auth/me', updates);
    return response.data;
  },
};

// User Service
export const userService = {
  getAll: async (): Promise<User[]> => {
    const response = await apiClient.get<{ data: User[] }>('/users');
    return response.data;
  },

  getById: async (id: string): Promise<User | null> => {
    try {
      const response = await apiClient.get<{ data: User }>(`/users/${id}`);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  getByUsername: async (username: string): Promise<User | null> => {
    try {
      const response = await apiClient.get<{ data: User }>(`/users/username/${username}`);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  update: async (id: string, updates: Partial<User>): Promise<User | null> => {
    try {
      const response = await apiClient.patch<{ data: User }>(`/users/${id}`, updates);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  incrementBooksGiven: async (userId: string): Promise<User | null> => {
    const user = await userService.getById(userId);
    if (!user) return null;

    return await userService.update(userId, {
      stats: {
        ...user.stats,
        booksGiven: user.stats.booksGiven + 1,
      },
    });
  },

  incrementBooksReceived: async (userId: string): Promise<User | null> => {
    const user = await userService.getById(userId);
    if (!user) return null;

    return await userService.update(userId, {
      stats: {
        ...user.stats,
        booksReceived: user.stats.booksReceived + 1,
      },
    });
  },

  incrementExchangeStats: async (userId: string): Promise<User | null> => {
    const user = await userService.getById(userId);
    if (!user) return null;

    return await userService.update(userId, {
      stats: {
        ...user.stats,
        booksGiven: user.stats.booksGiven + 1,
        booksReceived: user.stats.booksReceived + 1,
      },
    });
  },
};

// Post Service
export const postService = {
  getAll: async (): Promise<Post[]> => {
    const response = await apiClient.get<{ data: Post[] }>('/posts');
    return response.data;
  },

  getById: async (id: string): Promise<Post | null> => {
    try {
      const response = await apiClient.get<{ data: Post }>(`/posts/${id}`);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  getByUserId: async (userId: string): Promise<Post[]> => {
    const response = await apiClient.get<{ data: Post[] }>(`/posts?userId=${userId}`);
    return response.data;
  },

  getActive: async (): Promise<Post[]> => {
    const response = await apiClient.get<{ data: Post[] }>('/posts?status=active');
    return response.data;
  },

  create: async (post: Omit<Post, 'id' | 'createdAt' | 'userId'>): Promise<Post> => {
    const response = await apiClient.post<{ data: Post }>('/posts', post);
    return response.data;
  },

  update: async (id: string, updates: Partial<Post>): Promise<Post | null> => {
    try {
      const response = await apiClient.patch<{ data: Post }>(`/posts/${id}`, updates);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/posts/${id}`);
      return true;
    } catch (error) {
      return false;
    }
  },
};

// Message Service
export const messageService = {
  getThreads: async (userId: string): Promise<MessageThread[]> => {
    const response = await apiClient.get<{ data: MessageThread[] }>(`/messages/threads?userId=${userId}`);
    return response.data;
  },

  getMessages: async (threadId: string): Promise<Message[]> => {
    const response = await apiClient.get<{ data: Message[] }>(`/messages/threads/${threadId}/messages`);
    return response.data;
  },

  sendMessage: async (message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> => {
    const response = await apiClient.post<{ data: Message }>('/messages', message);
    return response.data;
  },

  createThread: async (postId: string, participants: string[]): Promise<MessageThread> => {
    const response = await apiClient.post<{ data: MessageThread }>('/messages/threads', {
      postId,
      participants,
    });
    return response.data;
  },

  getOrCreateThread: async (currentUserId: string, otherUserId: string, postId: string): Promise<MessageThread> => {
    const threads = await messageService.getThreads(currentUserId);
    let thread = threads.find(
      t => t.postId === postId && t.participants.includes(otherUserId)
    );

    if (!thread) {
      thread = await messageService.createThread(postId, [currentUserId, otherUserId]);
    }

    return thread;
  },

  markAsRead: async (threadId: string, userId: string): Promise<void> => {
    await apiClient.post(`/messages/threads/${threadId}/read`, { userId });
  },
};

// Comment Service
export const commentService = {
  getByPostId: async (postId: string): Promise<Comment[]> => {
    try {
      const response = await apiClient.get<{ data: Comment[] }>(`/comments/post/${postId}`);
      return response.data;
    } catch {
      // Return empty array if comments not found or endpoint doesn't exist
      return [];
    }
  },

  getById: async (id: string): Promise<Comment | null> => {
    try {
      const response = await apiClient.get<{ data: Comment }>(`/comments/${id}`);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  create: async (comment: Omit<Comment, 'id' | 'timestamp'>): Promise<Comment> => {
    const response = await apiClient.post<{ data: Comment }>('/comments', comment);
    return response.data;
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/comments/${id}`);
      return true;
    } catch (error) {
      return false;
    }
  },
};

// Block Service
export const blockService = {
  getBlocked: async (userId: string): Promise<string[]> => {
    const response = await apiClient.get<{ data: Block[] }>(`/blocks?blockerId=${userId}`);
    return response.data.map(b => b.blockedId);
  },

  block: async (blockerId: string, blockedId: string): Promise<void> => {
    await apiClient.post<{ data: Block }>('/blocks', {
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

// Report Service
export const reportService = {
  create: async (report: Omit<Report, 'id' | 'timestamp' | 'status'>): Promise<Report> => {
    const response = await apiClient.post<{ data: Report }>('/reports', report);
    return response.data;
  },

  getAll: async (): Promise<Report[]> => {
    const response = await apiClient.get<{ data: Report[] }>('/reports');
    return response.data;
  },

  getById: async (id: string): Promise<Report | null> => {
    try {
      const response = await apiClient.get<{ data: Report }>(`/reports/${id}`);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  update: async (id: string, updates: Partial<Report>): Promise<Report | null> => {
    try {
      const response = await apiClient.patch<{ data: Report }>(`/reports/${id}`, updates);
      return response.data;
    } catch (error) {
      return null;
    }
  },
};

// Vouch Service
export const vouchService = {
  getForUser: async (userId: string): Promise<Vouch[]> => {
    const response = await apiClient.get<{ data: Vouch[] }>(`/vouches?userId=${userId}`);
    return response.data;
  },

  create: async (user1Id: string, user2Id: string): Promise<Vouch> => {
    const response = await apiClient.post<{ data: Vouch }>('/vouches', {
      user1Id,
      user2Id,
    });
    return response.data;
  },

  confirmMutual: async (vouchId: string): Promise<Vouch | null> => {
    try {
      const response = await apiClient.patch<{ data: Vouch }>(`/vouches/${vouchId}`, { mutuallyConfirmed: true });
      return response.data;
    } catch (error) {
      return null;
    }
  },
};

// Notification Service
export const notificationService = {
  getByUserId: async (userId: string): Promise<Notification[]> => {
    const response = await apiClient.get<{ data: Notification[] }>(`/notifications?userId=${userId}`);
    return response.data;
  },

  create: async (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<Notification> => {
    const response = await apiClient.post<{ data: Notification }>('/notifications', notification);
    return response.data;
  },

  markAsRead: async (id: string): Promise<void> => {
    await apiClient.patch(`/notifications/${id}`, { read: true });
  },

  markAllAsRead: async (userId: string): Promise<void> => {
    await apiClient.post(`/notifications/mark-all-read`, { userId });
  },
};

// Saved Post Service
export const savedPostService = {
  save: async (userId: string, postId: string, expressedInterest: boolean = false): Promise<SavedPost> => {
    const response = await apiClient.post<{ data: SavedPost }>('/saved-posts', {
      userId,
      postId,
      expressedInterest,
    });
    return response.data;
  },

  unsave: async (userId: string, postId: string): Promise<void> => {
    await apiClient.delete(`/saved-posts/${userId}/${postId}`);
  },

  getByUserId: async (userId: string): Promise<SavedPost[]> => {
    const response = await apiClient.get<{ data: SavedPost[] }>(`/saved-posts?userId=${userId}`);
    return response.data;
  },
};

// Neighborhood Service - uses static data for boundaries, API only for book counts
export const neighborhoodService = {
  getAll: (): Neighborhood[] => {
    return neighborhoods;
  },

  getById: (id: string): Neighborhood | null => {
    return neighborhoods.find(n => n.id === id) || null;
  },

  getBookCounts: async (): Promise<Record<string, number>> => {
    try {
      const response = await apiClient.get<{ data: Record<string, number> }>('/neighborhoods/book-counts');
      return response.data;
    } catch (error) {
      // Return empty counts if API fails
      return {};
    }
  },
};

// Moderation Action Service
export const moderationActionService = {
  getAll: async (): Promise<ModerationAction[]> => {
    const response = await apiClient.get<{ data: ModerationAction[] }>('/moderation/actions');
    return response.data;
  },

  create: async (action: Omit<ModerationAction, 'id' | 'timestamp'>): Promise<ModerationAction> => {
    const response = await apiClient.post<{ data: ModerationAction }>('/moderation/actions', action);
    return response.data;
  },

  getByUserId: async (userId: string): Promise<ModerationAction[]> => {
    const response = await apiClient.get<{ data: ModerationAction[] }>(`/moderation/actions?targetUserId=${userId}`);
    return response.data;
  },

  getByModeratorId: async (moderatorId: string): Promise<ModerationAction[]> => {
    const response = await apiClient.get<{ data: ModerationAction[] }>(`/moderation/actions?moderatorId=${moderatorId}`);
    return response.data;
  },
};
