import { Resend } from "resend";
import { env } from "../config/env.js";

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  // In dev without API key, just log
  if (!resend) {
    console.log(`[EMAIL] Would send to: ${options.to}`);
    console.log(`[EMAIL] Subject: ${options.subject}`);
    console.log(`[EMAIL] Body: ${options.html}`);
    return true;
  }

  try {
    const { error } = await resend.emails.send({
      from: env.emailFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
      ...(options.text && { text: options.text }),
    });

    if (error) {
      console.error("[EMAIL] Failed to send:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[EMAIL] Error sending email:", error);
    return false;
  }
}

export async function sendMagicLinkEmail(
  to: string,
  magicLinkUrl: string,
): Promise<boolean> {
  return sendEmail({
    to,
    subject: "Sign in to BookSharePDX",
    text: `Sign in to BookSharePDX\n\nClick the link below to sign in. This link expires in 30 minutes.\n\n${magicLinkUrl}\n\nIf you didn't request this, you can safely ignore it.\n\n— BookSharePDX`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px;">
        <p>Click the link below to sign in to your account. This link expires in 30 minutes.</p>
        <p><a href="${magicLinkUrl}">Sign in to BookSharePDX</a></p>
        <p style="color: #999; font-size: 13px;">If you didn't request this, you can safely ignore it.</p>
        <p style="color: #999; font-size: 12px;">— BookSharePDX</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(
  to: string,
  username: string,
  verifyUrl: string,
): Promise<boolean> {
  return sendEmail({
    to,
    subject: "Welcome to BookSharePDX!",
    text: `Welcome to BookSharePDX, ${username}!\n\nThanks for joining. Please verify your email to get started:\n\n${verifyUrl}\n\nThis link expires in 30 minutes.\n\n— BookSharePDX`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px;">
        <p>Welcome to BookSharePDX, ${username}!</p>
        <p>Thanks for joining. Please verify your email to get started:</p>
        <p><a href="${verifyUrl}">Verify your email address</a></p>
        <p style="color: #999; font-size: 13px;">This link expires in 30 minutes.</p>
        <p style="color: #999; font-size: 12px;">— BookSharePDX</p>
      </div>
    `,
  });
}

// Notification email templates

export async function sendBookRequestedEmail(
  to: string,
  data: {
    recipientName: string;
    requesterName: string;
    bookTitle: string;
    bookAuthor: string;
    postType: "giveaway" | "exchange" | "loan";
    messagePreview: string;
    threadUrl: string;
  },
): Promise<boolean> {
  const typeLabels = {
    giveaway: { noun: "gift", verb: "wants", action: "receive" },
    exchange: { noun: "trade", verb: "wants to trade for", action: "trade for" },
    loan: { noun: "loan", verb: "wants to borrow", action: "borrow" },
  };
  const label = typeLabels[data.postType];

  const subject =
    data.postType === "exchange"
      ? `${data.requesterName} wants to trade for "${data.bookTitle}"`
      : data.postType === "loan"
        ? `${data.requesterName} wants to borrow "${data.bookTitle}"`
        : `${data.requesterName} is interested in your gift: "${data.bookTitle}"`;

  return sendEmail({
    to,
    subject,
    text: `Hi ${data.recipientName},\n\n${data.requesterName} ${label.verb} your book "${data.bookTitle}" by ${data.bookAuthor}.\n\nTheir message:\n"${data.messagePreview}"\n\nView the request: ${data.threadUrl}\n\n— BookSharePDX`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px;">
        <p>Hi ${data.recipientName},</p>
        <p><strong>${data.requesterName}</strong> ${label.verb} your book "<strong>${data.bookTitle}</strong>" by ${data.bookAuthor}.</p>
        <p>Their message:</p>
        <blockquote style="margin: 8px 0; padding-left: 12px; border-left: 2px solid #ccc; color: #555;">${data.messagePreview}</blockquote>
        <p><a href="${data.threadUrl}">View the request</a></p>
        <p style="color: #999; font-size: 12px;">— BookSharePDX</p>
      </div>
    `,
  });
}

export async function sendRequestDecisionEmail(
  to: string,
  data: {
    recipientName: string;
    ownerName: string;
    bookTitle: string;
    decision: "accepted" | "declined";
    threadUrl: string;
  },
): Promise<boolean> {
  const isAccepted = data.decision === "accepted";
  const subject = isAccepted
    ? `${data.ownerName} accepted your request for "${data.bookTitle}"`
    : `${data.ownerName} declined your request for "${data.bookTitle}"`;

  const htmlMessage = isAccepted
    ? `<strong>${data.ownerName}</strong> accepted your request for "<strong>${data.bookTitle}</strong>." Head to the conversation to coordinate the handoff!`
    : `<strong>${data.ownerName}</strong> declined your request for "<strong>${data.bookTitle}</strong>."`;

  const textMessage = isAccepted
    ? `${data.ownerName} accepted your request for "${data.bookTitle}." Head to the conversation to coordinate the handoff!`
    : `${data.ownerName} declined your request for "${data.bookTitle}."`;

  const linkText = isAccepted ? "Coordinate handoff" : "View conversation";

  return sendEmail({
    to,
    subject,
    text: `Hi ${data.recipientName},\n\n${textMessage}\n\n${linkText}: ${data.threadUrl}\n\n— BookSharePDX`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px;">
        <p>Hi ${data.recipientName},</p>
        <p>${htmlMessage}</p>
        <p><a href="${data.threadUrl}">${linkText}</a></p>
        <p style="color: #999; font-size: 12px;">— BookSharePDX</p>
      </div>
    `,
  });
}

export async function sendNewMessageEmail(
  to: string,
  data: {
    recipientName: string;
    senderName: string;
    bookTitle: string;
    postType: "giveaway" | "exchange" | "loan";
    messagePreview: string;
    threadUrl: string;
  },
): Promise<boolean> {
  const typeLabel =
    data.postType === "exchange"
      ? "trade"
      : data.postType === "loan"
        ? "loan"
        : "gift";

  return sendEmail({
    to,
    subject: `New message from ${data.senderName} about "${data.bookTitle}"`,
    text: `Hi ${data.recipientName},\n\n${data.senderName} sent you a message about your ${typeLabel} of "${data.bookTitle}":\n\n"${data.messagePreview}"\n\nReply: ${data.threadUrl}\n\n— BookSharePDX`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px;">
        <p>Hi ${data.recipientName},</p>
        <p><strong>${data.senderName}</strong> sent you a message about your ${typeLabel} of "<strong>${data.bookTitle}</strong>":</p>
        <blockquote style="margin: 8px 0; padding-left: 12px; border-left: 2px solid #ccc; color: #555;">${data.messagePreview}</blockquote>
        <p><a href="${data.threadUrl}">Reply</a></p>
        <p style="color: #999; font-size: 12px;">— BookSharePDX</p>
      </div>
    `,
  });
}

export async function sendFeedbackEmail(
  data: {
    message: string;
    userName: string;
    userEmail: string;
    userId: string;
    pageUrl?: string;
  },
): Promise<boolean> {
  return sendEmail({
    to: "hello@booksharepdx.com",
    subject: `[Feedback] from ${data.userName}`,
    text: `User Feedback\n\n${data.message}\n\nFrom: ${data.userName} (${data.userEmail})\nUser ID: ${data.userId}${data.pageUrl ? `\nPage: ${data.pageUrl}` : ""}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px;">
        <p><strong>User Feedback</strong></p>
        <p style="white-space: pre-wrap;">${data.message}</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 16px 0;" />
        <p style="color: #999; font-size: 13px;">From: ${data.userName} (${data.userEmail})<br>User ID: ${data.userId}${data.pageUrl ? `<br>Page: ${data.pageUrl}` : ""}</p>
      </div>
    `,
  });
}

export async function sendTradeProposalEmail(
  to: string,
  data: {
    recipientName: string;
    proposerName: string;
    offeredBookTitle: string;
    requestedBookTitle: string;
    threadUrl: string;
  },
): Promise<boolean> {
  return sendEmail({
    to,
    subject: `${data.proposerName} proposed a trade for "${data.requestedBookTitle}"`,
    text: `Hi ${data.recipientName},\n\n${data.proposerName} wants to trade with you!\n\nThey're offering: ${data.offeredBookTitle}\nFor your book: ${data.requestedBookTitle}\n\nView the proposal: ${data.threadUrl}\n\n— BookSharePDX`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px;">
        <p>Hi ${data.recipientName},</p>
        <p><strong>${data.proposerName}</strong> wants to trade with you!</p>
        <p>They're offering: <strong>${data.offeredBookTitle}</strong><br>For your book: <strong>${data.requestedBookTitle}</strong></p>
        <p><a href="${data.threadUrl}">View the proposal</a></p>
        <p style="color: #999; font-size: 12px;">— BookSharePDX</p>
      </div>
    `,
  });
}
