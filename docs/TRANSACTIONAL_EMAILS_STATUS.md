# Transactional Emails Status & Troubleshooting

**Last Updated:** January 2025  
**Email Service:** MailerSend  
**Status:** ✅ **Migrated from Mailtrap - Setup Required**

---

## ⚠️ Current Issues

### Issue 1: Email Sending Not Working
**Symptoms:**
- Emails not being received
- No errors in logs but emails don't arrive
- Password reset emails not sending
- Invitation emails not sending

**Possible Causes:**
1. **MailerSend Configuration Issues:**
   - `MAILERSEND_API_TOKEN` not set or invalid
   - Domain not verified in MailerSend dashboard
   - FROM_EMAIL domain not verified
   - Environment variables not properly set in Firebase Functions

2. **Firebase Functions Configuration:**
   - Email service not properly initialized
   - Environment parameters not set in Firebase Console
   - Functions not deployed with latest code

3. **MailerSend Account Issues:**
   - API token expired or revoked
   - Account limits reached
   - Domain verification pending or failed

**Troubleshooting Steps:**

1. **Verify Environment Variables in Firebase Functions:**
   ```bash
   # Set MailerSend parameters using Firebase Functions secrets
   firebase functions:secrets:set MAILERSEND_API_TOKEN
   firebase functions:secrets:set MAILERSEND_FROM_EMAIL
   firebase functions:secrets:set MAILERSEND_REPLY_TO_EMAIL
   firebase functions:secrets:set VITE_APP_URL
   ```

2. **Check MailerSend Dashboard:**
   - Log into https://mailtrap.io
   - Verify API token is active
   - Check if emails are being received in sandbox (if sandbox mode enabled)
   - Verify sending domain is configured (for production)

3. **Test Email Sending:**
   ```bash
   # Test password reset email endpoint
   curl -X POST https://us-central1-meant2grow-dev.cloudfunctions.net/sendPasswordResetEmail \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","resetUrl":"https://meant2grow.com/reset?token=test","userName":"Test User"}'
   ```

4. **Check Function Logs:**
   ```bash
   firebase functions:log --only sendPasswordResetEmail
   ```

### Issue 2: Firebase Email Service Not Initialized
**Symptoms:**
- `getEmailService()` returns null
- Emails silently fail without errors

**Solution:**
- Ensure all MailerSend parameters are set in Firebase Functions
- Verify `getEmailService()` function in `functions/src/index.ts` is properly configured
- Check that `createEmailService()` factory function receives all required parameters
- Verify domain is verified in MailerSend dashboard

---

## ✅ Implemented Transactional Emails

### 1. **Welcome Emails**

#### Welcome Admin Email
- **Template:** `welcomeAdmin` in `functions/src/emailService.ts`
- **Trigger:** `onUserCreated` Firestore trigger (when admin user is created)
- **Function:** `sendWelcomeAdmin()`
- **Status:** ✅ Implemented
- **Includes:**
  - Organization name
  - Organization code for sharing
  - Setup instructions
  - "Get Started" button

#### Welcome Participant Email
- **Template:** `welcomeParticipant` in `functions/src/emailService.ts`
- **Trigger:** `onUserCreated` Firestore trigger (when mentor/mentee joins)
- **Function:** `sendWelcomeParticipant()`
- **Status:** ✅ Implemented
- **Includes:**
  - Role-specific messaging (Mentor vs Mentee)
  - Organization name
  - "Complete Your Profile" button

#### Welcome Back Email
- **Template:** `welcomeBack` in `functions/src/emailService.ts`
- **Trigger:** `authGoogle` function on user login
- **Function:** `sendWelcomeBack()`
- **Status:** ✅ Implemented
- **Includes:**
  - Dashboard overview
  - Quick links to key features

---

### 2. **Password Reset Email**

- **Template:** `passwordReset` in `functions/src/emailService.ts`
- **Trigger:** `sendPasswordResetEmail` Cloud Function endpoint
- **Function:** `sendPasswordReset()`
- **Endpoint:** `/api/auth/forgot-password.ts` → calls `sendPasswordResetEmail`
- **Status:** ⚠️ **Issues Reported**
- **Includes:**
  - Reset link (expires in 1 hour)
  - Security notice
  - Plain text fallback link

**Known Issues:**
- Email may not be sending due to MailerSend configuration
- Domain verification required before emails can be sent
- Reset token generation works, but email delivery may fail if domain not verified
- Check Firebase Functions logs for delivery errors

