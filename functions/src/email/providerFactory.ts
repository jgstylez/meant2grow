import { EmailProvider, EmailProviderConfig, EmailProviderName } from "./types";
import { createMailerSendProvider } from "./providers/mailersendProvider";
import { createMailtrapProvider } from "./providers/mailtrapProvider";

/**
 * Creates the configured email provider.
 * Set EMAIL_PROVIDER to "mailersend" or "mailtrap" to switch.
 * Default: mailersend
 */
export function createEmailProvider(
  providerName: EmailProviderName,
  config: EmailProviderConfig
): EmailProvider {
  switch (providerName) {
    case "mailersend":
      return createMailerSendProvider(config);
    case "mailtrap":
      return createMailtrapProvider(config);
    default:
      console.warn(
        `⚠️ Unknown EMAIL_PROVIDER "${providerName}", defaulting to mailersend`
      );
      return createMailerSendProvider(config);
  }
}
