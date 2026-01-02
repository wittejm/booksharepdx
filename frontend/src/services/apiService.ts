/**
 * API Service - Replaces dataService with real backend API calls
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

// Authentication Service
export const authService = {
  login: async (identifier: string, password: string): Promise<User> => {
    const response = await apiClient.post<{ data: User }>(
      '/auth/login',
      { identifier, password },
      false
    );
    return response.data;
  },

  signup: async (data: { email: string; password: string; username: string; bio: string }): Promise<User> => {
    const response = await apiClient.post<{ data: User }>(
      '/auth/signup',
      data,
      false
    );
    return response.data;
  },

  logout: () => {
    apiClient.post('/auth/logout', {}).catch(() => {});
    apiClient.clearAuthToken();
    localStorage.removeItem('currentUser');
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem('currentUser');
    return data ? JSON.parse(data) : null;
  },

  updateCurrentUser: async (updates: Partial<User>) => {
    const response = await apiClient.patch<{ data: User }>('/auth/me', updates);
    const updatedUser = response.data;
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    return updatedUser;
  },

  fetchCurrentUser: async (): Promise<User | null> => {
    try {
      const response = await apiClient.get<{ data: User }>('/auth/me');
      const user = response.data;
      localStorage.setItem('currentUser', JSON.stringify(user));
      return user;
    } catch (error) {
      return null;
    }
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
    const response = await apiClient.get<{ data: Comment[] }>(`/comments?postId=${postId}`);
    return response.data;
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
  block: async (blockerId: string, blockedId: string): Promise<Block> => {
    const response = await apiClient.post<{ data: Block }>('/blocks', {
      blockerId,
      blockedId,
    });
    return response.data;
  },

  unblock: async (blockerId: string, blockedId: string): Promise<void> => {
    await apiClient.delete(`/blocks/${blockerId}/${blockedId}`);
  },

  getBlockedUsers: async (userId: string): Promise<Block[]> => {
    const response = await apiClient.get<{ data: Block[] }>(`/blocks?blockerId=${userId}`);
    return response.data;
  },

  isBlocked: async (blockerId: string, blockedId: string): Promise<boolean> => {
    try {
      const blocks = await blockService.getBlockedUsers(blockerId);
      return blocks.some(b => b.blockedId === blockedId);
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
  create: async (user1Id: string, user2Id: string): Promise<Vouch> => {
    const response = await apiClient.post<{ data: Vouch }>('/vouches', {
      user1Id,
      user2Id,
    });
    return response.data;
  },

  getByUser: async (userId: string): Promise<Vouch[]> => {
    const response = await apiClient.get<{ data: Vouch[] }>(`/vouches?userId=${userId}`);
    return response.data;
  },

  getBetweenUsers: async (user1Id: string, user2Id: string): Promise<Vouch | null> => {
    try {
      const vouches = await vouchService.getByUser(user1Id);
      return vouches.find(v =>
        (v.user1Id === user2Id || v.user2Id === user2Id)
      ) || null;
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

// Neighborhood Service
export const neighborhoodService = {
  getAll: async (): Promise<Neighborhood[]> => {
    const response = await apiClient.get<{ data: Neighborhood[] }>('/neighborhoods', false);
    return response.data;
  },

  getById: async (id: string): Promise<Neighborhood | null> => {
    try {
      const response = await apiClient.get<{ data: Neighborhood }>(`/neighborhoods/${id}`, false);
      return response.data;
    } catch (error) {
      return null;
    }
  },

  getBookCounts: async (): Promise<Record<string, number>> => {
    const response = await apiClient.get<{ data: Record<string, number> }>('/neighborhoods/book-counts', false);
    return response.data;
  },
};

// Moderation Action Service
export const moderationActionService = {
  create: async (action: Omit<ModerationAction, 'id' | 'timestamp'>): Promise<ModerationAction> => {
    const response = await apiClient.post<{ data: ModerationAction }>('/moderation/actions', action);
    return response.data;
  },

  getByTargetUserId: async (targetUserId: string): Promise<ModerationAction[]> => {
    const response = await apiClient.get<{ data: ModerationAction[] }>(`/moderation/actions?targetUserId=${targetUserId}`);
    return response.data;
  },
};
