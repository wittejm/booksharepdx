import { Resend } from 'resend';
import { env } from '../config/env.js';

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
      console.error('[EMAIL] Failed to send:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[EMAIL] Error sending email:', error);
    return false;
  }
}

export async function sendMagicLinkEmail(to: string, magicLinkUrl: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'Sign in to BookSharePDX',
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

export async function sendWelcomeEmail(to: string, username: string, verifyUrl: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: 'Welcome to BookSharePDX!',
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
