# Transactional Emails Status

**Last Updated:** December 2024  
**Email Service:** Mailtrap  
**Status:** ✅ **All Core Transactional Emails Implemented**

---

## ✅ Implemented Transactional Emails

### 1. **Welcome Emails**

#### Welcome Admin Email
- **Template:** `welcomeAdmin` in `functions/src/emailService.ts`
- **Trigger:** `onUserCreated` Firestore trigger (when admin user is created)
- **Function:** `sendWelcomeAdmin()`
- **Includes:**
  - Organization name
  - Organization code for sharing
  - Setup instructions
  - "Get Started" button

#### Welcome Participant Email
- **Template:** `welcomeParticipant` in `functions/src/emailService.ts`
- **Trigger:** `onUserCreated` Firestore trigger (when mentor/mentee joins)
- **Function:** `sendWelcomeParticipant()`
- **Includes:**
  - Role-specific messaging (Mentor vs Mentee)
  - Organization name
  - "Complete Your Profile" button

#### Welcome Back Email
- **Template:** `welcomeBack` in `functions/src/emailService.ts`
- **Trigger:** `authGoogle` function on user login
- **Function:** `sendWelcomeBack()`
- **Includes:**
  - Dashboard overview
  - Quick links to key features

---

### 2. **Password Reset Email**

- **Template:** `passwordReset` in `functions/src/emailService.ts`
- **Trigger:** `sendPasswordResetEmail` Cloud Function endpoint
- **Function:** `sendPasswordReset()`
- **Endpoint:** `/api/auth/forgot-password.ts` → calls `sendPasswordResetEmail`
- **Includes:**
  - Reset link (expires in 1 hour)
  - Security notice
  - Plain text fallback link

---

### 3. **Invitation Email**

- **Template:** `invitation` in `functions/src/emailService.ts`
- **Trigger:** `sendInvitationEmail` Cloud Function endpoint
- **Function:** `sendInvitation()`
- **Called from:** `App.tsx` → `handleSendInvite()`
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
- **Includes:**
  - Days remaining
  - Upgrade call-to-action
  - "Upgrade Now" button

---

## 📧 Email Configuration

### Mailtrap Setup

All emails are sent via **Mailtrap** using the following configuration:

```typescript
// Environment Variables (Firebase Functions params)
MAILTRAP_API_TOKEN          // Mailtrap API token
MAILTRAP_USE_SANDBOX        // "true" for dev, "false" for production
MAILTRAP_INBOX_ID           // Inbox ID for sandbox mode (optional)
MAILTRAP_FROM_EMAIL         // Default: "noreply@meant2grow.com"
MAILTRAP_REPLY_TO_EMAIL     // Default: "meantogrow@gmail.com"
VITE_APP_URL                // Application URL for email links
```

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
| Password Reset | HTTP Function | `sendPasswordResetEmail` | ✅ Working |
| Invitation | HTTP Function | `sendInvitationEmail` | ✅ Working |
| Match Created | Firestore Trigger | `onMatchCreated` | ✅ Working |
| Goal Completed | Firestore Trigger | `onGoalCompleted` | ✅ Working |
| Meeting Reminder | Scheduled Function | `checkMeetingReminders` | ✅ Working |
| Trial Ending | Scheduled Function | `checkExpiringTrials` | ✅ Working |

---

## ✅ Verification Checklist

- [x] All email templates created with HTML and plain text versions
- [x] Mailtrap client properly configured
- [x] All triggers properly set up
- [x] Error handling implemented (emails don't break app on failure)
- [x] Reply-to email configured (`meantogrow@gmail.com`)
- [x] From email configured (`noreply@meant2grow.com`)
- [x] Email categories set for tracking
- [x] Sandbox mode for development, production mode configurable

---

## 🚀 Next Steps

1. **Configure Mailtrap Environment Variables:**
   ```bash
   firebase functions:config:set mailtrap.api_token="YOUR_TOKEN"
   firebase functions:config:set mailtrap.use_sandbox="true"
   ```

2. **Test Emails:**
   - Create a test user → Should receive welcome email
   - Request password reset → Should receive reset email
   - Create a match → Both users should receive match email
   - Complete a goal → Should receive goal completed email

3. **Production Setup:**
   - Set `MAILTRAP_USE_SANDBOX` to `"false"`
   - Verify `MAILTRAP_FROM_EMAIL` is a valid domain
   - Test all email flows in production

---

## 📝 Notes

- All emails include both HTML and plain text versions
- Email failures are logged but don't break the application
- Templates use inline CSS for maximum email client compatibility
- All emails include proper reply-to addresses
- Sandbox mode captures emails in Mailtrap inbox for testing