---

### 3. **Invitation Email**

- **Template:** `invitation` in `functions/src/emailService.ts`
- **Trigger:** `sendInvitationEmail` Cloud Function endpoint
- **Function:** `sendInvitation()`
- **Called from:** `App.tsx` → `handleSendInvite()`
- **Status:** ⚠️ **Issues Reported**
- **Includes:**
  - Inviter name (if provided)
  - Organization name
  - Role (Mentor/Mentee)
  - Personal note (optional)
  - Invitation link
  - "Accept Invitation" button

---

### 4. **Match Created Email**

- **Template:** `matchCreated` in `functions/src/emailService.ts`
- **Trigger:** `onMatchCreated` Firestore trigger
- **Function:** `sendMatchCreated()`
- **Sent to:** Both mentor and mentee when match is created
- **Status:** ✅ Implemented
- **Includes:**
  - Partner introduction
  - Skills/goals overview
  - Bio snippet
  - "Start Conversation" button

---

### 5. **Goal Completed Email**

- **Template:** `goalCompleted` in `functions/src/emailService.ts`
- **Trigger:** `onGoalCompleted` Firestore trigger (when goal status changes to "Completed")
- **Function:** `sendGoalCompleted()`
- **Status:** ✅ Implemented
- **Includes:**
  - Goal title and description
  - Congratulations message
  - "View Your Goals" button

---

### 6. **Meeting Reminder Email**

- **Template:** `meetingReminder` in `functions/src/emailService.ts`
- **Trigger:** `checkMeetingReminders` scheduled function (runs every hour)
- **Function:** `sendMeetingReminder()`
- **Sent:** 24 hours before and 1 hour before meeting
- **Status:** ✅ Implemented
- **Includes:**
  - Meeting title, date, time, duration
  - Google Meet link (if available)
  - "Join Meeting" button
  - "View Calendar" link

---

### 7. **Trial Ending Email**

- **Template:** `trialEnding` in `functions/src/emailService.ts`
- **Trigger:** `checkExpiringTrials` scheduled function (runs daily)
- **Function:** `sendTrialEnding()`
- **Status:** ✅ Implemented
- **Includes:**
  - Days remaining
  - Upgrade call-to-action
  - "Upgrade Now" button

---

## 📧 Email Configuration

### MailerSend Setup

All emails are sent via **MailerSend** using the following configuration:

**Firebase Functions Parameters (defineString/defineSecret):**
```typescript
MAILERSEND_API_TOKEN        // MailerSend API token (defineString)
MAILERSEND_FROM_EMAIL       // Default: "noreply@meant2grow.com" (defineString) - MUST be verified domain
MAILERSEND_REPLY_TO_EMAIL   // Default: "support@meant2grow.com" (defineString)
VITE_APP_URL                // Application URL for email links (defineString)
```

**Environment Variables (Local Development):**
```bash
VITE_MAILERSEND_API_TOKEN=your_token_here
VITE_MAILERSEND_FROM_EMAIL=noreply@meant2grow.com  # Must be verified in MailerSend
VITE_MAILERSEND_REPLY_TO_EMAIL=support@meant2grow.com
VITE_APP_URL=https://meant2grow.com
```

**Important:** Domain verification is required before sending emails. See [MAILERSEND_MIGRATION.md](./MAILERSEND_MIGRATION.md) for setup instructions.

### Email Service Location

- **Service:** `functions/src/emailService.ts`
- **Factory Function:** `createEmailService(config)`
- **Helper:** `getEmailService()` in `functions/src/index.ts`

---

## 🔄 Email Triggers Summary

| Email Type | Trigger Type | Location | Status |
|------------|--------------|----------|--------|
| Welcome Admin | Firestore Trigger | `onUserCreated` | ✅ Working |
| Welcome Participant | Firestore Trigger | `onUserCreated` | ✅ Working |
| Welcome Back | HTTP Function | `authGoogle` | ✅ Working |
| Password Reset | HTTP Function | `sendPasswordResetEmail` | ⚠️ Issues |
| Invitation | HTTP Function | `sendInvitationEmail` | ⚠️ Issues |
| Match Created | Firestore Trigger | `onMatchCreated` | ✅ Working |
| Goal Completed | Firestore Trigger | `onGoalCompleted` | ✅ Working |
| Meeting Reminder | Scheduled Function | `checkMeetingReminders` | ✅ Working |
| Trial Ending | Scheduled Function | `checkExpiringTrials` | ✅ Working |

