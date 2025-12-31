# Mailtrap Configuration with defineString

The codebase has been updated to use Firebase Functions v2 `defineString` for Mailtrap configuration, making it more explicit and easier to manage.

## Configuration Parameters

The following parameters are now defined in `functions/src/index.ts`:

- `MAILTRAP_API_TOKEN` - Your Mailtrap API token (required)
- `MAILTRAP_USE_SANDBOX` - Set to `"true"` for testing, `"false"` for production (default: `"true"`)
- `MAILTRAP_INBOX_ID` - Inbox ID for sandbox mode (optional, default: `""`)
- `MAILTRAP_FROM_EMAIL` - From email address (default: `"noreply@meant2grow.com"`)
- `MAILTRAP_REPLY_TO_EMAIL` - Reply-to email address (default: `"support@meant2grow.com"`)
- `VITE_APP_URL` - Application URL for email links (default: `"https://meant2grow.com"`)

## Setting Up Mailtrap Configuration

### Step 1: Get Your Mailtrap API Token

1. Go to [mailtrap.io](https://mailtrap.io) and log in
2. Navigate to **Settings** > **API Tokens**
3. Click **Create Token** or copy an existing token
4. Save the token (you'll need it in the next step)

### Step 2: Set Configuration Values

Use Firebase CLI to set each parameter:

```bash
# Set Mailtrap API Token (required)
firebase functions:secrets:set MAILTRAP_API_TOKEN
# When prompted, paste your Mailtrap API token

# Set sandbox mode (true for testing, false for production)
firebase functions:secrets:set MAILTRAP_USE_SANDBOX
# When prompted, enter: true (for testing) or false (for production)

# Set inbox ID (only needed if using sandbox mode)
firebase functions:secrets:set MAILTRAP_INBOX_ID
# When prompted, enter your Mailtrap inbox ID (or leave empty)

# Set from email address
firebase functions:secrets:set MAILTRAP_FROM_EMAIL
# When prompted, enter: noreply@meant2grow.com (or your verified domain)

# Set reply-to email address
firebase functions:secrets:set MAILTRAP_REPLY_TO_EMAIL
# When prompted, enter: support@meant2grow.com

# Set application URL
firebase functions:secrets:set VITE_APP_URL
# When prompted, enter: https://meant2grow.com (or your production URL)
```

### Alternative: Set All at Once

You can also set multiple values in one command:

```bash
firebase functions:secrets:set MAILTRAP_API_TOKEN MAILTRAP_USE_SANDBOX MAILTRAP_FROM_EMAIL MAILTRAP_REPLY_TO_EMAIL VITE_APP_URL
```

Then enter each value when prompted.

### Step 3: Verify Configuration

Check that your secrets are set:

```bash
# List all secrets (if command exists)
firebase functions:secrets:list

# Or check in Google Cloud Console
# Go to: https://console.cloud.google.com/secret-manager?project=meant2grow-dev
```

### Step 4: Deploy Functions

After setting the secrets, deploy your functions:

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

## Testing

### Test Match Email Notification

1. Create a test match in Firestore:
   - Go to Firebase Console > Firestore
   - Create a document in the `matches` collection:
     ```json
     {
       "organizationId": "your-org-id",
       "mentorId": "mentor-user-id",
       "menteeId": "mentee-user-id",
       "status": "ACTIVE",
       "startDate": "2025-12-31"
     }
     ```

2. Check function logs:
   ```bash
   firebase functions:log | grep onMatchCreated
   ```

3. Check Mailtrap inbox:
   - If `MAILTRAP_USE_SANDBOX` is `"true"`, check your Mailtrap test inbox
   - If `MAILTRAP_USE_SANDBOX` is `"false"`, check the actual email addresses

## Troubleshooting

### Emails Not Sending

1. **Check if secrets are set:**
   ```bash
   ./scripts/check-match-email-setup.sh
   ```

2. **Check function logs:**
   ```bash
   firebase functions:log | grep -i "mailtrap\|email\|onMatchCreated"
   ```

3. **Common issues:**
   - `MAILTRAP_API_TOKEN` not set → Function will log: "MAILTRAP_API_TOKEN not set. Email sending will be disabled."
   - Invalid API token → Check Mailtrap dashboard for token validity
   - Sandbox mode enabled but wrong inbox ID → Emails may not appear in expected inbox

### Function Not Triggering

1. **Verify function is deployed:**
   ```bash
   firebase functions:list | grep onMatchCreated
   ```

2. **Check Firestore rules:**
   - Ensure matches can be created
   - Verify trigger has proper permissions

## Production Setup

When ready for production:

1. **Verify your sending domain in Mailtrap:**
   - Go to Mailtrap > Sending Domains
   - Add and verify your domain (e.g., `meant2grow.com`)
   - Set up SPF, DKIM, and DMARC records

2. **Update configuration:**
   ```bash
   # Set sandbox to false
   firebase functions:secrets:set MAILTRAP_USE_SANDBOX
   # Enter: false

   # Update from email to use verified domain
   firebase functions:secrets:set MAILTRAP_FROM_EMAIL
   # Enter: noreply@meant2grow.com (or your verified domain)

   # Update app URL to production
   firebase functions:secrets:set VITE_APP_URL
   # Enter: https://meant2grow.com (or your production URL)
   ```

3. **Redeploy functions:**
   ```bash
   firebase deploy --only functions
   ```

## Code Changes

The refactoring includes:

1. **`functions/src/index.ts`:**
   - Added `defineString` calls for all Mailtrap configuration
   - Created `getEmailService()` helper function

2. **`functions/src/emailService.ts`:**
   - Refactored to accept `EmailServiceConfig` interface
   - Created `createEmailService()` factory function
   - Templates now accept `appUrl` as parameter

## Benefits

- ✅ **Explicit configuration** - All config values are clearly defined
- ✅ **Type-safe** - TypeScript interfaces ensure correct configuration
- ✅ **Easy to manage** - Use Firebase CLI to set/update values
- ✅ **Better defaults** - Sensible defaults for optional values
- ✅ **Environment-specific** - Easy to switch between test and production

---

**Last Updated**: 2025-12-31
**Status**: ✅ Code updated to use defineString
