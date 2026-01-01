import type {
  User,
  Post,
  Message,
  MessageThread,
  Comment,
  Block,
  Report,
  ModerationAction,
  Vouch,
  Notification,
  SavedPost,
  Neighborhood,
} from '@booksharepdx/shared';
import { getDemoData } from '../data/demoData';

const USE_DEMO_DATA = import.meta.env.VITE_USE_DEMO_DATA === 'true';

// LocalStorage keys
const KEYS = {
  USERS: 'booksharepdx_users',
  POSTS: 'booksharepdx_posts',
  MESSAGES: 'booksharepdx_messages',
  MESSAGE_THREADS: 'booksharepdx_message_threads',
  COMMENTS: 'booksharepdx_comments',
  BLOCKS: 'booksharepdx_blocks',
  REPORTS: 'booksharepdx_reports',
  MODERATION_ACTIONS: 'booksharepdx_moderation_actions',
  VOUCHES: 'booksharepdx_vouches',
  NOTIFICATIONS: 'booksharepdx_notifications',
  SAVED_POSTS: 'booksharepdx_saved_posts',
  CURRENT_USER: 'booksharepdx_current_user',
};

// Initialize demo data in localStorage if not exists
function initDemoData() {
  if (!USE_DEMO_DATA) return;

  const demoData = getDemoData();

  if (!localStorage.getItem(KEYS.USERS)) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(demoData.users));
  }
  if (!localStorage.getItem(KEYS.POSTS)) {
    localStorage.setItem(KEYS.POSTS, JSON.stringify(demoData.posts));
  }
  if (!localStorage.getItem(KEYS.MESSAGES)) {
    localStorage.setItem(KEYS.MESSAGES, JSON.stringify(demoData.messages));
  }
  if (!localStorage.getItem(KEYS.MESSAGE_THREADS)) {
    localStorage.setItem(KEYS.MESSAGE_THREADS, JSON.stringify(demoData.messageThreads));
  }
  if (!localStorage.getItem(KEYS.COMMENTS)) {
    localStorage.setItem(KEYS.COMMENTS, JSON.stringify(demoData.comments));
  }
  if (!localStorage.getItem(KEYS.VOUCHES)) {
    localStorage.setItem(KEYS.VOUCHES, JSON.stringify(demoData.vouches));
  }
  if (!localStorage.getItem(KEYS.BLOCKS)) {
    localStorage.setItem(KEYS.BLOCKS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.REPORTS)) {
    localStorage.setItem(KEYS.REPORTS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.MODERATION_ACTIONS)) {
    localStorage.setItem(KEYS.MODERATION_ACTIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.NOTIFICATIONS)) {
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.SAVED_POSTS)) {
    localStorage.setItem(KEYS.SAVED_POSTS, JSON.stringify([]));
  }
}

// Initialize on module load
initDemoData();

// Generic localStorage helpers
function getFromStorage<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function saveToStorage<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Authentication Service
export const authService = {
  login: async (email: string, password: string): Promise<User | null> => {
    const users = getFromStorage<User>(KEYS.USERS);
    const user = users.find(u => u.email === email);

    // In demo mode, any password works for demo users
    if (user && !user.banned) {
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    }
    return null;
  },

  signup: async (data: {
    email: string;
    password: string;
    username: string;
    bio: string;
  }): Promise<User> => {
    const users = getFromStorage<User>(KEYS.USERS);

    const newUser: User = {
      id: generateId(),
      email: data.email,
      username: data.username,
      bio: data.bio,
      verified: true, // Spoofed verification
      createdAt: Date.now(),
      location: { type: 'neighborhood', neighborhoodId: 'pearl-district' }, // Default
      stats: { booksGiven: 0, booksReceived: 0, bookshares: 0 },
      role: 'user',
    };

    users.push(newUser);
    saveToStorage(KEYS.USERS, users);
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(newUser));

    return newUser;
  },

  logout: () => {
    localStorage.removeItem(KEYS.CURRENT_USER);
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  updateCurrentUser: (updates: Partial<User>) => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return null;

    const updatedUser = { ...currentUser, ...updates };
    localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(updatedUser));

    // Also update in users array
    const users = getFromStorage<User>(KEYS.USERS);
    const index = users.findIndex(u => u.id === currentUser.id);
    if (index !== -1) {
      users[index] = updatedUser;
      saveToStorage(KEYS.USERS, users);
    }

    return updatedUser;
  },
};

