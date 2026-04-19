# Transactional email (Cloud Functions)

**Resend** is the default provider. **MailerSend** is supported for mailersend-only mode or as an automatic fallback when the primary Resend send fails (if `MAILERSEND_API_TOKEN` is set).

Set `EMAIL_PROVIDER` and API credentials as Firebase Functions parameters (see `functions/src/index.ts`).

| Variable | Resend (default) | MailerSend-only |
|----------|------------------|-----------------|
| `EMAIL_PROVIDER` | `resend` | `mailersend` |
| Primary API key | `RESEND_API_KEY` | `MAILERSEND_API_TOKEN` |
| Backup | `MAILERSEND_API_TOKEN` (optional) | — |
| From / reply | `MAILERSEND_FROM_EMAIL`, `MAILERSEND_REPLY_TO_EMAIL` (shared names; must match your verified domain in each provider) | same |

1. Set `RESEND_API_KEY` from [resend.com](https://resend.com) → API Keys.
2. Optionally set `MAILERSEND_API_TOKEN` for fallback or for `EMAIL_PROVIDER=mailersend`.
3. Verify the sending domain in Resend (and MailerSend if used).
