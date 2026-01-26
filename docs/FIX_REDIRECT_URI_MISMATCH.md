# Fix Google OAuth "redirect_uri_mismatch" Error

## Problem
You're seeing: **"Access blocked: This app's request is invalid"** with **Error 400: redirect_uri_mismatch**.

This happens when the URL where your app is running is not in the authorized redirect URIs list in your Google OAuth client configuration.

## Quick Fix: Add Your Current URL to Authorized Redirect URIs

### Step 1: Identify Your Current URL
Check what URL you're accessing the app from:
- **Local development:** Usually `http://localhost:3000` or `http://localhost:5173`
- **Sandbox:** `https://sandbox.meant2grow.com`
- **Production:** `https://meant2grow.com` or `https://meant2grow-dev.web.app`

### Step 2: Go to Google Cloud Console
1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project:
   - **Sandbox:** `meant2grow-dev`
   - **Production:** `meant2grow-prod`
   - **Local Dev:** `meant2grow-dev`
3. Navigate to **APIs & Services** > **Credentials**

### Step 3: Edit Your OAuth Client
1. Find your OAuth 2.0 Client ID (the one matching your `VITE_GOOGLE_CLIENT_ID`)
2. Click on the client ID to edit it
3. Scroll down to **Authorized redirect URIs**
4. Click **+ ADD URI**

### Step 4: Add Your Current URL
Add the exact URL where your app is running:

**For local development:**
```
http://localhost:3000
http://localhost:5173
```

**For sandbox:**
```
https://sandbox.meant2grow.com
```

**For production:**
```
https://meant2grow.com
https://meant2grow-dev.web.app
https://meant2grow-dev.firebaseapp.com
```

**Important:** 
- Include the protocol (`http://` or `https://`)
- Include the port number if using a non-standard port
- Don't include trailing slashes
- The URL must match exactly (case-sensitive for the domain)

### Step 5: Save Changes
1. Click **SAVE**
2. Wait 1-2 minutes for changes to propagate
3. Try signing in again

## Complete List of Recommended Redirect URIs

### For Sandbox Environment (meant2grow-dev project)
```
http://localhost:3000
http://localhost:5173
https://sandbox.meant2grow.com
```

### For Production Environment (meant2grow-prod project)
```
http://localhost:3000
http://localhost:5173
https://meant2grow.com
https://meant2grow-prod.web.app
https://meant2grow-prod.firebaseapp.com
```

## How Google Identity Services Uses Redirect URIs

When using Google Identity Services (`initTokenClient`), the library automatically uses your current origin as the redirect URI. This means:

- If you're on `http://localhost:3000`, it will use `http://localhost:3000` as the redirect URI
- If you're on `https://meant2grow-dev.web.app`, it will use that as the redirect URI

**The redirect URI in Google Cloud Console must match your current origin exactly.**

## Troubleshooting

### Still seeing the error after adding the URI?
1. **Wait 2-3 minutes** - Changes can take time to propagate
2. **Clear browser cache** - Old OAuth tokens might be cached
3. **Check the exact URL** - Open browser DevTools > Console and check `window.location.origin`
4. **Verify the OAuth client** - Make sure you're editing the correct OAuth client ID that matches your `VITE_GOOGLE_CLIENT_ID`

### How to check your current origin
Open your browser's developer console (F12) and run:
```javascript
console.log(window.location.origin);
```

This will show the exact origin that needs to be added to the authorized redirect URIs.

### Multiple environments?
If you're running the app in different environments (local, sandbox, production), make sure all URLs are added:
- **Local:** `http://localhost:3000` or `http://localhost:5173`
- **Sandbox:** `https://sandbox.meant2grow.com` (uses `meant2grow-dev` project)
- **Production:** `https://meant2grow.com` (uses `meant2grow-prod` project)

**Important:** Sandbox and Production use different OAuth clients in different Google Cloud projects. Make sure you're editing the correct client:
- **Sandbox OAuth Client:** In `meant2grow-dev` project (Client ID: `783951843343-09fi644a3qlj83s04a7du3ao7o0vj4k2.apps.googleusercontent.com`)
- **Production OAuth Client:** In `meant2grow-prod` project (Client ID: `493534533344-e2mcmbht3802t1fhdmtq9rgrf0ljc1qe.apps.googleusercontent.com`)

## Common Mistakes

❌ **Wrong:** `localhost:3000` (missing protocol)
❌ **Wrong:** `http://localhost:3000/` (trailing slash)
❌ **Wrong:** `http://localhost` (missing port)
✅ **Correct:** `http://localhost:3000`

❌ **Wrong:** `meant2grow-dev.web.app` (missing protocol)
❌ **Wrong:** `https://meant2grow-dev.web.app/` (trailing slash)
✅ **Correct:** `https://meant2grow-dev.web.app`

## Quick Reference Links

- **Sandbox OAuth Credentials:** https://console.cloud.google.com/apis/credentials?project=meant2grow-dev
- **Production OAuth Credentials:** https://console.cloud.google.com/apis/credentials?project=meant2grow-prod
- **OAuth Consent Screen (Sandbox):** https://console.cloud.google.com/apis/credentials/consent?project=meant2grow-dev
- **OAuth Consent Screen (Production):** https://console.cloud.google.com/apis/credentials/consent?project=meant2grow-prod

## For Production Deployment

When deploying to production, make sure to:
1. Add your production URLs to the authorized redirect URIs
2. Update your `VITE_GOOGLE_CLIENT_ID` environment variable if using a different OAuth client for production
3. Test the OAuth flow on the production URL before going live
