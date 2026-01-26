import { Resend } from "resend";
import { env } from "../config/env.js";

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
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
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Sign in to BookSharePDX</h1>
        <p>Click the button below to sign in to your account. This link expires in 30 minutes.</p>
        <a href="${magicLinkUrl}"
           style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Sign In
        </a>
        <p style="color: #666; font-size: 14px;">
          If you didn't request this email, you can safely ignore it.
        </p>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link: ${magicLinkUrl}
        </p>
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
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Welcome to BookSharePDX, ${username}!</h1>
        <p>Thanks for joining our community of book lovers in Portland.</p>
        <p>Please verify your email address to get started:</p>
        <a href="${verifyUrl}"
           style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Verify Email
        </a>
        <p style="color: #666; font-size: 14px;">
          This link expires in 30 minutes.
        </p>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link: ${verifyUrl}
        </p>
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

  const headline =
    data.postType === "exchange"
      ? "Someone wants to trade!"
      : data.postType === "loan"
        ? "Someone wants to borrow your book!"
        : "Someone is interested in your gift!";

  return sendEmail({
    to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">${headline}</h1>
        <p>Hi ${data.recipientName},</p>
        <p><strong>${data.requesterName}</strong> ${label.verb} your book:</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0; font-size: 18px; font-weight: bold;">${data.bookTitle}</p>
          <p style="margin: 4px 0 0 0; color: #666;">by ${data.bookAuthor}</p>
        </div>
        <p><strong>Their message:</strong></p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #2563eb;">
          <p style="margin: 0; color: #374151;">${data.messagePreview}</p>
        </div>
        <a href="${data.threadUrl}"
           style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          View Request
        </a>
        <p style="color: #666; font-size: 14px;">
          You can manage your email notification preferences in your profile settings.
        </p>
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
    ? `Great news! ${data.ownerName} accepted your request for "${data.bookTitle}"`
    : `${data.ownerName} declined your request for "${data.bookTitle}"`;

  const headline = isAccepted
    ? "Your request was accepted!"
    : "Your request was declined";

  const message = isAccepted
    ? `<strong>${data.ownerName}</strong> has accepted your request for <strong>${data.bookTitle}</strong>. Head to the conversation to coordinate the handoff!`
    : `<strong>${data.ownerName}</strong> has declined your request for <strong>${data.bookTitle}</strong>. Don't worry, there are plenty of other books available!`;

  const buttonText = isAccepted ? "Coordinate Handoff" : "View Conversation";

  return sendEmail({
    to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: ${isAccepted ? "#16a34a" : "#dc2626"};">${headline}</h1>
        <p>Hi ${data.recipientName},</p>
        <p>${message}</p>
        <a href="${data.threadUrl}"
           style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          ${buttonText}
        </a>
        <p style="color: #666; font-size: 14px;">
          You can manage your email notification preferences in your profile settings.
        </p>
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
    subject: `New message from ${data.senderName} about your ${typeLabel}: "${data.bookTitle}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">New Message</h1>
        <p>Hi ${data.recipientName},</p>
        <p><strong>${data.senderName}</strong> sent you a message about your ${typeLabel} of <strong>${data.bookTitle}</strong>:</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #2563eb;">
          <p style="margin: 0; color: #374151;">${data.messagePreview}</p>
        </div>
        <a href="${data.threadUrl}"
           style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Reply
        </a>
        <p style="color: #666; font-size: 14px;">
          You can manage your email notification preferences in your profile settings.
        </p>
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
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Trade Proposal</h1>
        <p>Hi ${data.recipientName},</p>
        <p><strong>${data.proposerName}</strong> wants to trade with you!</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>They're offering:</strong> ${data.offeredBookTitle}</p>
          <p style="margin: 0;"><strong>For your book:</strong> ${data.requestedBookTitle}</p>
        </div>
        <a href="${data.threadUrl}"
           style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          View Trade Proposal
        </a>
        <p style="color: #666; font-size: 14px;">
          You can manage your email notification preferences in your profile settings.
        </p>
      </div>
    `,
  });
}
