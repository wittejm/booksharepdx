// User Types
export interface User {
  id: string;
  email: string;
  username: string;
  preferredName?: string | null;
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
  emailNotifications?: EmailNotificationPreferences;
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
  booksLoaned: number;
  booksBorrowed: number;
  booksTraded: number;
  bookshares: number; // total of all transactions
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

// Email notification preferences (null/undefined fields = enabled)
export interface EmailNotificationPreferences {
  bookRequested?: boolean;
  requestDecision?: boolean;
  newMessage?: boolean;
  tradeProposal?: boolean;
}

// Post Types
export interface Post {
  id: string;
  userId: string;
  user?: User; // Included when fetching posts
  book: Book;  // Full book entity with id
  type: 'giveaway' | 'exchange' | 'loan';
  createdAt: number;
  status: 'active' | 'agreed_upon' | 'archived';
  agreedExchange?: AgreedExchange;
  archivedAt?: number;
  givenTo?: string; // userId
  loanDuration?: number; // in days: 30, 60, or 90 (only for loan posts)
}

// BookInfo - used for embedded book data (e.g., ReadingPreferences)
export interface BookInfo {
  title: string;
  author: string;
  coverImage?: string;
  genre?: string;
  isbn?: string;
}

// Book - full book entity with id and tracking (used in Post)
export interface Book {
  id: string;
  googleBooksId?: string;
  title: string;
  author: string;
  coverImage?: string;
  genre?: string;
  isbn?: string;
  timesGifted: number;
  timesTraded: number;
  timesLoaned: number;
}

// For creating posts (book data without id)
export interface BookInput {
  googleBooksId?: string;
  title: string;
  author: string;
  coverImage?: string;
  genre?: string;
  isbn?: string;
}

// Input type for creating a post (book without id)
export interface CreatePostInput {
  book: BookInput;
  type: 'giveaway' | 'exchange' | 'loan';
  loanDuration?: number;
}

export interface AgreedExchange {
  responderUserId: string;   // User who responded to the share and proposed the exchange
  sharerUserId: string;      // Original post owner who accepted
  responderPostId: string;   // Responder's post (what they're offering in a trade)
  sharerPostId: string;      // Sharer's post (the original share)
  timestamp?: number;
}

// Message Types
export interface MessageThread {
  id: string;
  postId: string;
  participants: string[]; // 2 userIds
  lastMessageAt: number;
  unreadCount: { [userId: string]: number };
  status: MessageThreadStatus;
  ownerCompleted: boolean;
  requesterCompleted: boolean;
  ownerConfirmedReturn: boolean;
  requesterConfirmedReturn: boolean;
  loanDueDate: number | null;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  timestamp: number;
  type: 'user' | 'system' | 'trade_proposal';
  systemMessageType?: 'exchange_proposed' | 'exchange_completed' | 'exchange_declined' | 'exchange_cancelled' | 'gift_completed' | 'request_cancelled';
  // Trade proposal fields (only for type: 'trade_proposal')
  offeredPostId?: string;    // The proposer's book
  requestedPostId?: string;  // The book they want
  proposalStatus?: 'pending' | 'accepted' | 'declined';
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
  type: 'exchange_proposed' | 'exchange_confirmed' | 'exchange_declined' | 'message' | 'moderator_action';
  content: string;
  read: boolean;
  timestamp: number;
  relatedId?: string; // post, message, or report id
}

// Interest Types - tracks when someone expresses interest in a share
export interface Interest {
  id: string;
  postId: string;
  interestedUserId: string;
  ownerId: string; // post owner
  status: 'active' | 'resolved';
  createdAt: number;
  resolvedAt?: number;
  hasPendingProposal?: boolean; // true if owner has proposed a trade to this person
}

// Summary of active interest for a user's shares
export interface InterestSummary {
  totalCount: number; // unique (person, post) pairs
  uniquePeople: number;
  uniquePosts: number;
  interests: Interest[];
}

// MessageThread Status (for request/completion flow)
export type MessageThreadStatus =
  | 'active'
  | 'declined_by_owner'
  | 'cancelled_by_requester'
  | 'post_removed'
  | 'dismissed'
  | 'given_to_other'
  | 'accepted'
  | 'on_loan';

// Geo Utilities
/**
 * Calculate the great-circle distance between two points using Haversine formula.
 * @returns Distance in miles
 */
export function calculateDistance(
  loc1: { lat: number; lng: number },
  loc2: { lat: number; lng: number }
): number {
  const R = 3959; // Earth's radius in miles
  const lat1 = (loc1.lat * Math.PI) / 180;
  const lat2 = (loc2.lat * Math.PI) / 180;
  const deltaLat = ((loc2.lat - loc1.lat) * Math.PI) / 180;
  const deltaLng = ((loc2.lng - loc1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Extract lat/lng coordinates from a UserLocation.
 * For neighborhoods, returns centroid. For pins, returns direct coords.
 * @throws Error if neighborhood is not found when location type is 'neighborhood'
 */
export function getLocationCoords(
  location: UserLocation,
  neighborhoods: Neighborhood[]
): { lat: number; lng: number } | null {
  if (location.type === 'pin') {
    if (location.lat !== undefined && location.lng !== undefined) {
      return { lat: location.lat, lng: location.lng };
    }
    return null;
  }

  if (location.type === 'neighborhood') {
    if (!location.neighborhoodId) {
      return null;
    }
    const neighborhood = neighborhoods.find((n) => n.id === location.neighborhoodId);
    if (!neighborhood) {
      throw new Error(`Neighborhood with id "${location.neighborhoodId}" not found`);
    }
    return { lat: neighborhood.centroid.lat, lng: neighborhood.centroid.lng };
  }

  return null;
}

/**
 * Format distance in miles to human-readable string.
 * @throws Error if distance is negative
 */
export function formatDistance(miles: number): string {
  if (miles < 0) {
    throw new Error('Distance cannot be negative');
  }
  const rounded = Math.round(miles * 10) / 10;
  return `${rounded} mi`;
}
