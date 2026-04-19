/**
 * Shared types for email provider abstraction.
 * Switch providers via EMAIL_PROVIDER env (resend | mailersend).
 */

export interface SendEmailOptions {
  to: { email: string; name?: string }[];
  subject: string;
  html: string;
  text: string;
  category?: string;
}

export interface EmailProviderConfig {
  apiToken: string;
  fromEmail: string;
  replyToEmail: string;
  appUrl: string;
}

export interface EmailProvider {
  readonly name: string;
  send(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string }>;
}

export type EmailProviderName = "resend" | "mailersend";
