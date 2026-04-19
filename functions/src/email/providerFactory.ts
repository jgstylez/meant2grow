import { EmailProvider, EmailProviderConfig, EmailProviderName } from "./types";
import { createMailerSendProvider } from "./providers/mailersendProvider";
import { createResendProvider } from "./providers/resendProvider";

/**
 * Creates the configured email provider.
 * Set EMAIL_PROVIDER to "resend" (default) or "mailersend".
 */
export function createEmailProvider(
  providerName: EmailProviderName,
  config: EmailProviderConfig
): EmailProvider {
  switch (providerName) {
    case "resend":
      return createResendProvider(config);
    case "mailersend":
      return createMailerSendProvider(config);
    default:
      console.warn(
        `⚠️ Unknown EMAIL_PROVIDER "${providerName}", defaulting to resend`
      );
      return createResendProvider(config);
  }
}
