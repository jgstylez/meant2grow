# Fix "continue_uri domain belongs to a different Firebase Hosting project" Error

## Problem

You're seeing this error when trying to log in:
```
Firebase: The continue_uri domain belongs to a different Firebase Hosting project.
```

This happens when Firebase Auth tries to create an auth URI (used internally by `fetchSignInMethodsForEmail`) but the current domain isn't authorized in Firebase Console.

## Root Cause

When you access the app from `https://sandbox.meant2grow.com`, Firebase Auth needs to know this domain is authorized. The `fetchSignInMethodsForEmail` function internally calls `createAuthUri`, which requires the domain to be in the authorized domains list.

## Solution: Add Domain to Firebase Auth Authorized Domains

**⚠️ IMPORTANT:** This is different from Firebase Hosting domains! You need to check Firebase Authentication settings specifically.

### Step 1: Go to Firebase Authentication Settings (NOT Hosting)

1. Open: https://console.firebase.google.com/project/meant2grow-dev/authentication/settings
2. Click on the **"Sign-in method"** tab (if not already selected)
3. Scroll down to the **"Authorized domains"** section (this is separate from Hosting domains)

### Step 2: Check if Sandbox Domain is Listed

Look for `sandbox.meant2grow.com` in the authorized domains list. You should see:
- `localhost` (default)
- `meant2grow-dev.firebaseapp.com` (default)
- `meant2grow-dev.web.app` (default)
- `sandbox.meant2grow.com` ⚠️ **Check if this is here!**

### Step 3: Add Sandbox Domain (if missing)

If `sandbox.meant2grow.com` is NOT in the list:
1. Click **"Add domain"** button
2. Enter: `sandbox.meant2grow.com`
3. Click **"Add"**
4. Wait 1-2 minutes for changes to propagate

### Step 3: Verify All Required Domains Are Present

Make sure these domains are in the authorized domains list:

**For Sandbox (meant2grow-dev project):**
- `localhost` (for local development)
- `sandbox.meant2grow.com` ⚠️ **This is likely missing!**
- `meant2grow-dev.web.app` (Firebase Hosting default)
- `meant2grow-dev.firebaseapp.com` (Firebase Hosting default)

**For Production (meant2grow-prod project):**
- `localhost` (for local development)
- `meant2grow.com` (production domain)
- `meant2grow-prod.web.app` (Firebase Hosting default)
- `meant2grow-prod.firebaseapp.com` (Firebase Hosting default)

## Quick Fix Links

- **Sandbox Auth Settings:** https://console.firebase.google.com/project/meant2grow-dev/authentication/settings
- **Production Auth Settings:** https://console.firebase.google.com/project/meant2grow-prod/authentication/settings

## Why This Happens

Firebase Auth uses authorized domains for:
1. **Action code links** (password reset emails, email verification)
2. **OAuth redirects** (Google Sign-In, etc.)
3. **Auth URI generation** (used by `fetchSignInMethodsForEmail`)

When `fetchSignInMethodsForEmail` is called, Firebase Auth internally creates an auth URI with a continue URL. If your current domain (`sandbox.meant2grow.com`) isn't in the authorized domains list, Firebase rejects the request with this error.

## Additional Fix: Update authDomain Configuration

If the domain is already authorized but you're still seeing the error, check your `authDomain` configuration:

**For Sandbox Environment:**
Your `.env.sandbox` or deployment environment variables should have:
```env
VITE_FIREBASE_AUTH_DOMAIN=sandbox.meant2grow.com
```

**NOT:**
```env
VITE_FIREBASE_AUTH_DOMAIN=meant2grow-dev.firebaseapp.com  ❌ Wrong for custom domain
```

When using a custom domain, the `authDomain` must match the custom domain where your app is hosted, not the default Firebase domain.

## Testing After Fix

1. Update your `authDomain` configuration if needed (see above)
2. Rebuild and redeploy your app
3. Clear your browser cache
4. Try logging in again at `https://sandbox.meant2grow.com`
5. The error should be resolved

## Related Configuration

This is separate from:
- **Firebase Hosting domains** (configured in Firebase Hosting → Domains) - This is what you saw in the image
- **Firebase Auth authorized domains** (configured in Firebase Authentication → Settings → Authorized domains) - This is what needs to be fixed
- **OAuth redirect URIs** (configured in Google Cloud Console)

**All three need to be configured correctly for authentication to work.**

## Visual Guide

- **Firebase Hosting Domains:** Firebase Console → Hosting → Domains (shows where your app is deployed)
- **Firebase Auth Authorized Domains:** Firebase Console → Authentication → Settings → Authorized domains (shows which domains can use Auth)

Even if `sandbox.meant2grow.com` is in Hosting domains, it must ALSO be in Auth authorized domains!
