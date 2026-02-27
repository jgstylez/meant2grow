# Email Provider Abstraction

Switch between **MailerSend** and **Mailtrap** via the `EMAIL_PROVIDER` environment variable.

## Configuration

| Variable | MailerSend | Mailtrap |
|----------|------------|----------|
| `EMAIL_PROVIDER` | `mailersend` (default) | `mailtrap` |
| API Token | `MAILERSEND_API_TOKEN` | `MAILTRAP_API_TOKEN` |
| From Email | `MAILERSEND_FROM_EMAIL` | Same (shared) |
| Reply To | `MAILERSEND_REPLY_TO_EMAIL` | Same (shared) |

## Switching Providers

1. Set `EMAIL_PROVIDER` to `mailersend` or `mailtrap`
2. Configure the corresponding API token:
   - **MailerSend**: Get token from [mailersend.com](https://mailersend.com) → API Tokens
   - **Mailtrap**: Get token from [mailtrap.io](https://mailtrap.io) → Sending Domains → API
3. Redeploy functions

**Note:** MailerSend and Mailtrap use different APIs. Use a MailerSend token when `EMAIL_PROVIDER=mailersend`; a Mailtrap token will return 401 Unauthenticated.
