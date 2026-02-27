import { EmailProvider, EmailProviderConfig, SendEmailOptions } from "../types";

const MAILTRAP_SEND_URL = "https://send.api.mailtrap.io/api/send";

/**
 * Mailtrap Email Sending API provider.
 * Use when EMAIL_PROVIDER=mailtrap.
 * Docs: https://api-docs.mailtrap.io/
 */
export function createMailtrapProvider(config: EmailProviderConfig): EmailProvider {
  return {
    name: "mailtrap",

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

      const payload = {
        from: { email: config.fromEmail, name: "Meant2Grow" },
        to: options.to.map((r) => ({ email: r.email, name: r.name || r.email })),
        reply_to: { email: config.replyToEmail, name: "Meant2Grow" },
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      console.log(
        `[Mailtrap] Attempting to send: ${options.subject} to ${options.to.map((t) => t.email).join(", ")}`
      );

      const response = await fetch(MAILTRAP_SEND_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Token": config.apiToken,
        },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const msg = body?.errors?.[0] || body?.message || `HTTP ${response.status}`;
        console.error(`❌ [Mailtrap] Failed:`, {
          subject: options.subject,
          recipients: options.to.map((t) => t.email),
          error: msg,
          status: response.status,
        });
        throw new Error(`Email sending failed: ${msg}`);
      }

      console.log(
        `✅ [Mailtrap] Email sent: ${options.subject} to ${options.to.map((t) => t.email).join(", ")}`
      );
      return {
        success: true,
        messageId: body?.message_ids?.[0],
      };
    },
  };
}
