# Match Email Notification Status

## ✅ Current Status

### Function Deployment
- **Status**: ✅ **DEPLOYED**
- **Function Name**: `onMatchCreated`
- **Type**: Firestore Trigger (v1)
- **Trigger**: `providers/cloud.firestore/eventTypes/document.create`
- **Resource**: `matches/{matchId}`
- **Location**: `us-central1`
- **Status**: ACTIVE
- **Version**: 6

### Function Implementation
- **Location**: `functions/src/index.ts` (lines 645-703)
- **Email Service**: `functions/src/emailService.ts`
- **Implementation**: ✅ Complete
  - Fetches mentor and mentee user data
  - Sends personalized emails to both parties
  - Includes error handling

## ⚠️ Configuration Issues

### Mailtrap Environment Variables
**Status**: ❌ **NOT CONFIGURED**

The function code uses `process.env.MAILTRAP_API_TOKEN` and other environment variables, but these are **not currently set** in the Firebase Functions environment.

**Required Environment Variables:**
- `MAILTRAP_API_TOKEN` - Your Mailtrap API token
- `MAILTRAP_USE_SANDBOX` - Set to `"true"` for testing, `"false"` for production
- `MAILTRAP_INBOX_ID` - (Optional) Inbox ID for sandbox mode
- `MAILTRAP_FROM_EMAIL` - Sender email address
- `MAILTRAP_REPLY_TO_EMAIL` - Reply-to email address
- `VITE_APP_URL` - Application URL (defaults to `https://meant2grow.com` if not set)

## 🔧 How to Fix

### Option 1: Configure via Firebase Console (Easiest)

1. Go to Firebase Console:
   ```
   https://console.firebase.google.com/project/meant2grow-dev/functions/config
   ```

2. Click **"Add variable"** for each required environment variable:
   - `MAILTRAP_API_TOKEN` = `your_mailtrap_api_token`
   - `MAILTRAP_USE_SANDBOX` = `true` (for testing) or `false` (for production)
   - `MAILTRAP_INBOX_ID` = `your_inbox_id` (if using sandbox)
   - `MAILTRAP_FROM_EMAIL` = `noreply@meant2grow.com`
   - `MAILTRAP_REPLY_TO_EMAIL` = `support@meant2grow.com`
   - `VITE_APP_URL` = `https://meant2grow.com` (or your production URL)

3. After adding variables, redeploy the function:
   ```bash
   cd functions
   npm run build
   cd ..
   firebase deploy --only functions:onMatchCreated
   ```

### Option 2: Update Code to Use defineString (Recommended)

This is a better approach as it uses Firebase Functions v2 params system. Update `functions/src/index.ts`:

```typescript
// Add near the top with other defineString calls
const mailtrapApiToken = defineString("MAILTRAP_API_TOKEN", {
  description: "Mailtrap API token for sending emails",
});

const mailtrapUseSandbox = defineString("MAILTRAP_USE_SANDBOX", {
  default: "true",
  description: "Use Mailtrap sandbox for testing",
});

// Then update emailService.ts to use these instead of process.env
```

Then set the secrets:
```bash
firebase functions:secrets:set MAILTRAP_API_TOKEN
# When prompted, paste your Mailtrap API token
```

### Option 3: Using gcloud CLI

```bash
gcloud functions deploy onMatchCreated \
  --update-env-vars MAILTRAP_API_TOKEN=your_token,MAILTRAP_USE_SANDBOX=true,MAILTRAP_FROM_EMAIL=noreply@meant2grow.com,MAILTRAP_REPLY_TO_EMAIL=support@meant2grow.com \
  --project=meant2grow-dev \
  --region=us-central1
```

## 📋 Testing

### Test the Function

1. Create a test match in Firestore:
   ```javascript
   // In Firebase Console > Firestore
   // Create a document in the "matches" collection:
   {
     organizationId: "your-org-id",
     mentorId: "mentor-user-id",
     menteeId: "mentee-user-id",
     status: "ACTIVE",
     startDate: "2025-12-31"
   }
   ```

2. Check function logs:
   ```bash
   firebase functions:log
   # Or filter for onMatchCreated:
   firebase functions:log | grep onMatchCreated
   ```

3. Check Mailtrap inbox (if using sandbox mode):
   - Go to https://mailtrap.io
   - Check your test inbox for the emails

### Expected Behavior

When a match is created:
1. ✅ Function triggers automatically
2. ✅ Fetches mentor and mentee data from Firestore
3. ✅ Sends email to mentor (if `MAILTRAP_API_TOKEN` is configured)
4. ✅ Sends email to mentee (if `MAILTRAP_API_TOKEN` is configured)
5. ✅ Logs errors if email sending fails (won't break the function)

## 🔍 Troubleshooting

### Emails Not Sending

1. **Check if Mailtrap is configured:**
   ```bash
   ./scripts/check-match-email-setup.sh
   ```

2. **Check function logs for errors:**
   ```bash
   firebase functions:log | grep -i "mailtrap\|email\|onMatchCreated"
   ```

3. **Common Issues:**
   - ❌ `MAILTRAP_API_TOKEN` not set → Emails won't send (function will log warning)
   - ❌ Invalid API token → Email service will fail silently
   - ❌ Sandbox mode enabled but no inbox ID → Emails may not appear
   - ❌ Function not deployed → Trigger won't fire

### Function Not Triggering

1. **Verify function is deployed:**
   ```bash
   firebase functions:list | grep onMatchCreated
   ```

2. **Check Firestore rules:**
   - Ensure matches can be created
   - Check that the trigger has proper permissions

3. **Check function logs:**
   ```bash
   firebase functions:log
   ```

## 📚 Related Documentation

- **Mailtrap Setup**: `docs/MAILTRAP_SETUP.md`
- **Firebase Deployment**: `docs/FIREBASE_DEPLOYMENT.md`
- **Email Service Code**: `functions/src/emailService.ts`
- **Function Code**: `functions/src/index.ts` (lines 645-703)

## ✅ Next Steps

1. **Configure Mailtrap environment variables** (choose one option above)
2. **Test by creating a match** in Firestore
3. **Verify emails are received** in Mailtrap inbox (sandbox) or actual email (production)
4. **Monitor logs** to ensure no errors

---

**Last Updated**: 2025-12-31
**Status**: Function deployed, Mailtrap configuration needed
