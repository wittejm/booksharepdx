import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'mySecurePassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are ~60 chars
    });

    it('should produce different hashes for same password', async () => {
      const password = 'samePassword';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce valid bcrypt hash format', async () => {
      const hash = await hashPassword('testPassword');

      // bcrypt hashes start with $2a$, $2b$, or $2y$ followed by cost factor
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'correctPassword123';
      const hash = await hashPassword(password);

      const result = await verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'correctPassword123';
      const wrongPassword = 'wrongPassword456';
      const hash = await hashPassword(password);

      const result = await verifyPassword(wrongPassword, hash);
      expect(result).toBe(false);
    });

    it('should handle empty password', async () => {
      const hash = await hashPassword('somePassword');

      const result = await verifyPassword('', hash);
      expect(result).toBe(false);
    });

    it('should handle similar but different passwords', async () => {
      const password = 'MyPassword123';
      const hash = await hashPassword(password);

      // Case difference
      expect(await verifyPassword('mypassword123', hash)).toBe(false);
      // Extra character
      expect(await verifyPassword('MyPassword1234', hash)).toBe(false);
      // Missing character
      expect(await verifyPassword('MyPassword12', hash)).toBe(false);
    });
  });

  describe('hash and verify integration', () => {
    it('should work with special characters', async () => {
      const passwords = [
        'p@$$w0rd!',
        'spaces in password',
        '日本語パスワード',
        '🔐secure🔐',
        '<script>alert("xss")</script>',
      ];

      for (const password of passwords) {
        const hash = await hashPassword(password);
        const result = await verifyPassword(password, hash);
        expect(result).toBe(true);
      }
    });

    it('should work with very long passwords', async () => {
      const longPassword = 'a'.repeat(100);
      const hash = await hashPassword(longPassword);

      expect(await verifyPassword(longPassword, hash)).toBe(true);
      // Note: bcrypt truncates at 72 bytes, so we test with a significantly different password
      expect(await verifyPassword('b'.repeat(100), hash)).toBe(false);
    });
  });
});
