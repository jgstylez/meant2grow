import { EmailProvider, EmailProviderConfig, SendEmailOptions } from "../types";

const RESEND_SEND_URL = "https://api.resend.com/emails";

function getResendMessageId(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const o = body as Record<string, unknown>;
  if (typeof o.id === "string" && o.id) return o.id;
  const data = o.data;
  if (data && typeof data === "object") {
    const id = (data as Record<string, unknown>).id;
    if (typeof id === "string" && id) return id;
  }
  return undefined;
}

function getResendErrorMessage(body: unknown, status: number): string {
  const fallback = `HTTP ${status}`;
  if (!body || typeof body !== "object") return fallback;
  const o = body as Record<string, unknown>;
  if (typeof o.message === "string" && o.message.trim()) return o.message;
  const err = o.error;
  if (err && typeof err === "object") {
    const em = (err as Record<string, unknown>).message;
    if (typeof em === "string" && em.trim()) return em;
  }
  if (Array.isArray(o.errors)) {
    const first = o.errors[0];
    if (first && typeof first === "object") {
      const m = (first as Record<string, unknown>).message;
      if (typeof m === "string" && m.trim()) return m;
    }
  }
  return fallback;
}

/**
 * Resend HTTP API provider.
 * Use when EMAIL_PROVIDER=resend (default).
 * Docs: https://resend.com/docs/api-reference/emails/send-email
 */
export function createResendProvider(config: EmailProviderConfig): EmailProvider {
  return {
    name: "resend",

    async send(options: SendEmailOptions) {
      if (!config.apiToken) {
        throw new Error("Email service not configured: API token is missing.");
      }
      if (!config.fromEmail) {
        throw new Error("Email service not configured: From email is missing.");
      }
      if (!options.to?.length) {
        throw new Error("No recipients specified for email");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const r of options.to) {
        if (!emailRegex.test(r.email)) {
          throw new Error(`Invalid email address: ${r.email}`);
        }
      }

      const payload: Record<string, unknown> = {
        from: `Meant2Grow <${config.fromEmail}>`,
        to: options.to.map((r) => r.email),
        subject: options.subject,
        html: options.html,
        text: options.text,
      };
      if (config.replyToEmail) {
        payload.reply_to = config.replyToEmail;
      }

      console.log(
        `[Resend] Attempting to send: ${options.subject} to ${options.to.map((t) => t.email).join(", ")}`
      );

      const response = await fetch(RESEND_SEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiToken}`,
        },
        body: JSON.stringify(payload),
      });

      const body: unknown = await response.json().catch(() => ({}));

      if (!response.ok) {
        const msg = getResendErrorMessage(body, response.status);
        console.error(`❌ [Resend] Failed:`, {
          subject: options.subject,
          recipients: options.to.map((t) => t.email),
          error: msg,
          status: response.status,
        });
        throw new Error(`Email sending failed: ${msg}`);
      }

      const messageId = getResendMessageId(body);

      console.log(
        `✅ [Resend] Email sent: ${options.subject} to ${options.to.map((t) => t.email).join(", ")}`
      );
      return {
        success: true,
        messageId,
      };
    },
  };
}