// User Service
export const userService = {
  getAll: async (): Promise<User[]> => {
    return getFromStorage<User>(KEYS.USERS);
  },

  getById: async (id: string): Promise<User | null> => {
    const users = getFromStorage<User>(KEYS.USERS);
    return users.find(u => u.id === id) || null;
  },

  getByUsername: async (username: string): Promise<User | null> => {
    const users = getFromStorage<User>(KEYS.USERS);
    return users.find(u => u.username === username) || null;
  },

  update: async (id: string, updates: Partial<User>): Promise<User | null> => {
    const users = getFromStorage<User>(KEYS.USERS);
    const index = users.findIndex(u => u.id === id);

    if (index === -1) return null;

    users[index] = { ...users[index], ...updates };
    saveToStorage(KEYS.USERS, users);

    return users[index];
  },
};

// Post Service
export const postService = {
  getAll: async (): Promise<Post[]> => {
    return getFromStorage<Post>(KEYS.POSTS);
  },

  getById: async (id: string): Promise<Post | null> => {
    const posts = getFromStorage<Post>(KEYS.POSTS);
    return posts.find(p => p.id === id) || null;
  },

  getByUserId: async (userId: string): Promise<Post[]> => {
    const posts = getFromStorage<Post>(KEYS.POSTS);
    return posts.filter(p => p.userId === userId);
  },

  getActive: async (): Promise<Post[]> => {
    const posts = getFromStorage<Post>(KEYS.POSTS);
    return posts.filter(p => p.status === 'active');
  },

  create: async (post: Omit<Post, 'id' | 'createdAt'>): Promise<Post> => {
    const posts = getFromStorage<Post>(KEYS.POSTS);

    const newPost: Post = {
      ...post,
      id: generateId(),
      createdAt: Date.now(),
    };

    posts.push(newPost);
    saveToStorage(KEYS.POSTS, posts);

    return newPost;
  },

  update: async (id: string, updates: Partial<Post>): Promise<Post | null> => {
    const posts = getFromStorage<Post>(KEYS.POSTS);
    const index = posts.findIndex(p => p.id === id);

    if (index === -1) return null;

    posts[index] = { ...posts[index], ...updates };
    saveToStorage(KEYS.POSTS, posts);

    return posts[index];
  },

  delete: async (id: string): Promise<boolean> => {
    const posts = getFromStorage<Post>(KEYS.POSTS);
    const filtered = posts.filter(p => p.id !== id);

    if (filtered.length === posts.length) return false;

    saveToStorage(KEYS.POSTS, filtered);
    return true;
  },
};

