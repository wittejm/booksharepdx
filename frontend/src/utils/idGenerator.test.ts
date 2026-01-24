import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateId } from "./idGenerator";

describe("generateId", () => {
  it("should generate a string ID", () => {
    const id = generateId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(10);
  });

  it("should include timestamp component", () => {
    const before = Date.now();
    const id = generateId();
    const after = Date.now();

    // Extract timestamp from ID (before the hyphen)
    const timestampPart = parseInt(id.split("-")[0], 10);

    expect(timestampPart).toBeGreaterThanOrEqual(before);
    expect(timestampPart).toBeLessThanOrEqual(after);
  });

  it("should include random component", () => {
    const id = generateId();
    const parts = id.split("-");

    expect(parts.length).toBe(2);
    expect(parts[1]).toMatch(/^[a-z0-9]+$/);
  });

  it("should generate unique IDs", () => {
    const ids = new Set<string>();
    const count = 1000;

    for (let i = 0; i < count; i++) {
      ids.add(generateId());
    }

    expect(ids.size).toBe(count);
  });

  it("should generate IDs with consistent format", () => {
    const id = generateId();

    // Format: {timestamp}-{random}
    expect(id).toMatch(/^\d+-[a-z0-9]+$/);
  });

  describe("with mocked time", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should use mocked timestamp", () => {
      const expectedTimestamp = new Date("2024-01-15T12:00:00Z").getTime();
      const id = generateId();
      const timestampPart = parseInt(id.split("-")[0], 10);

      expect(timestampPart).toBe(expectedTimestamp);
    });
  });
});
