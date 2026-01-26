# Fix authDomain Configuration for Custom Domains

## Problem

You're seeing this error even though the domain is authorized:
```
Firebase: The continue_uri domain belongs to a different Firebase Hosting project.
```

## Root Cause

When using a custom domain (like `sandbox.meant2grow.com`), the `authDomain` in your Firebase configuration must be set to the custom domain, not the default Firebase domain (`meant2grow-dev.firebaseapp.com`).

## Solution

### For Sandbox Environment

Update your `.env.sandbox` file or deployment environment variables:

**Change from:**
```env
VITE_FIREBASE_AUTH_DOMAIN=meant2grow-dev.firebaseapp.com  ❌ Wrong
```

**To:**
```env
VITE_FIREBASE_AUTH_DOMAIN=sandbox.meant2grow.com  ✅ Correct
```

### For Production Environment

If using `meant2grow.com` as your custom domain:

```env
VITE_FIREBASE_AUTH_DOMAIN=meant2grow.com
```

### After Updating

1. **Rebuild your app:**
   ```bash
   npm run build:sandbox
   ```

2. **Redeploy:**
   ```bash
   firebase deploy --only hosting
   ```

3. **Clear browser cache** and try logging in again

## Why This Matters

Firebase Auth uses the `authDomain` to:
- Generate auth URIs with correct `continue_uri` parameters
- Validate that redirects go to the correct domain
- Ensure the domain belongs to the correct Firebase Hosting project

When `authDomain` doesn't match the actual domain where your app is hosted, Firebase sees a mismatch and throws the "different Firebase Hosting project" error.

## Verification

After updating, verify your Firebase config in the browser console:
```javascript
console.log(firebase.app().options.authDomain);
// Should show: sandbox.meant2grow.com (not meant2grow-dev.firebaseapp.com)
```
