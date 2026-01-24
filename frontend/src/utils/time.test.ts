import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatTimestamp } from "./time";

describe("formatTimestamp", () => {
  beforeEach(() => {
    // Mock Date.now to return a fixed time: Jan 15, 2024 12:00:00 local time
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 15, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("just now (< 1 minute)", () => {
    it('should return "just now" for timestamps < 1 minute ago', () => {
      const now = Date.now();
      expect(formatTimestamp(now)).toBe("just now");
      expect(formatTimestamp(now - 1000)).toBe("just now");
      expect(formatTimestamp(now - 30 * 1000)).toBe("just now");
      expect(formatTimestamp(now - 59 * 1000)).toBe("just now");
    });
  });

  describe("today (time only)", () => {
    it("should return time only for timestamps from today", () => {
      const now = Date.now();
      // 5 minutes ago
      expect(formatTimestamp(now - 5 * 60 * 1000)).toBe("11:55am");
      // 2 hours ago
      expect(formatTimestamp(now - 2 * 60 * 60 * 1000)).toBe("10:00am");
    });

    it("should format AM times correctly", () => {
      // 9:30 AM today
      const morning = new Date(2024, 0, 15, 9, 30, 0).getTime();
      expect(formatTimestamp(morning)).toBe("9:30am");
    });

    it("should format PM times correctly", () => {
      // 2:45 PM today (but in past relative to mocked noon)
      // Since we're at noon, let's use 11:45am
      const lateMorning = new Date(2024, 0, 15, 11, 45, 0).getTime();
      expect(formatTimestamp(lateMorning)).toBe("11:45am");
    });

    it("should format midnight correctly (12:XXam)", () => {
      const midnight = new Date(2024, 0, 15, 0, 5, 0).getTime();
      expect(formatTimestamp(midnight)).toBe("12:05am");
    });

    it("should pad minutes with leading zero", () => {
      const time = new Date(2024, 0, 15, 9, 5, 0).getTime();
      expect(formatTimestamp(time)).toBe("9:05am");
    });
  });

  describe("earlier (time + date)", () => {
    it("should include date for timestamps from yesterday", () => {
      const yesterday = new Date(2024, 0, 14, 15, 30, 0).getTime();
      expect(formatTimestamp(yesterday)).toBe("3:30pm Jan 14");
    });

    it("should include date for timestamps from earlier this year", () => {
      const earlier = new Date(2024, 0, 10, 9, 0, 0).getTime();
      expect(formatTimestamp(earlier)).toBe("9:00am Jan 10");
    });

    it("should include year for timestamps from different year", () => {
      const lastYear = new Date(2023, 11, 25, 15, 30, 0).getTime();
      expect(formatTimestamp(lastYear)).toBe("3:30pm Dec 25, 2023");
    });

    it("should handle all months", () => {
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      months.forEach((month, index) => {
        const timestamp = new Date(2023, index, 15, 10, 0, 0).getTime();
        const result = formatTimestamp(timestamp);
        expect(result).toContain(month);
        expect(result).toContain("2023"); // Different year, should include year
      });
    });
  });
});
