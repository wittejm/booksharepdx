import { describe, it, expect } from 'vitest';
import { Post } from './Post.js';

describe('Post entity', () => {
  describe('toJSON', () => {
    it('should convert post to API response format', () => {
      const post = new Post();
      post.id = 'post-uuid';
      post.userId = 'user-uuid';
      post.book = {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        coverImage: 'https://example.com/cover.jpg',
        genre: 'fiction',
        isbn: '9780743273565',
      };
      post.type = 'giveaway';
      post.notes = 'Great condition, slight wear on cover';
      post.status = 'active';
      post.pendingExchange = null;
      post.archivedAt = null;
      post.givenTo = null;
      post.createdAt = new Date('2024-01-15T10:00:00Z');
      post.updatedAt = new Date('2024-01-15T10:00:00Z');

      const json = post.toJSON();

      expect(json.id).toBe('post-uuid');
      expect(json.userId).toBe('user-uuid');
      expect(json.book.title).toBe('The Great Gatsby');
      expect(json.book.author).toBe('F. Scott Fitzgerald');
      expect(json.book.genre).toBe('fiction');
      expect(json.type).toBe('giveaway');
      expect(json.notes).toBe('Great condition, slight wear on cover');
      expect(json.status).toBe('active');
    });

    it('should convert createdAt to timestamp', () => {
      const post = new Post();
      post.id = 'post-uuid';
      post.userId = 'user-uuid';
      post.book = { title: 'Test', author: 'Author', genre: 'fiction' };
      post.type = 'giveaway';
      post.notes = null;
      post.status = 'active';
      post.pendingExchange = null;
      post.archivedAt = null;
      post.givenTo = null;
      post.createdAt = new Date('2024-06-15T12:00:00Z');
      post.updatedAt = new Date();

      const json = post.toJSON();

      expect(typeof json.createdAt).toBe('number');
      expect(json.createdAt).toBe(new Date('2024-06-15T12:00:00Z').getTime());
    });

    it('should handle exchange type posts', () => {
      const post = new Post();
      post.id = 'post-uuid';
      post.userId = 'user-uuid';
      post.book = { title: 'Test', author: 'Author', genre: 'fiction' };
      post.type = 'exchange';
      post.notes = 'Looking for sci-fi books';
      post.status = 'active';
      post.pendingExchange = null;
      post.archivedAt = null;
      post.givenTo = null;
      post.createdAt = new Date();
      post.updatedAt = new Date();

      const json = post.toJSON();

      expect(json.type).toBe('exchange');
    });

    it('should handle pending exchange status', () => {
      const post = new Post();
      post.id = 'post-uuid';
      post.userId = 'user-uuid';
      post.book = { title: 'Test', author: 'Author', genre: 'fiction' };
      post.type = 'exchange';
      post.notes = null;
      post.status = 'pending_exchange';
      post.pendingExchange = {
        initiatorUserId: 'initiator-uuid',
        recipientUserId: 'recipient-uuid',
        givingPostId: 'post-uuid',
        receivingPostId: 'other-post-uuid',
        timestamp: Date.now(),
      };
      post.archivedAt = null;
      post.givenTo = null;
      post.createdAt = new Date();
      post.updatedAt = new Date();

      const json = post.toJSON();

      expect(json.status).toBe('pending_exchange');
      expect(json.pendingExchange).toBeDefined();
      expect(json.pendingExchange?.initiatorUserId).toBe('initiator-uuid');
    });

    it('should handle archived posts', () => {
      const archivedDate = new Date('2024-02-01T15:00:00Z');

      const post = new Post();
      post.id = 'post-uuid';
      post.userId = 'user-uuid';
      post.book = { title: 'Test', author: 'Author', genre: 'fiction' };
      post.type = 'giveaway';
      post.notes = null;
      post.status = 'archived';
      post.pendingExchange = null;
      post.archivedAt = archivedDate;
      post.givenTo = 'recipient-uuid';
      post.createdAt = new Date('2024-01-01T10:00:00Z');
      post.updatedAt = new Date();

      const json = post.toJSON();

      expect(json.status).toBe('archived');
      expect(json.archivedAt).toBe(archivedDate.getTime());
      expect(json.givenTo).toBe('recipient-uuid');
    });

    it('should exclude undefined notes', () => {
      const post = new Post();
      post.id = 'post-uuid';
      post.userId = 'user-uuid';
      post.book = { title: 'Test', author: 'Author', genre: 'fiction' };
      post.type = 'giveaway';
      post.notes = null;
      post.status = 'active';
      post.pendingExchange = null;
      post.archivedAt = null;
      post.givenTo = null;
      post.createdAt = new Date();
      post.updatedAt = new Date();

      const json = post.toJSON();

      expect(json.notes).toBeUndefined();
    });

    it('should include notes when present', () => {
      const post = new Post();
      post.id = 'post-uuid';
      post.userId = 'user-uuid';
      post.book = { title: 'Test', author: 'Author', genre: 'fiction' };
      post.type = 'giveaway';
      post.notes = 'Some notes about the book';
      post.status = 'active';
      post.pendingExchange = null;
      post.archivedAt = null;
      post.givenTo = null;
      post.createdAt = new Date();
      post.updatedAt = new Date();

      const json = post.toJSON();

      expect(json.notes).toBe('Some notes about the book');
    });
  });

  describe('PostType', () => {
    it('should accept giveaway type', () => {
      const post = new Post();
      post.type = 'giveaway';
      expect(post.type).toBe('giveaway');
    });

    it('should accept exchange type', () => {
      const post = new Post();
      post.type = 'exchange';
      expect(post.type).toBe('exchange');
    });
  });

  describe('PostStatus', () => {
    it('should accept all valid statuses', () => {
      const post = new Post();

      post.status = 'active';
      expect(post.status).toBe('active');

      post.status = 'pending_exchange';
      expect(post.status).toBe('pending_exchange');

      post.status = 'archived';
      expect(post.status).toBe('archived');
    });
  });
});
