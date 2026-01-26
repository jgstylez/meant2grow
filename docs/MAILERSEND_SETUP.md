# MailerSend Email Setup Guide

This guide explains how to set up MailerSend for transactional emails in Meant2Grow, specifically for password reset emails.

## Overview

Meant2Grow uses MailerSend for sending transactional emails. The system sends emails for:
- **Password Reset**: When users request a password reset
- **Welcome Emails**: For new organization admins and participants
- **Match Notifications**: When mentors and mentees are matched
- **Goal Completed**: When users complete their goals
- **Trial Ending**: Reminder emails when free trial is ending

## Setup Instructions

### Step 1: Get Your MailerSend API Token

1. Go to [app.mailersend.com](https://app.mailersend.com) and sign up/log in
2. Navigate to **Settings** > **API Tokens**
3. Click **Create Token** or copy an existing token
4. Save the token (you'll need it in the next step)

### Step 2: Verify Your Domain in MailerSend

1. In MailerSend, go to **Sending** > **Domains**
2. Add your domain (e.g., `meant2grow.com`)
3. Follow the DNS verification steps to verify your domain
4. Once verified, you can use email addresses from that domain (e.g., `noreply@meant2grow.com`)

### Step 3: Set Firebase Functions Parameters

Firebase Functions v2 uses `defineString` for configuration. Set these parameters using Firebase CLI:

#### For Sandbox Environment

```bash
# Switch to sandbox project
firebase use sandbox

# Set MailerSend API Token
firebase functions:config:set mailersend.api_token="your_mailersend_api_token_here"

# Set from email address (must be verified in MailerSend)
firebase functions:config:set mailersend.from_email="noreply@meant2grow.com"

# Set reply-to email address
firebase functions:config:set mailersend.reply_to_email="support@meant2grow.com"

# Set application URL
firebase functions:config:set app.url="https://sandbox.meant2grow.com"
```

**Note**: Firebase Functions v2 `defineString` parameters are accessed differently. You may need to set them as environment variables or use the Firebase Console.

#### Alternative: Set via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (e.g., `meant2grow-dev`)
3. Go to **Functions** > **Configuration**
4. Click **Edit** and add these environment variables:
   - `MAILERSEND_API_TOKEN` = your MailerSend API token
   - `MAILERSEND_FROM_EMAIL` = `noreply@meant2grow.com`
   - `MAILERSEND_REPLY_TO_EMAIL` = `support@meant2grow.com`
   - `VITE_APP_URL` = `https://sandbox.meant2grow.com` (or your production URL)

#### For Production Environment

```bash
# Switch to production project
firebase use production

# Set the same parameters with production values
firebase functions:config:set mailersend.api_token="your_production_api_token"
firebase functions:config:set mailersend.from_email="noreply@meant2grow.com"
firebase functions:config:set mailersend.reply_to_email="support@meant2grow.com"
firebase functions:config:set app.url="https://meant2grow.com"
```

### Step 4: Deploy Functions

After setting the configuration, deploy your functions:

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

## Testing Password Reset Email

### Test via Frontend

1. Go to your app's login page
2. Click "Forgot Password"
3. Enter a valid email address
4. Check the email inbox (and spam folder)

### Check Function Logs

```bash
# View recent function logs
firebase functions:log --only forgotPassword

# Or view all logs and filter
firebase functions:log | grep -i "password\|mailersend\|email"
```

### Common Log Messages

**Success:**
```
✅ Password reset email sent successfully to user@example.com
```

**Configuration Missing:**
```
⚠️ MAILERSEND_API_TOKEN not configured. Email sending will fail.
```

**Email Sending Failed:**
```
❌ Failed to send password reset email: { error: "...", email: "..." }
```

## Troubleshooting

### Emails Not Sending

1. **Check if API token is configured:**
   - Look for warnings in function logs: `⚠️ MAILERSEND_API_TOKEN not configured`
   - Verify in Firebase Console > Functions > Configuration

2. **Check MailerSend domain verification:**
   - Go to MailerSend > Sending > Domains
   - Ensure your domain is verified
   - Ensure the "from" email uses a verified domain

3. **Check function logs for errors:**
   ```bash
   firebase functions:log | grep -i "error\|failed\|mailersend"
   ```

4. **Verify email address format:**
   - Ensure the email is valid and properly formatted
   - Check that the user exists in Firestore

### Common Issues

**Issue: "MAILERSEND_API_TOKEN not configured"**
- **Solution**: Set the `MAILERSEND_API_TOKEN` parameter in Firebase Functions configuration

**Issue: "Email service not configured: MAILERSEND_FROM_EMAIL is missing"**
- **Solution**: Set the `MAILERSEND_FROM_EMAIL` parameter

**Issue: "Invalid from email address"**
- **Solution**: Verify your domain in MailerSend and use an email from that domain

**Issue: "Email sending failed: Unauthorized"**
- **Solution**: Check that your MailerSend API token is valid and has sending permissions

**Issue: Emails going to spam**
- **Solution**: 
  - Verify your domain in MailerSend
  - Set up SPF, DKIM, and DMARC records
  - Use a verified "from" email address

## Security Notes

- Never commit API tokens to version control
- Use different API tokens for sandbox and production
- Rotate API tokens periodically
- Monitor email sending quotas and limits in MailerSend

## Additional Resources

- [MailerSend Documentation](https://developers.mailersend.com/)
- [MailerSend API Reference](https://developers.mailersend.com/api/v1/email)
- [Firebase Functions Configuration](https://firebase.google.com/docs/functions/config-env)
