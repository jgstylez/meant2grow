# Forgot Password Email Not Sending - Fix Guide

## Quick Diagnosis

The forgot password feature isn't sending emails. This is likely due to missing MailerSend configuration in Firebase Functions.

## Immediate Steps to Fix

### Step 1: Check Firebase Functions Logs

Check the logs to see the actual error:

```bash
# View recent forgotPassword function logs
firebase functions:log --only forgotPassword

# Or view all logs and filter for email/password reset
firebase functions:log | grep -i "password\|mailersend\|email\|forgot"
```

Look for these error messages:
- `⚠️ MAILERSEND_API_TOKEN not configured` - API token is missing
- `⚠️ MAILERSEND_FROM_EMAIL not configured` - From email is missing
- `❌ Failed to send password reset email` - Email sending failed

### Step 2: Set MailerSend Configuration

Firebase Functions v2 uses `defineString` for configuration. Set these parameters:

#### Option A: Using Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (e.g., `meant2grow-dev` for sandbox)
3. Navigate to **Functions** > **Configuration** > **Environment Variables**
4. Add these variables:
   - `MAILERSEND_API_TOKEN` = Your MailerSend API token
   - `MAILERSEND_FROM_EMAIL` = `noreply@meant2grow.com` (must be verified in MailerSend)
   - `MAILERSEND_REPLY_TO_EMAIL` = `support@meant2grow.com`
   - `VITE_APP_URL` = `https://sandbox.meant2grow.com` (or your production URL)

#### Option B: Using Firebase CLI

```bash
# Switch to your project
firebase use sandbox  # or 'production'

# Set parameters (Firebase Functions v2 defineString)
# Note: These may need to be set via Firebase Console or gcloud
# Check Firebase Functions v2 documentation for exact syntax
```

**Note**: Firebase Functions v2 `defineString` parameters are set differently than v1. You may need to:
1. Use Firebase Console (recommended)
2. Or set them during deployment
3. Or use Google Cloud Secret Manager for sensitive values

### Step 3: Verify MailerSend Setup

1. **Get MailerSend API Token:**
   - Go to [app.mailersend.com](https://app.mailersend.com)
   - Navigate to **Settings** > **API Tokens**
   - Create or copy your API token

2. **Verify Domain in MailerSend:**
   - Go to **Sending** > **Domains**
   - Ensure `meant2grow.com` (or your domain) is verified
   - The "from" email must use a verified domain

3. **Test Email Sending:**
   - After setting configuration, try the forgot password flow again
   - Check Firebase Functions logs for success/error messages

### Step 4: Redeploy Functions (if needed)

After setting configuration, you may need to redeploy:

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions:forgotPassword
```

## Understanding the Error Logs

The improved error logging will show:

```
📧 Email service configuration: {
  hasApiToken: true/false,
  apiTokenLength: 0 or actual length,
  fromEmail: "noreply@meant2grow.com" or "NOT SET",
  replyToEmail: "support@meant2grow.com" or "NOT SET",
  appUrl: "https://sandbox.meant2grow.com" or "NOT SET"
}
```

If you see `hasApiToken: false` or `fromEmail: "NOT SET"`, the configuration is missing.

## Common Issues and Solutions

### Issue: "MAILERSEND_API_TOKEN not configured"

**Solution:**
1. Get your API token from MailerSend
2. Set it in Firebase Console > Functions > Configuration > Environment Variables
3. Redeploy functions if needed

### Issue: "Email service not configured: MAILERSEND_FROM_EMAIL is missing"

**Solution:**
1. Set `MAILERSEND_FROM_EMAIL` in Firebase Console
2. Ensure the email uses a verified domain in MailerSend

### Issue: "Email sending failed: Unauthorized"

**Solution:**
1. Verify your MailerSend API token is valid
2. Check that the token has sending permissions
3. Ensure your domain is verified in MailerSend

### Issue: Emails sent but not received

**Solution:**
1. Check spam folder
2. Verify domain verification in MailerSend
3. Check MailerSend dashboard for delivery status
4. Ensure SPF/DKIM records are set up

## Testing

After configuration:

1. **Test via Frontend:**
   - Go to login page
   - Click "Forgot Password"
   - Enter a valid email
   - Check inbox (and spam)

2. **Check Logs:**
   ```bash
   firebase functions:log | grep -i "password\|mailersend"
   ```

3. **Look for Success Message:**
   ```
   ✅ Password reset email sent successfully to user@example.com
   ```

## Additional Resources

- [MailerSend Setup Guide](./MAILERSEND_SETUP.md)
- [Firebase Functions Configuration](https://firebase.google.com/docs/functions/config-env)
- [MailerSend API Documentation](https://developers.mailersend.com/)

## Need Help?

If emails still aren't sending after following these steps:

1. Check Firebase Functions logs for detailed error messages
2. Verify MailerSend account status and domain verification
3. Check MailerSend dashboard for any account limits or issues
4. Review the error details in the function logs (now includes more information)
