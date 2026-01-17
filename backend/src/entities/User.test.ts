import { describe, it, expect } from 'vitest';
import { User } from './User.js';

describe('User entity', () => {
  describe('toJSON', () => {
    it('should convert user to API response format', () => {
      const user = new User();
      user.id = 'test-uuid';
      user.email = 'test@example.com';
      user.username = 'testuser';
      user.bio = 'Test bio';
      user.verified = true;
      user.role = 'user';
      user.locationType = 'neighborhood';
      user.neighborhoodId = 'buckman';
      user.locationLat = null;
      user.locationLng = null;
      user.booksGiven = 5;
      user.booksReceived = 3;
      user.booksLoaned = 0;
      user.booksBorrowed = 0;
      user.booksTraded = 0;
      user.profilePicture = 'https://example.com/pic.jpg';
      user.readingPreferences = { favoriteGenres: ['fiction', 'mystery'] };
      user.socialLinks = [{ label: 'Goodreads', url: 'https://goodreads.com/user' }];
      user.suspended = null;
      user.banned = false;
      user.createdAt = new Date('2024-01-01T00:00:00Z');
      user.updatedAt = new Date('2024-01-02T00:00:00Z');

      const json = user.toJSON();

      expect(json.id).toBe('test-uuid');
      expect(json.email).toBe('test@example.com');
      expect(json.username).toBe('testuser');
      expect(json.bio).toBe('Test bio');
      expect(json.verified).toBe(true);
      expect(json.role).toBe('user');
      expect(json.location.type).toBe('neighborhood');
      expect(json.location.neighborhoodId).toBe('buckman');
      expect(json.stats.booksGiven).toBe(5);
      expect(json.stats.booksReceived).toBe(3);
      expect(json.stats.bookshares).toBe(8); // computed: 5 + 3 + 0 + 0 + 0
      expect(json.profilePicture).toBe('https://example.com/pic.jpg');
      expect(json.readingPreferences?.favoriteGenres).toEqual(['fiction', 'mystery']);
      expect(json.socialLinks).toHaveLength(1);
    });

    it('should handle pin location type with coordinates', () => {
      const user = new User();
      user.id = 'test-uuid';
      user.email = 'test@example.com';
      user.username = 'testuser';
      user.bio = '';
      user.verified = false;
      user.role = 'user';
      user.locationType = 'pin';
      user.locationLat = 45.5;
      user.locationLng = -122.6;
      user.booksGiven = 0;
      user.booksReceived = 0;
      user.booksLoaned = 0;
      user.booksBorrowed = 0;
      user.booksTraded = 0;
      user.profilePicture = null;
      user.readingPreferences = null;
      user.socialLinks = null;
      user.suspended = null;
      user.banned = false;
      user.createdAt = new Date();
      user.updatedAt = new Date();

      const json = user.toJSON();

      expect(json.location.type).toBe('pin');
      expect(json.location.lat).toBe(45.5);
      expect(json.location.lng).toBe(-122.6);
    });

    it('should handle suspended user', () => {
      const user = new User();
      user.id = 'test-uuid';
      user.email = 'test@example.com';
      user.username = 'testuser';
      user.bio = '';
      user.verified = false;
      user.role = 'user';
      user.locationType = 'neighborhood';
      user.neighborhoodId = 'buckman';
      user.locationLat = null;
      user.locationLng = null;
      user.booksGiven = 0;
      user.booksReceived = 0;
      user.booksLoaned = 0;
      user.booksBorrowed = 0;
      user.booksTraded = 0;
      user.profilePicture = null;
      user.readingPreferences = null;
      user.socialLinks = null;
      user.suspended = { until: Date.now() + 86400000, reason: 'Violation of terms' };
      user.banned = false;
      user.createdAt = new Date();
      user.updatedAt = new Date();

      const json = user.toJSON();

      expect(json.suspended).toBeDefined();
      expect(json.suspended?.reason).toBe('Violation of terms');
    });

    it('should convert createdAt to timestamp', () => {
      const user = new User();
      user.id = 'test-uuid';
      user.email = 'test@example.com';
      user.username = 'testuser';
      user.bio = '';
      user.verified = false;
      user.role = 'user';
      user.locationType = 'neighborhood';
      user.neighborhoodId = 'buckman';
      user.locationLat = null;
      user.locationLng = null;
      user.booksGiven = 0;
      user.booksReceived = 0;
      user.booksLoaned = 0;
      user.booksBorrowed = 0;
      user.booksTraded = 0;
      user.profilePicture = null;
      user.readingPreferences = null;
      user.socialLinks = null;
      user.suspended = null;
      user.banned = false;
      user.createdAt = new Date('2024-06-15T12:00:00Z');
      user.updatedAt = new Date();

      const json = user.toJSON();

      expect(typeof json.createdAt).toBe('number');
      expect(json.createdAt).toBe(new Date('2024-06-15T12:00:00Z').getTime());
    });
  });

  describe('UserRole type', () => {
    it('should accept valid roles', () => {
      const user = new User();

      user.role = 'user';
      expect(user.role).toBe('user');

      user.role = 'moderator';
      expect(user.role).toBe('moderator');

      user.role = 'admin';
      expect(user.role).toBe('admin');
    });
  });
});
