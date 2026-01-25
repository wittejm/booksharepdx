import { AppDataSource } from "../config/database.js";
import { env } from "../config/env.js";
import { User } from "../entities/User.js";
import { Post } from "../entities/Post.js";
import { MessageThread } from "../entities/MessageThread.js";
import {
  sendBookRequestedEmail,
  sendRequestDecisionEmail,
  sendNewMessageEmail,
  sendTradeProposalEmail,
} from "./emailService.js";

type NotificationType =
  | "bookRequested"
  | "requestDecision"
  | "newMessage"
  | "tradeProposal";

// Debounce duration for new message notifications (5 minutes)
const MESSAGE_DEBOUNCE_MS = 5 * 60 * 1000;

/**
 * Check if a notification type is enabled for a user.
 * Defaults to true if preference is null/undefined.
 */
export function isNotificationEnabled(
  user: User,
  type: NotificationType,
): boolean {
  if (!user.emailNotifications) {
    return true; // Default: all notifications enabled
  }
  const preference = user.emailNotifications[type];
  return preference !== false; // null/undefined = enabled
}

/**
 * Get the display name for a user (preferredName or username).
 */
function getDisplayName(user: User): string {
  return user.preferredName || user.username;
}

/**
 * Build the URL for a message thread.
 */
function getThreadUrl(threadId: string): string {
  return `${env.frontendUrl}/messages/${threadId}`;
}

/**
 * Notify the book owner when someone requests their book.
 */
export async function notifyBookRequested(
  recipient: User,
  requester: User,
  book: { title: string; author: string },
  messageContent: string,
  threadId: string,
): Promise<void> {
  if (!isNotificationEnabled(recipient, "bookRequested")) {
    return;
  }

  // Truncate message preview
  const messagePreview =
    messageContent.length > 300
      ? messageContent.substring(0, 300) + "..."
      : messageContent;

  await sendBookRequestedEmail(recipient.email, {
    recipientName: getDisplayName(recipient),
    requesterName: getDisplayName(requester),
    bookTitle: book.title,
    bookAuthor: book.author,
    messagePreview,
    threadUrl: getThreadUrl(threadId),
  });
}

/**
 * Notify the requester when the owner accepts or declines their request.
 */
export async function notifyRequestDecision(
  recipient: User,
  owner: User,
  book: { title: string },
  decision: "accepted" | "declined",
  threadId: string,
): Promise<void> {
  if (!isNotificationEnabled(recipient, "requestDecision")) {
    return;
  }

  await sendRequestDecisionEmail(recipient.email, {
    recipientName: getDisplayName(recipient),
    ownerName: getDisplayName(owner),
    bookTitle: book.title,
    decision,
    threadUrl: getThreadUrl(threadId),
  });
}

/**
 * Notify the recipient when they receive a new message.
 * Debounced: max 1 email per 5 minutes per thread.
 */
export async function notifyNewMessage(
  recipient: User,
  sender: User,
  book: { title: string },
  messagePreview: string,
  threadId: string,
): Promise<void> {
  if (!isNotificationEnabled(recipient, "newMessage")) {
    return;
  }

  // Check debounce
  const threadRepo = AppDataSource.getRepository(MessageThread);
  const thread = await threadRepo.findOne({ where: { id: threadId } });

  if (!thread) {
    return;
  }

  const now = new Date();
  if (thread.lastEmailNotifiedAt) {
    const timeSinceLastEmail =
      now.getTime() - thread.lastEmailNotifiedAt.getTime();
    if (timeSinceLastEmail < MESSAGE_DEBOUNCE_MS) {
      // Debounced - skip this notification
      return;
    }
  }

  // Update debounce timestamp
  thread.lastEmailNotifiedAt = now;
  await threadRepo.save(thread);

  // Truncate message preview
  const preview =
    messagePreview.length > 200
      ? messagePreview.substring(0, 200) + "..."
      : messagePreview;

  await sendNewMessageEmail(recipient.email, {
    recipientName: getDisplayName(recipient),
    senderName: getDisplayName(sender),
    bookTitle: book.title,
    messagePreview: preview,
    threadUrl: getThreadUrl(threadId),
  });
}

/**
 * Notify the recipient when someone sends them a trade proposal.
 */
export async function notifyTradeProposal(
  recipient: User,
  proposer: User,
  offeredBook: { title: string },
  requestedBook: { title: string },
  threadId: string,
): Promise<void> {
  if (!isNotificationEnabled(recipient, "tradeProposal")) {
    return;
  }

  await sendTradeProposalEmail(recipient.email, {
    recipientName: getDisplayName(recipient),
    proposerName: getDisplayName(proposer),
    offeredBookTitle: offeredBook.title,
    requestedBookTitle: requestedBook.title,
    threadUrl: getThreadUrl(threadId),
  });
}