---

## 🔧 Troubleshooting Guide

### Step 1: Verify MailerSend Configuration

1. **Check API Token:**
   - Log into MailerSend dashboard: https://app.mailersend.com
   - Go to Settings → API Tokens
   - Verify token is active and has sending permissions
   - Regenerate if needed

2. **Verify Domain:**
   - Go to Domains in MailerSend dashboard
   - Ensure your FROM_EMAIL domain is verified (e.g., meant2grow.com)
   - Check DNS records are correctly configured
   - Domain verification is REQUIRED before sending emails

3. **Check Email Activity:**
   - Go to Activity → Sent in MailerSend dashboard
   - Check for failed emails and error messages
   - Review delivery status

### Step 2: Check Firebase Functions

1. **Verify Parameters Are Set:**
   ```bash
   # List all function parameters
   firebase functions:config:get
   ```

2. **Set Missing Parameters:**
   ```bash
   firebase functions:secrets:set MAILERSEND_API_TOKEN
   firebase functions:secrets:set MAILERSEND_FROM_EMAIL
   firebase functions:secrets:set MAILERSEND_REPLY_TO_EMAIL
   firebase functions:secrets:set VITE_APP_URL
   ```

3. **Redeploy Functions:**
   ```bash
   firebase deploy --only functions
   ```

### Step 3: Test Email Endpoints

1. **Test Password Reset:**
   ```bash
   curl -X POST https://us-central1-meant2grow-dev.cloudfunctions.net/sendPasswordResetEmail \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "resetUrl": "https://meant2grow.com/reset?token=test123",
       "userName": "Test User"
     }'
   ```

2. **Check Function Logs:**
   ```bash
   firebase functions:log --only sendPasswordResetEmail --limit 50
   ```

### Step 4: Verify Email Service Initialization

Check `functions/src/index.ts`:
- `getEmailService()` function should return a valid email service instance
- All parameters should be properly retrieved from `defineString`/`defineSecret`
- Error handling should log failures without crashing

---

## ✅ Verification Checklist

- [x] All email templates created with HTML and plain text versions
- [x] MailerSend client properly configured
- [x] All triggers properly set up
- [x] Error handling implemented (emails don't break app on failure)
- [x] Reply-to email configured (`support@meant2grow.com`)
- [x] From email configured (`noreply@meant2grow.com`)
- [ ] **Domain verified in MailerSend** ⚠️ REQUIRED
- [ ] **Email sending verified in production** ⚠️
- [ ] **Password reset emails tested** ⚠️
- [ ] **Invitation emails tested** ⚠️

---

## 🚀 Next Steps

1. **Immediate Actions:**
   - [ ] Verify MailerSend API token is valid and active
   - [ ] **VERIFY DOMAIN in MailerSend dashboard** (REQUIRED before sending)
   - [ ] Check Firebase Functions parameters are set correctly
   - [ ] Test password reset email endpoint
   - [ ] Test invitation email endpoint
   - [ ] Check Firebase Functions logs for errors
   - [ ] Verify emails are being received (check MailerSend Activity dashboard)

2. **Configuration:**
   - [ ] Verify `MAILERSEND_FROM_EMAIL` domain is verified in MailerSend
   - [ ] Set all MailerSend environment variables in Firebase Functions
   - [ ] Test all email flows in production
   - [ ] Monitor MailerSend Activity dashboard for delivery status

3. **Monitoring:**
   - [ ] Set up email delivery monitoring
   - [ ] Track email open rates
   - [ ] Monitor bounce rates
   - [ ] Set up alerts for email failures

---

## 📝 Notes

- **Domain Verification Required:** MailerSend requires domain verification before sending emails. See [MAILERSEND_MIGRATION.md](./MAILERSEND_MIGRATION.md) for setup instructions.
- All emails include both HTML and plain text versions
- Email failures are logged but don't break the application
- Templates use inline CSS for maximum email client compatibility
- All emails include proper reply-to addresses
- Check MailerSend Activity dashboard for email delivery status and analytics

---

## 🔗 Related Documentation

- [Password Authentication Migration](./PASSWORD_AUTH_MIGRATION.md)
- [Firebase Functions Setup](./DEPLOYMENT.md)
- [Mailtrap Setup Guide](./MAILTRAP_SETUP.md)
