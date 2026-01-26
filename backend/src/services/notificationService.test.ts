import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the env module
vi.mock("../config/env.js", () => ({
  env: {
    frontendUrl: "https://booksharepdx.com",
  },
}));

// Mock the database
vi.mock("../config/database.js", () => ({
  AppDataSource: {
    getRepository: vi.fn(),
  },
}));

// Mock the email service
vi.mock("./emailService.js", () => ({
  sendBookRequestedEmail: vi.fn().mockResolvedValue(true),
  sendRequestDecisionEmail: vi.fn().mockResolvedValue(true),
  sendNewMessageEmail: vi.fn().mockResolvedValue(true),
  sendTradeProposalEmail: vi.fn().mockResolvedValue(true),
}));

import { AppDataSource } from "../config/database.js";
import {
  sendBookRequestedEmail,
  sendRequestDecisionEmail,
  sendNewMessageEmail,
  sendTradeProposalEmail,
} from "./emailService.js";
import {
  isNotificationEnabled,
  notifyBookRequested,
  notifyRequestDecision,
  notifyNewMessage,
  notifyTradeProposal,
} from "./notificationService.js";
import type { User } from "../entities/User.js";

describe("notificationService", () => {
  const createMockUser = (overrides: Partial<User> = {}): User =>
    ({
      id: "user-123",
      email: "test@example.com",
      username: "testuser",
      preferredName: null,
      emailNotifications: null,
      ...overrides,
    }) as User;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isNotificationEnabled", () => {
    it("returns true when emailNotifications is null (default)", () => {
      const user = createMockUser({ emailNotifications: null });
      expect(isNotificationEnabled(user, "bookRequested")).toBe(true);
      expect(isNotificationEnabled(user, "requestDecision")).toBe(true);
      expect(isNotificationEnabled(user, "newMessage")).toBe(true);
      expect(isNotificationEnabled(user, "tradeProposal")).toBe(true);
    });

    it("returns true when specific preference is undefined", () => {
      const user = createMockUser({ emailNotifications: {} });
      expect(isNotificationEnabled(user, "bookRequested")).toBe(true);
    });

    it("returns true when specific preference is true", () => {
      const user = createMockUser({
        emailNotifications: { bookRequested: true },
      });
      expect(isNotificationEnabled(user, "bookRequested")).toBe(true);
    });

    it("returns false when specific preference is false", () => {
      const user = createMockUser({
        emailNotifications: { bookRequested: false },
      });
      expect(isNotificationEnabled(user, "bookRequested")).toBe(false);
    });

    it("handles mixed preferences correctly", () => {
      const user = createMockUser({
        emailNotifications: {
          bookRequested: false,
          requestDecision: true,
          newMessage: false,
          // tradeProposal is undefined
        },
      });
      expect(isNotificationEnabled(user, "bookRequested")).toBe(false);
      expect(isNotificationEnabled(user, "requestDecision")).toBe(true);
      expect(isNotificationEnabled(user, "newMessage")).toBe(false);
      expect(isNotificationEnabled(user, "tradeProposal")).toBe(true); // undefined = enabled
    });
  });

  describe("notifyBookRequested", () => {
    it("sends email to sharer with correct URL", async () => {
      const recipient = createMockUser({ preferredName: "Alice" });
      const requester = createMockUser({
        id: "requester-456",
        username: "bob",
        preferredName: "Bob",
      });

      await notifyBookRequested(
        recipient,
        requester,
        { title: "The Great Gatsby", author: "F. Scott Fitzgerald" },
        "giveaway",
        "I would love this book!",
        "thread-789",
      );

      expect(sendBookRequestedEmail).toHaveBeenCalledWith("test@example.com", {
        recipientName: "Alice",
        requesterName: "Bob",
        bookTitle: "The Great Gatsby",
        bookAuthor: "F. Scott Fitzgerald",
        postType: "giveaway",
        messagePreview: "I would love this book!",
        threadUrl: "https://booksharepdx.com/share/thread-789",
      });
    });

    it("does not send email when notification is disabled", async () => {
      const recipient = createMockUser({
        emailNotifications: { bookRequested: false },
      });
      const requester = createMockUser();

      await notifyBookRequested(
        recipient,
        requester,
        { title: "Test", author: "Author" },
        "giveaway",
        "Message",
        "thread-123",
      );

      expect(sendBookRequestedEmail).not.toHaveBeenCalled();
    });

    it("uses username when preferredName is not set", async () => {
      const recipient = createMockUser({ preferredName: null });
      const requester = createMockUser({
        username: "bobuser",
        preferredName: null,
      });

      await notifyBookRequested(
        recipient,
        requester,
        { title: "Test", author: "Author" },
        "loan",
        "Message",
        "thread-123",
      );

      expect(sendBookRequestedEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          recipientName: "testuser",
          requesterName: "bobuser",
        }),
      );
    });
  });

  describe("notifyRequestDecision", () => {
    it("sends email to requester with correct URL", async () => {
      const recipient = createMockUser({ preferredName: "Bob" });
      const owner = createMockUser({
        id: "owner-456",
        preferredName: "Alice",
      });

      await notifyRequestDecision(
        recipient,
        owner,
        { title: "The Great Gatsby" },
        "accepted",
        "thread-789",
      );

      expect(sendRequestDecisionEmail).toHaveBeenCalledWith(
        "test@example.com",
        {
          recipientName: "Bob",
          ownerName: "Alice",
          bookTitle: "The Great Gatsby",
          decision: "accepted",
          threadUrl: "https://booksharepdx.com/activity/thread-789",
        },
      );
    });

    it("sends declined notification", async () => {
      const recipient = createMockUser();
      const owner = createMockUser({ preferredName: "Alice" });

      await notifyRequestDecision(
        recipient,
        owner,
        { title: "Test Book" },
        "declined",
        "thread-123",
      );

      expect(sendRequestDecisionEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          decision: "declined",
        }),
      );
    });
  });

  describe("notifyNewMessage", () => {
    const mockThreadRepo = {
      findOne: vi.fn(),
      save: vi.fn(),
    };

    beforeEach(() => {
      vi.mocked(AppDataSource.getRepository).mockReturnValue(
        mockThreadRepo as any,
      );
    });

    it("sends email to sharer with /share URL", async () => {
      mockThreadRepo.findOne.mockResolvedValue({
        id: "thread-789",
        lastEmailNotifiedAt: null,
      });

      const recipient = createMockUser({ preferredName: "Alice" });
      const sender = createMockUser({ preferredName: "Bob" });

      await notifyNewMessage(
        recipient,
        sender,
        { title: "The Great Gatsby" },
        "giveaway",
        "Thanks for sharing!",
        "thread-789",
        "sharer",
      );

      expect(sendNewMessageEmail).toHaveBeenCalledWith("test@example.com", {
        recipientName: "Alice",
        senderName: "Bob",
        bookTitle: "The Great Gatsby",
        postType: "giveaway",
        messagePreview: "Thanks for sharing!",
        threadUrl: "https://booksharepdx.com/share/thread-789",
      });
    });

    it("sends email to requester with /activity URL", async () => {
      mockThreadRepo.findOne.mockResolvedValue({
        id: "thread-789",
        lastEmailNotifiedAt: null,
      });

      const recipient = createMockUser({ preferredName: "Bob" });
      const sender = createMockUser({ preferredName: "Alice" });

      await notifyNewMessage(
        recipient,
        sender,
        { title: "The Great Gatsby" },
        "exchange",
        "When can you meet?",
        "thread-789",
        "requester",
      );

      expect(sendNewMessageEmail).toHaveBeenCalledWith("test@example.com", {
        recipientName: "Bob",
        senderName: "Alice",
        bookTitle: "The Great Gatsby",
        postType: "exchange",
        messagePreview: "When can you meet?",
        threadUrl: "https://booksharepdx.com/activity/thread-789",
      });
    });

    it("debounces notifications within 5 minutes", async () => {
      const recentTime = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago
      mockThreadRepo.findOne.mockResolvedValue({
        id: "thread-789",
        lastEmailNotifiedAt: recentTime,
      });

      const recipient = createMockUser();
      const sender = createMockUser();

      await notifyNewMessage(
        recipient,
        sender,
        { title: "Test" },
        "giveaway",
        "Message",
        "thread-789",
        "sharer",
      );

      expect(sendNewMessageEmail).not.toHaveBeenCalled();
    });

    it("sends notification after 5 minute debounce period", async () => {
      const oldTime = new Date(Date.now() - 6 * 60 * 1000); // 6 minutes ago
      mockThreadRepo.findOne.mockResolvedValue({
        id: "thread-789",
        lastEmailNotifiedAt: oldTime,
      });

      const recipient = createMockUser();
      const sender = createMockUser();

      await notifyNewMessage(
        recipient,
        sender,
        { title: "Test" },
        "giveaway",
        "Message",
        "thread-789",
        "sharer",
      );

      expect(sendNewMessageEmail).toHaveBeenCalled();
      expect(mockThreadRepo.save).toHaveBeenCalled();
    });

    it("truncates long message previews", async () => {
      mockThreadRepo.findOne.mockResolvedValue({
        id: "thread-789",
        lastEmailNotifiedAt: null,
      });

      const longMessage = "A".repeat(300);
      const recipient = createMockUser();
      const sender = createMockUser();

      await notifyNewMessage(
        recipient,
        sender,
        { title: "Test" },
        "giveaway",
        longMessage,
        "thread-789",
        "sharer",
      );

      expect(sendNewMessageEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messagePreview: "A".repeat(200) + "...",
        }),
      );
    });
  });

  describe("notifyTradeProposal", () => {
    it("sends email to sharer with /share URL", async () => {
      const recipient = createMockUser({ preferredName: "Alice" });
      const proposer = createMockUser({ preferredName: "Bob" });

      await notifyTradeProposal(
        recipient,
        proposer,
        { title: "1984" },
        { title: "Brave New World" },
        "thread-789",
        "sharer",
      );

      expect(sendTradeProposalEmail).toHaveBeenCalledWith("test@example.com", {
        recipientName: "Alice",
        proposerName: "Bob",
        offeredBookTitle: "1984",
        requestedBookTitle: "Brave New World",
        threadUrl: "https://booksharepdx.com/share/thread-789",
      });
    });

    it("sends email to requester with /activity URL", async () => {
      const recipient = createMockUser({ preferredName: "Bob" });
      const proposer = createMockUser({ preferredName: "Alice" });

      await notifyTradeProposal(
        recipient,
        proposer,
        { title: "1984" },
        { title: "Brave New World" },
        "thread-789",
        "requester",
      );

      expect(sendTradeProposalEmail).toHaveBeenCalledWith("test@example.com", {
        recipientName: "Bob",
        proposerName: "Alice",
        offeredBookTitle: "1984",
        requestedBookTitle: "Brave New World",
        threadUrl: "https://booksharepdx.com/activity/thread-789",
      });
    });

    it("does not send email when notification is disabled", async () => {
      const recipient = createMockUser({
        emailNotifications: { tradeProposal: false },
      });
      const proposer = createMockUser();

      await notifyTradeProposal(
        recipient,
        proposer,
        { title: "Book1" },
        { title: "Book2" },
        "thread-123",
        "sharer",
      );

      expect(sendTradeProposalEmail).not.toHaveBeenCalled();
    });
  });
});
