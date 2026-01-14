// User Types
export interface User {
  id: string;
  email: string;
  username: string;
  preferredName?: string;
  bio: string;
  verified: boolean;
  createdAt: number;
  location: UserLocation;
  profilePicture?: string; // base64 or URL
  stats: UserStats;
  readingPreferences?: ReadingPreferences;
  socialLinks?: SocialLink[];
  role: 'user' | 'moderator' | 'admin';
  suspended?: {
    until: number;
    reason: string;
  };
  banned?: boolean;
}

export interface UserLocation {
  type: 'neighborhood' | 'pin';
  neighborhoodId?: string; // if type is 'neighborhood'
  lat?: number; // if type is 'pin'
  lng?: number; // if type is 'pin'
}

export interface UserStats {
  booksGiven: number;
  booksReceived: number;
  bookshares: number; // mutual vouches
}

export interface ReadingPreferences {
  favoriteGenres: string[];
  favoriteAuthors: string[];
  favoriteBooks?: BookInfo[]; // Books they own/love but not actively sharing
  lookingForBooks?: BookInfo[]; // Books they're looking for
  lookingForGenres?: string[]; // Genres they're interested in for exchanges
  lookingForAuthors?: string[]; // Authors they're interested in
}

export interface SocialLink {
  label: string;
  url: string;
}

// Post Types
export interface Post {
  id: string;
  userId: string;
  user?: User; // Included when fetching posts
  book: BookInfo;
  type: 'giveaway' | 'exchange';
  notes?: string;
  createdAt: number;
  status: 'active' | 'pending_exchange' | 'archived';
  pendingExchange?: PendingExchange;
  archivedAt?: number;
  givenTo?: string; // userId
  commentCount?: number; // Number of comments on this post
}

export interface BookInfo {
  title: string;
  author: string;
  coverImage?: string;
  genre: string;
  isbn?: string;
}

export interface PendingExchange {
  initiatorUserId: string;
  recipientUserId: string;
  givingPostId: string;
  receivingPostId: string;
  timestamp: number;
}

// Message Types
export interface MessageThread {
  id: string;
  postId: string;
  participants: string[]; // 2 userIds
  lastMessageAt: number;
  unreadCount: { [userId: string]: number };
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  timestamp: number;
  type: 'user' | 'system';
  systemMessageType?: 'exchange_proposed' | 'exchange_completed' | 'exchange_declined' | 'exchange_cancelled' | 'gift_completed';
}

// Comment Types
export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  timestamp: number;
}

// Block Types
export interface Block {
  blockerId: string;
  blockedId: string;
  timestamp: number;
}

// Report Types
export interface Report {
  id: string;
  reporterId: string;
  reportedUserId?: string;
  reportedPostId?: string;
  reportedCommentId?: string;
  reasons: ('spam' | 'harassment' | 'scam' | 'inappropriate' | 'other')[];
  details?: string;
  includeMessageHistory?: boolean;
  status: 'new' | 'in_review' | 'resolved';
  claimedBy?: string; // moderator userId
  timestamp: number;
  resolution?: {
    action: 'dismissed' | 'warned' | 'content_removed' | 'suspended' | 'escalated';
    moderatorId: string;
    reason: string;
    timestamp: number;
  };
}

// Moderation Types
export interface ModerationAction {
  id: string;
  moderatorId: string;
  targetUserId: string;
  action: 'warning' | 'content_removed' | 'suspended' | 'banned';
  reason: string;
  timestamp: number;
  targetContentId?: string; // post or comment id
  suspensionDuration?: number; // days
}

export interface ModeratorNote {
  reportId: string;
  moderatorId: string;
  note: string;
  timestamp: number;
}

// Vouching Types
export interface Vouch {
  id: string;
  user1Id: string;
  user2Id: string;
  timestamp: number;
  mutuallyConfirmed: boolean;
}

// Neighborhood Types
export interface Neighborhood {
  id: string;
  name: string;
  boundaries: GeoJSONPolygon;
  centroid: { lat: number; lng: number };
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][]; // [[[lng, lat], [lng, lat], ...]]
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'exchange_proposed' | 'exchange_confirmed' | 'exchange_declined' | 'message' | 'comment' | 'moderator_action';
  content: string;
  read: boolean;
  timestamp: number;
  relatedId?: string; // post, message, or report id
}

// Saved/Wishlist Types
export interface SavedPost {
  userId: string;
  postId: string;
  timestamp: number;
  expressedInterest: boolean; // true if they messaged/commented
}
