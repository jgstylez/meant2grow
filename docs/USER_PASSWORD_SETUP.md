# User Password Setup Guide

**Last Updated:** January 2026

## Problem

Users exist in Firestore but don't have Firebase Auth accounts (or have accounts without passwords), so they can't log in.

## Solution: Use `set-user-password` Script

We've created a script to manually set passwords for any user (mentees, mentors, org admins, etc.).

### Usage

```bash
# For sandbox/dev (default)
npm run set-user-password user@example.com "SecurePassword123"

# For production
firebase use production
npm run set-user-password user@example.com "SecurePassword123"
```

### What It Does

1. Finds the user by email in Firestore
2. Checks if they have a Firebase Auth account:
   - If they have `firebaseAuthUid` in Firestore → updates password
   - If account exists by email but no `firebaseAuthUid` → updates password and links it
   - If no account exists → creates new Firebase Auth account with password
3. Updates the Firestore user document with the `firebaseAuthUid`
4. Provides clear feedback about what happened

### Password Requirements

- At least 8 characters long
- Contains at least one lowercase letter
- Contains at least one uppercase letter
- Contains at least one number

### Examples

```bash
# Basic usage
npm run set-user-password john@example.com "MyPassword123"

# With special characters (use single quotes)
npm run set-user-password jane@example.com '!SecurePass123'

# For production environment
firebase use production
npm run set-user-password admin@company.com "AdminPass123"
```

## Debugging Authentication Errors

If you see errors like:
- `Failed to create Firebase Auth account`
- `Email already in use, attempting to sign in instead`
- `Failed to sign in after email-already-in-use error`

### Step 1: Check the Console Logs

Look for detailed error information in the browser console. The improved error handling will show:
- Error code (e.g., `auth/invalid-credential`, `auth/user-not-found`)
- Error message
- Email and user ID

### Step 2: Use the Script to Set Password

If a user exists in Firestore but can't log in:

```bash
npm run set-user-password user@example.com "NewPassword123"
```

### Step 3: Test Login

After setting the password, the user should be able to log in with:
- Email: `user@example.com`
- Password: `NewPassword123`

## Fixing Forgot Password Flow

If the forgot password feature isn't working:

### Check Firebase Functions Logs

```bash
firebase functions:log --only forgotPassword
```

Look for:
- Email service configuration errors
- MailerSend API token issues
- Missing environment variables

### Verify Email Configuration

Ensure these are set in Firebase Functions:
- `MAILERSEND_API_TOKEN`
- `MAILERSEND_FROM_EMAIL`
- `MAILERSEND_REPLY_TO_EMAIL`
- `VITE_APP_URL`

See [FORGOT_PASSWORD_EMAIL_FIX.md](./FORGOT_PASSWORD_EMAIL_FIX.md) for detailed steps.

## Bulk Password Setup

For multiple users, you can create a simple script or run the command multiple times:

```bash
# Example: Set passwords for multiple users
npm run set-user-password user1@example.com "Password123"
npm run set-user-password user2@example.com "Password123"
npm run set-user-password user3@example.com "Password123"
```

## Related Scripts

- `set-platform-operator-password` - For platform operators only (has role check)
- `set-user-password` - For any user (no role check) ✅ **Use this one**
- `link-firebase-auth-account` - Links existing Firebase Auth accounts to Firestore users

## Troubleshooting

### Error: "User with email not found in Firestore"

The user doesn't exist in Firestore. Create the user first or check the email spelling.

### Error: "Firebase Auth error: email-already-exists"

A Firebase Auth account already exists for this email. Use the forgot password feature or manually reset it in Firebase Console.

### Error: "Password validation failed"

The password doesn't meet requirements. Ensure it has:
- 8+ characters
- Uppercase letter
- Lowercase letter
- Number

### Error: "Failed to initialize Firebase Admin"

Check your `.env.local` file or service account JSON files. Ensure Firebase credentials are properly configured.

## Security Notes

⚠️ **Important:**
- Passwords set via this script are visible in terminal history
- Consider using a password manager to generate secure passwords
- Users should change their passwords after first login
- For production, ensure proper access controls on who can run this script