// Message Service
export const messageService = {
  getThreads: async (userId: string): Promise<MessageThread[]> => {
    const threads = getFromStorage<MessageThread>(KEYS.MESSAGE_THREADS);
    return threads.filter(t => t.participants.includes(userId));
  },

  getMessages: async (threadId: string): Promise<Message[]> => {
    const messages = getFromStorage<Message>(KEYS.MESSAGES);
    return messages.filter(m => m.threadId === threadId);
  },

  sendMessage: async (message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> => {
    const messages = getFromStorage<Message>(KEYS.MESSAGES);
    const threads = getFromStorage<MessageThread>(KEYS.MESSAGE_THREADS);

    const newMessage: Message = {
      ...message,
      id: generateId(),
      timestamp: Date.now(),
    };

    messages.push(newMessage);
    saveToStorage(KEYS.MESSAGES, messages);

    // Update thread lastMessageAt and unread counts
    const threadIndex = threads.findIndex(t => t.id === message.threadId);
    if (threadIndex !== -1) {
      threads[threadIndex].lastMessageAt = newMessage.timestamp;
      // Increment unread for other participant
      const otherParticipant = threads[threadIndex].participants.find(p => p !== message.senderId);
      if (otherParticipant) {
        threads[threadIndex].unreadCount[otherParticipant] =
          (threads[threadIndex].unreadCount[otherParticipant] || 0) + 1;
      }
      saveToStorage(KEYS.MESSAGE_THREADS, threads);
    }

    return newMessage;
  },

  createThread: async (postId: string, participants: string[]): Promise<MessageThread> => {
    const threads = getFromStorage<MessageThread>(KEYS.MESSAGE_THREADS);

    // Check if thread already exists
    const existing = threads.find(t =>
      t.postId === postId &&
      t.participants.sort().join(',') === participants.sort().join(',')
    );

    if (existing) return existing;

    const newThread: MessageThread = {
      id: generateId(),
      postId,
      participants,
      lastMessageAt: Date.now(),
      unreadCount: {},
    };

    threads.push(newThread);
    saveToStorage(KEYS.MESSAGE_THREADS, threads);

    return newThread;
  },

  markAsRead: async (threadId: string, userId: string): Promise<void> => {
    const threads = getFromStorage<MessageThread>(KEYS.MESSAGE_THREADS);
    const thread = threads.find(t => t.id === threadId);

    if (thread) {
      thread.unreadCount[userId] = 0;
      saveToStorage(KEYS.MESSAGE_THREADS, threads);
    }
  },
};

// Comment Service
export const commentService = {
  getByPostId: async (postId: string): Promise<Comment[]> => {
    const comments = getFromStorage<Comment>(KEYS.COMMENTS);
    return comments.filter(c => c.postId === postId);
  },

  getById: async (id: string): Promise<Comment | null> => {
    const comments = getFromStorage<Comment>(KEYS.COMMENTS);
    return comments.find(c => c.id === id) || null;
  },

  create: async (comment: Omit<Comment, 'id' | 'timestamp'>): Promise<Comment> => {
    const comments = getFromStorage<Comment>(KEYS.COMMENTS);

    const newComment: Comment = {
      ...comment,
      id: generateId(),
      timestamp: Date.now(),
    };

    comments.push(newComment);
    saveToStorage(KEYS.COMMENTS, comments);

    return newComment;
  },

  delete: async (id: string): Promise<boolean> => {
    const comments = getFromStorage<Comment>(KEYS.COMMENTS);
    const filtered = comments.filter(c => c.id !== id);

    if (filtered.length === comments.length) return false;

    saveToStorage(KEYS.COMMENTS, filtered);
    return true;
  },
};

// Block Service
export const blockService = {
  getBlocked: async (userId: string): Promise<string[]> => {
    const blocks = getFromStorage<Block>(KEYS.BLOCKS);
    return blocks.filter(b => b.blockerId === userId).map(b => b.blockedId);
  },

  block: async (blockerId: string, blockedId: string): Promise<void> => {
    const blocks = getFromStorage<Block>(KEYS.BLOCKS);

    if (!blocks.find(b => b.blockerId === blockerId && b.blockedId === blockedId)) {
      blocks.push({ blockerId, blockedId, timestamp: Date.now() });
      saveToStorage(KEYS.BLOCKS, blocks);
    }
  },

  unblock: async (blockerId: string, blockedId: string): Promise<void> => {
    const blocks = getFromStorage<Block>(KEYS.BLOCKS);
    const filtered = blocks.filter(b => !(b.blockerId === blockerId && b.blockedId === blockedId));
    saveToStorage(KEYS.BLOCKS, filtered);
  },

  isBlocked: async (userId1: string, userId2: string): Promise<boolean> => {
    const blocks = getFromStorage<Block>(KEYS.BLOCKS);
    return blocks.some(b =>
      (b.blockerId === userId1 && b.blockedId === userId2) ||
      (b.blockerId === userId2 && b.blockedId === userId1)
    );
  },
};

// Report Service
export const reportService = {
  create: async (report: Omit<Report, 'id' | 'timestamp' | 'status'>): Promise<Report> => {
    const reports = getFromStorage<Report>(KEYS.REPORTS);

    const newReport: Report = {
      ...report,
      id: generateId(),
      timestamp: Date.now(),
      status: 'new',
    };

    reports.push(newReport);
    saveToStorage(KEYS.REPORTS, reports);

    return newReport;
  },

  getAll: async (): Promise<Report[]> => {
    return getFromStorage<Report>(KEYS.REPORTS);
  },

  getById: async (id: string): Promise<Report | null> => {
    const reports = getFromStorage<Report>(KEYS.REPORTS);
    return reports.find(r => r.id === id) || null;
  },

  update: async (id: string, updates: Partial<Report>): Promise<Report | null> => {
    const reports = getFromStorage<Report>(KEYS.REPORTS);
    const index = reports.findIndex(r => r.id === id);

    if (index === -1) return null;

    reports[index] = { ...reports[index], ...updates };
    saveToStorage(KEYS.REPORTS, reports);

    return reports[index];
  },
};

// Saved Post Service
export const savedPostService = {
  getByUserId: async (userId: string): Promise<SavedPost[]> => {
    const saved = getFromStorage<SavedPost>(KEYS.SAVED_POSTS);
    return saved.filter(s => s.userId === userId);
  },

  save: async (userId: string, postId: string, expressedInterest: boolean = false): Promise<void> => {
    const saved = getFromStorage<SavedPost>(KEYS.SAVED_POSTS);

    const existing = saved.find(s => s.userId === userId && s.postId === postId);
    if (!existing) {
      saved.push({ userId, postId, timestamp: Date.now(), expressedInterest });
      saveToStorage(KEYS.SAVED_POSTS, saved);
    }
  },

  unsave: async (userId: string, postId: string): Promise<void> => {
    const saved = getFromStorage<SavedPost>(KEYS.SAVED_POSTS);
    const filtered = saved.filter(s => !(s.userId === userId && s.postId === postId));
    saveToStorage(KEYS.SAVED_POSTS, filtered);
  },
};

// Vouch Service
export const vouchService = {
  getForUser: async (userId: string): Promise<Vouch[]> => {
    const vouches = getFromStorage<Vouch>(KEYS.VOUCHES);
    return vouches.filter(v => v.user1Id === userId || v.user2Id === userId);
  },

  create: async (user1Id: string, user2Id: string): Promise<Vouch> => {
    const vouches = getFromStorage<Vouch>(KEYS.VOUCHES);

    const newVouch: Vouch = {
      id: generateId(),
      user1Id,
      user2Id,
      timestamp: Date.now(),
      mutuallyConfirmed: false,
    };

    vouches.push(newVouch);
    saveToStorage(KEYS.VOUCHES, vouches);

    return newVouch;
  },

  confirmMutual: async (vouchId: string): Promise<Vouch | null> => {
    const vouches = getFromStorage<Vouch>(KEYS.VOUCHES);
    const index = vouches.findIndex(v => v.id === vouchId);

    if (index === -1) return null;

    vouches[index].mutuallyConfirmed = true;
    saveToStorage(KEYS.VOUCHES, vouches);

    return vouches[index];
  },
};

// Moderation Action Service
export const moderationActionService = {
  getAll: async (): Promise<ModerationAction[]> => {
    return getFromStorage<ModerationAction>(KEYS.MODERATION_ACTIONS);
  },

  create: async (action: Omit<ModerationAction, 'id' | 'timestamp'>): Promise<ModerationAction> => {
    const actions = getFromStorage<ModerationAction>(KEYS.MODERATION_ACTIONS);

    const newAction: ModerationAction = {
      ...action,
      id: generateId(),
      timestamp: Date.now(),
    };

    actions.push(newAction);
    saveToStorage(KEYS.MODERATION_ACTIONS, actions);

    return newAction;
  },

  getByUserId: async (userId: string): Promise<ModerationAction[]> => {
    const actions = getFromStorage<ModerationAction>(KEYS.MODERATION_ACTIONS);
    return actions.filter(a => a.targetUserId === userId);
  },

  getByModeratorId: async (moderatorId: string): Promise<ModerationAction[]> => {
    const actions = getFromStorage<ModerationAction>(KEYS.MODERATION_ACTIONS);
    return actions.filter(a => a.moderatorId === moderatorId);
  },
};

// Notification Service
export const notificationService = {
  getByUserId: async (userId: string): Promise<Notification[]> => {
    const notifications = getFromStorage<Notification>(KEYS.NOTIFICATIONS);
    return notifications.filter(n => n.userId === userId);
  },

  create: async (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<Notification> => {
    const notifications = getFromStorage<Notification>(KEYS.NOTIFICATIONS);

    const newNotification: Notification = {
      ...notification,
      id: generateId(),
      timestamp: Date.now(),
      read: false,
    };

    notifications.push(newNotification);
    saveToStorage(KEYS.NOTIFICATIONS, notifications);

    return newNotification;
  },

  markAsRead: async (id: string): Promise<void> => {
    const notifications = getFromStorage<Notification>(KEYS.NOTIFICATIONS);
    const notification = notifications.find(n => n.id === id);

    if (notification) {
      notification.read = true;
      saveToStorage(KEYS.NOTIFICATIONS, notifications);
    }
  },

  markAllAsRead: async (userId: string): Promise<void> => {
    const notifications = getFromStorage<Notification>(KEYS.NOTIFICATIONS);
    notifications
      .filter(n => n.userId === userId && !n.read)
      .forEach(n => n.read = true);
    saveToStorage(KEYS.NOTIFICATIONS, notifications);
  },
};

// Neighborhood Service
export const neighborhoodService = {
  getAll: (): Neighborhood[] => {
    return getDemoData().neighborhoods;
  },

  getById: (id: string): Neighborhood | null => {
    const neighborhoods = getDemoData().neighborhoods;
    return neighborhoods.find(n => n.id === id) || null;
  },
};

export const dataService = {
  auth: authService,
  user: userService,
  post: postService,
  message: messageService,
  comment: commentService,
  block: blockService,
  report: reportService,
  savedPost: savedPostService,
  vouch: vouchService,
  neighborhood: neighborhoodService,
  moderationAction: moderationActionService,
  notification: notificationService,
};
