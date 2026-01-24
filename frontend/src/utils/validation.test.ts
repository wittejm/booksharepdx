import { describe, it, expect } from "vitest";
import { isValidEmail, isValidUsername, isValidBio } from "./validation";

describe("validation utilities", () => {
  describe("isValidEmail", () => {
    it("should return true for valid emails", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name@domain.org")).toBe(true);
      expect(isValidEmail("user+tag@gmail.com")).toBe(true);
      expect(isValidEmail("a@b.co")).toBe(true);
    });

    it("should return false for invalid emails", () => {
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail("notanemail")).toBe(false);
      expect(isValidEmail("@nodomain.com")).toBe(false);
      expect(isValidEmail("no@domain")).toBe(false);
      expect(isValidEmail("spaces in@email.com")).toBe(false);
      expect(isValidEmail("missing@.com")).toBe(false);
    });

    it("should return false for non-string types", () => {
      expect(isValidEmail(null as unknown as string)).toBe(false);
      expect(isValidEmail(undefined as unknown as string)).toBe(false);
      expect(isValidEmail(123 as unknown as string)).toBe(false);
    });

    it("should return false for whitespace-only strings", () => {
      expect(isValidEmail("   ")).toBe(false);
      expect(isValidEmail("\t\n")).toBe(false);
    });
  });

  describe("isValidUsername", () => {
    it("should return true for valid usernames", () => {
      expect(isValidUsername("username")).toBe(true);
      expect(isValidUsername("user_name")).toBe(true);
      expect(isValidUsername("User123")).toBe(true);
      expect(isValidUsername("a")).toBe(true);
      expect(isValidUsername("___")).toBe(true);
    });

    it("should return false for usernames with invalid characters", () => {
      expect(isValidUsername("user-name")).toBe(false);
      expect(isValidUsername("user.name")).toBe(false);
      expect(isValidUsername("user name")).toBe(false);
      expect(isValidUsername("user@name")).toBe(false);
      expect(isValidUsername("user!name")).toBe(false);
    });

    it("should return false for empty or whitespace-only strings", () => {
      expect(isValidUsername("")).toBe(false);
      expect(isValidUsername("   ")).toBe(false);
      expect(isValidUsername("\t")).toBe(false);
    });

    it("should return false for non-string types", () => {
      expect(isValidUsername(null as unknown as string)).toBe(false);
      expect(isValidUsername(undefined as unknown as string)).toBe(false);
      expect(isValidUsername(123 as unknown as string)).toBe(false);
    });
  });

  describe("isValidBio", () => {
    it("should return true for bios with 20+ characters", () => {
      expect(isValidBio("This is a valid bio.")).toBe(true);
      expect(
        isValidBio("A sentence that is at least twenty characters long"),
      ).toBe(true);
      expect(isValidBio("12345678901234567890")).toBe(true);
    });

    it("should return false for bios under 20 characters", () => {
      expect(isValidBio("")).toBe(false);
      expect(isValidBio("Short bio")).toBe(false);
      expect(isValidBio("1234567890123456789")).toBe(false);
    });

    it("should trim whitespace before checking length", () => {
      expect(isValidBio("   short   ")).toBe(false);
      expect(isValidBio("   This is a valid bio.   ")).toBe(true);
    });

    it("should return false for non-string types", () => {
      expect(isValidBio(null as unknown as string)).toBe(false);
      expect(isValidBio(undefined as unknown as string)).toBe(false);
      expect(isValidBio(123 as unknown as string)).toBe(false);
    });
  });
});
