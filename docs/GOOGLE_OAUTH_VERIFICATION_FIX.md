# Fix Google OAuth "Access Blocked" Error

## Problem
You're seeing: **"Access blocked: Meant2Grow has not completed the Google verification process"** with Error 403: access_denied.

This happens because your app is in "Testing" mode and the user attempting to sign in hasn't been added as a test user.

## Solution: Add Test Users (Quick Fix)

### Step 1: Go to OAuth Consent Screen
1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (e.g., `meant2grow-dev`)
3. Navigate to **APIs & Services** > **OAuth consent screen**

### Step 2: Add Test Users
1. Scroll down to the **Test users** section
2. Click **+ ADD USERS**
3. Enter the email addresses of users who should be able to sign in:
   - Your own email: `greendigitalnet@gmail.com`
   - Any other test users' emails
4. Click **ADD**
5. **Important:** Changes may take a few minutes to propagate

### Step 3: Try Signing In Again
1. Clear your browser cache or use an incognito window
2. Try signing in with Google again
3. The test users should now be able to access the app

## Alternative: Publish Your App (For Public Access)

If you want anyone to be able to sign in (not just test users), you need to submit your app for Google verification:

### Step 1: Complete OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**
2. Ensure all required fields are filled:
   - App name: Meant2Grow
   - User support email: Your email
   - App logo (optional but recommended)
   - App domain (if you have one)
   - Developer contact information

### Step 2: Review Scopes
Make sure you're only requesting necessary scopes:
- `openid`
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`

**Important:** Don't request sensitive scopes (like calendar, drive, etc.) unless absolutely necessary, as they require more rigorous verification.

### Step 3: Submit for Verification
1. In the OAuth consent screen, click **PUBLISH APP**
2. You'll see a warning - click **CONFIRM**
3. Your app will be moved from "Testing" to "In production"
4. **Note:** For sensitive scopes, Google may require additional verification which can take several days

## Current Status Check

To check your current OAuth consent screen status:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **OAuth consent screen**
3. Look at the top - it will show either:
   - **Testing** - Only test users can access
   - **In production** - Anyone can access (after verification)

## Quick Test User Addition

If you just need to add yourself quickly:

```bash
# Direct link (replace PROJECT_ID with your actual project ID)
# https://console.cloud.google.com/apis/credentials/consent?project=PROJECT_ID
```

Then:
1. Scroll to "Test users"
2. Click "+ ADD USERS"
3. Add: `greendigitalnet@gmail.com`
4. Save

## Troubleshooting

### Still seeing the error after adding test users?
- Wait 5-10 minutes for changes to propagate
- Clear browser cache/cookies
- Try incognito/private browsing mode
- Make sure you're using the correct Google account that was added as a test user

### Want to verify which users are test users?
1. Go to OAuth consent screen
2. Scroll to "Test users" section
3. You'll see the list of all added test users

### Need to remove test users?
1. Go to OAuth consent screen
2. Scroll to "Test users"
3. Click the X next to any user to remove them

## For Production Deployment

When you're ready to make your app publicly accessible:

1. **Complete all OAuth consent screen fields**
2. **Ensure you're only requesting necessary scopes**
3. **Click "PUBLISH APP"**
4. **Wait for Google's review** (if sensitive scopes are requested)
5. **Update your app's privacy policy URL** (required for production)

## Notes

- **Testing mode** is perfect for development - you control exactly who can access
- **Production mode** allows anyone to sign in but requires verification
- Test users can be added/removed at any time
- Changes to test users take effect within minutes

