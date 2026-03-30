import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import { EmailProvider, EmailProviderConfig, SendEmailOptions } from "../types";
import { agentDebugLog } from "../../agentDebugLog";

export function createMailerSendProvider(config: EmailProviderConfig): EmailProvider {
  const client = new MailerSend({ apiKey: config.apiToken });
  const from = { name: "Meant2Grow", email: config.fromEmail };
  const replyTo = config.replyToEmail;

  return {
    name: "mailersend",

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

      const sentFrom = new Sender(from.email, from.name);
      const recipients = options.to.map(
        (r) => new Recipient(r.email, r.name || r.email)
      );

      const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setReplyTo(new Sender(replyTo, from.name))
        .setSubject(options.subject)
        .setHtml(options.html)
        .setText(options.text);

      console.log(
        `[MailerSend] Attempting to send: ${options.subject} to ${options.to.map((t) => t.email).join(", ")}`
      );

      // #region agent log
      {
        const fromDomain = from.email.includes("@")
          ? (from.email.split("@")[1] ?? "")
          : "";
        agentDebugLog({
          location: "mailersendProvider.ts:send",
          message: "before MailerSend API send",
          hypothesisId: "H2,H4",
          data: {
            tokenLength: config.apiToken.length,
            fromDomain,
          },
        });
      }
      // #endregion

      try {
        const response = await client.email.send(emailParams);
        console.log(
          `✅ [MailerSend] Email sent: ${options.subject} to ${options.to.map((t) => t.email).join(", ")}`
        );
        return {
          success: true,
          messageId: response.body?.message_id,
        };
      } catch (error: any) {
        const msg =
          error?.body?.message || error?.message || "Unknown error";
        console.error(`❌ [MailerSend] Failed:`, {
          subject: options.subject,
          recipients: options.to.map((t) => t.email),
          error: msg,
          statusCode: error?.response?.statusCode ?? error?.statusCode,
        });
        const hint =
          typeof msg === "string" &&
          /unauthenticated|401|invalid.*token/i.test(msg)
            ? " Verify MAILERSEND_API_TOKEN is set for this Firebase project and the token has sending permissions."
            : "";
        // #region agent log
        agentDebugLog({
          location: "mailersendProvider.ts:catch",
          message: "MailerSend API error",
          hypothesisId: "H4",
          data: {
            apiMessage: typeof msg === "string" ? msg.slice(0, 160) : String(msg),
            statusCode: error?.response?.statusCode ?? error?.statusCode ?? null,
          },
        });
        // #endregion
        throw new Error(`Email sending failed: ${msg}.${hint}`);
      }
    },
  };
}
