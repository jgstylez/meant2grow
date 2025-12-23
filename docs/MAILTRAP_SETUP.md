# Mailtrap Email Setup Guide

This guide explains how to set up Mailtrap for transactional emails in Meant2Grow.

## Overview

Meant2Grow uses Mailtrap for sending transactional emails. The system automatically sends emails for key user engagement events:

- **User Signup**: Welcome emails for new organization admins and participants
- **User Login**: Welcome back emails when users log in
- **Match Created**: Notifications when mentors and mentees are matched
- **Goal Completed**: Celebration emails when users complete their goals
- **Trial Ending**: Reminder emails when free trial is ending (for future Stripe integration)

## Setup Instructions

### 1. Create a Mailtrap Account

1. Go to [mailtrap.io](https://mailtrap.io) and sign up for an account
2. Choose the plan that fits your needs (Free tier available for testing)

### 2. Get Your API Token

1. Log in to Mailtrap
2. Go to **Settings** > **API Tokens**
3. Click **Create Token**
4. Copy the token (you'll need it for environment variables)

### 3. Set Up Sandbox (for Testing)

1. In Mailtrap, go to **Email Testing** > **Inboxes**
2. Create a new inbox or use the default one
3. Copy the **Inbox ID** (you'll need it for sandbox mode)

### 4. Configure Environment Variables

#### For Firebase Functions (Server-side)

Add these to your Firebase Functions environment:

```bash
# Set via Firebase CLI
firebase functions:config:set mailtrap.api_token="your_api_token_here"
firebase functions:config:set mailtrap.use_sandbox="true"
firebase functions:config:set mailtrap.inbox_id="your_inbox_id_here"
firebase functions:config:set mailtrap.from_email="noreply@meant2grow.com"
firebase functions:config:set mailtrap.reply_to_email="support@meant2grow.com"
```

Or set them as environment variables in Firebase Console:
- Go to Firebase Console > Functions > Configuration
- Add the following environment variables:
  - `MAILTRAP_API_TOKEN`
  - `MAILTRAP_USE_SANDBOX` (set to `true` for testing, `false` for production)
  - `MAILTRAP_INBOX_ID` (only needed for sandbox mode)
  - `MAILTRAP_FROM_EMAIL`
  - `MAILTRAP_REPLY_TO_EMAIL`
  - `VITE_APP_URL` (your application URL)

#### For Local Development

Create a `.env.local` file in the project root (see `env.local.example`):

```bash
MAILTRAP_API_TOKEN=your_api_token_here
MAILTRAP_USE_SANDBOX=true
MAILTRAP_INBOX_ID=your_inbox_id_here
MAILTRAP_FROM_EMAIL=noreply@meant2grow.com
MAILTRAP_REPLY_TO_EMAIL=support@meant2grow.com
VITE_APP_URL=http://localhost:5173
```

### 5. Set Up Sending Domain (Production)

For production emails, you need to verify your sending domain:

1. In Mailtrap, go to **Sending Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `meant2grow.com`)
4. Follow the DNS setup instructions to verify your domain
5. Once verified, update `MAILTRAP_FROM_EMAIL` to use your verified domain

## Email Events

### Automatic Email Triggers

The following events automatically trigger emails:

1. **Organization Admin Signup** (`authGoogle` function)
   - Triggered when a new organization is created
   - Sends welcome email with organization code

2. **Participant Signup** (`authGoogle` function)
   - Triggered when a user joins an existing organization
   - Sends welcome email based on role (mentor/mentee)

3. **User Login** (`authGoogle` function)
   - Triggered when an existing user logs in
   - Sends welcome back email

4. **Match Created** (`onMatchCreated` Firestore trigger)
   - Triggered when a new match is created in Firestore
   - Sends notification emails to both mentor and mentee

5. **Goal Completed** (`onGoalCompleted` Firestore trigger)
   - Triggered when a goal's status changes to "Completed"
   - Sends celebration email to the user

### Future Email Events

- **Trial Ending**: Will be triggered when Stripe integration is added
- **Password Reset**: Can be added when password reset functionality is implemented

## Testing

### Sandbox Mode

When `MAILTRAP_USE_SANDBOX` is set to `true`, emails are sent to your Mailtrap inbox instead of real recipients. This is perfect for:

- Development and testing
- Previewing email templates
- Debugging email content

### Production Mode

When `MAILTRAP_USE_SANDBOX` is set to `false`, emails are sent to real recipients. Make sure:

1. Your sending domain is verified
2. You have sufficient credits in your Mailtrap account
3. You've tested thoroughly in sandbox mode first

## Email Templates

Email templates are defined in:
- `services/emailService.ts` (client-side, for reference)
- `functions/src/emailService.ts` (server-side, used by Firebase Functions)

Templates include:
- HTML version (styled with inline CSS)
- Plain text version (for email clients that don't support HTML)

## Troubleshooting

### Emails Not Sending

1. Check that `MAILTRAP_API_TOKEN` is set correctly
2. Verify your Mailtrap account has sufficient credits
3. Check Firebase Functions logs for errors:
   ```bash
   firebase functions:log
   ```
4. Ensure environment variables are set in Firebase Console

### Emails Going to Spam

1. Verify your sending domain in Mailtrap
2. Set up SPF, DKIM, and DMARC records (Mailtrap provides instructions)
3. Use a verified domain in `MAILTRAP_FROM_EMAIL`

### Testing Locally

1. Make sure `.env.local` is configured
2. Run Firebase emulators:
   ```bash
   firebase emulators:start
   ```
3. Check Mailtrap inbox for test emails

## Integration with Stripe

When you're ready to integrate Stripe for payments:

1. The `sendTrialEnding` function is already implemented in `services/emailService.ts`
2. You'll need to create a scheduled Firebase Function to check for expiring trials
3. Call `emailService.sendTrialEnding()` when a trial is about to expire

## Support

- Mailtrap Documentation: https://mailtrap.io/docs
- Mailtrap API Reference: https://api-docs.mailtrap.io
- Firebase Functions Docs: https://firebase.google.com/docs/functions

