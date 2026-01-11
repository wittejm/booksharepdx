import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatTimestamp } from './time';

describe('formatTimestamp', () => {
  beforeEach(() => {
    // Mock Date.now to return a fixed time: Jan 15, 2024 12:00:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('relative time (< 6 hours)', () => {
    it('should return "just now" for very recent timestamps', () => {
      const now = Date.now();
      expect(formatTimestamp(now)).toBe('just now');
      expect(formatTimestamp(now - 1000)).toBe('just now');
    });

    it('should return seconds ago for < 1 minute', () => {
      const now = Date.now();
      expect(formatTimestamp(now - 30 * 1000)).toBe('30 seconds ago');
      expect(formatTimestamp(now - 45 * 1000)).toBe('45 seconds ago');
    });

    it('should return "1 minute ago" for singular', () => {
      const now = Date.now();
      expect(formatTimestamp(now - 60 * 1000)).toBe('1 minute ago');
      expect(formatTimestamp(now - 90 * 1000)).toBe('1 minute ago');
    });

    it('should return minutes ago for < 1 hour', () => {
      const now = Date.now();
      expect(formatTimestamp(now - 5 * 60 * 1000)).toBe('5 minutes ago');
      expect(formatTimestamp(now - 30 * 60 * 1000)).toBe('30 minutes ago');
      expect(formatTimestamp(now - 59 * 60 * 1000)).toBe('59 minutes ago');
    });

    it('should return "1 hour ago" for singular', () => {
      const now = Date.now();
      expect(formatTimestamp(now - 60 * 60 * 1000)).toBe('1 hour ago');
      expect(formatTimestamp(now - 90 * 60 * 1000)).toBe('1 hour ago');
    });

    it('should return hours ago for < 6 hours', () => {
      const now = Date.now();
      expect(formatTimestamp(now - 2 * 60 * 60 * 1000)).toBe('2 hours ago');
      expect(formatTimestamp(now - 5 * 60 * 60 * 1000)).toBe('5 hours ago');
    });
  });

  describe('absolute time (>= 6 hours)', () => {
    it('should use absolute format for 6+ hours ago', () => {
      const now = Date.now();
      const sixHoursAgo = now - 6 * 60 * 60 * 1000;

      const result = formatTimestamp(sixHoursAgo);
      // Should match format like "6:00am Jan 15, 2024"
      expect(result).toMatch(/\d{1,2}:\d{2}(am|pm) [A-Z][a-z]+ \d{1,2}, \d{4}/);
    });

    it('should format times with correct structure', () => {
      // Use a timestamp that's definitely in the past (more than 6 hours)
      const timestamp = new Date('2024-01-10T09:30:00').getTime();
      const result = formatTimestamp(timestamp);

      // Should have format: "H:MMam/pm Mon D, YYYY"
      expect(result).toMatch(/^\d{1,2}:\d{2}(am|pm) [A-Z][a-z]+ \d{1,2}, \d{4}$/);
    });

    it('should correctly distinguish AM and PM', () => {
      // Create local dates to avoid timezone issues
      const morning = new Date(2024, 0, 10, 9, 30, 0).getTime(); // 9:30 AM local
      const afternoon = new Date(2024, 0, 10, 14, 45, 0).getTime(); // 2:45 PM local

      expect(formatTimestamp(morning)).toContain('am');
      expect(formatTimestamp(afternoon)).toContain('pm');
    });

    it('should format midnight correctly (12:XXam)', () => {
      const midnight = new Date(2024, 0, 10, 0, 0, 0).getTime();
      const result = formatTimestamp(midnight);

      expect(result).toMatch(/^12:00am/);
    });

    it('should format noon correctly (12:XXpm)', () => {
      const noon = new Date(2024, 0, 10, 12, 0, 0).getTime();
      const result = formatTimestamp(noon);

      expect(result).toMatch(/^12:00pm/);
    });

    it('should pad minutes with leading zero', () => {
      const time = new Date(2024, 0, 10, 9, 5, 0).getTime();
      const result = formatTimestamp(time);

      expect(result).toContain(':05');
    });
  });

  describe('edge cases', () => {
    it('should handle timestamps from different years', () => {
      const timestamp = new Date(2023, 11, 25, 15, 30, 0).getTime();
      const result = formatTimestamp(timestamp);

      expect(result).toContain('Dec');
      expect(result).toContain('2023');
    });

    it('should handle all months', () => {
      // Use dates from 2023 which are definitely in the past relative to our mocked time
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];

      months.forEach((month, index) => {
        const timestamp = new Date(2023, index, 15, 10, 0, 0).getTime();
        const result = formatTimestamp(timestamp);
        expect(result).toContain(month);
      });
    });
  });
});
