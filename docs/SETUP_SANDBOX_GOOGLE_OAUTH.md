# Setup Google OAuth for Sandbox Environment

## Overview
Sandbox environment (`https://sandbox.meant2grow.com`) needs its own **separate** Google OAuth Client ID configured in the **meant2grow-dev** Google Cloud project.

**Important:** Sandbox and Production should have separate OAuth clients for proper environment isolation.

## Step-by-Step: Create Sandbox OAuth Client

### Step 1: Go to Google Cloud Console
1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. **Select project:** **meant2grow-dev** (sandbox uses the dev Firebase project)
3. Navigate to **APIs & Services** > **Credentials**

### Step 2: Create New OAuth Client for Sandbox
1. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
2. If prompted, configure OAuth consent screen first:
   - **User Type:** External
   - **App name:** Meant2Grow Sandbox
   - **User support email:** Your email
   - **Scopes:** Add only:
     - `openid`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
   - Click through remaining steps
3. Back in Credentials, click **+ CREATE CREDENTIALS** > **OAuth client ID** again
4. **Application type:** Web application
5. **Name:** Meant2Grow Sandbox Client
6. **Authorized JavaScript origins:**
   ```
   http://localhost:3000
   http://localhost:5173
   https://sandbox.meant2grow.com
   ```
7. **Authorized redirect URIs:**
   ```
   http://localhost:3000
   http://localhost:5173
   https://sandbox.meant2grow.com
   ```
8. Click **CREATE**
9. **COPY THE CLIENT ID** - You'll need this for `.env.sandbox`

### Step 3: Update .env.sandbox
Add the Client ID to your `.env.sandbox` file:
```bash
VITE_GOOGLE_CLIENT_ID=your_new_sandbox_client_id_here
```

Replace `your_new_sandbox_client_id_here` with the Client ID you just copied.

## Verify Setup

After updating `.env.sandbox`:

1. **Restart your dev server** if running locally
2. **Rebuild and deploy** if deploying to sandbox:
   ```bash
   npm run build:sandbox
   npm run firebase:deploy:sandbox
   ```
3. **Test Google Sign-In** on `https://sandbox.meant2grow.com`

## Environment Summary

| Environment | Google Cloud Project | Firebase Project | OAuth Client |
|------------|---------------------|------------------|--------------|
| **Sandbox** | `meant2grow-dev` | `meant2grow-dev` | Separate client (create new) |
| **Production** | `meant2grow-prod` | `meant2grow-prod` | `493534533344-e2mcmbht3802t1fhdmtq9rgrf0ljc1qe.apps.googleusercontent.com` |
| **Local Dev** | `meant2grow-dev` | `meant2grow-dev` | Can use sandbox client |

## Direct Links

- **Sandbox OAuth Credentials:** https://console.cloud.google.com/apis/credentials?project=meant2grow-dev
- **Sandbox OAuth Consent Screen:** https://console.cloud.google.com/apis/credentials/consent?project=meant2grow-dev

## Troubleshooting

### Can't find meant2grow-dev project?
- Make sure you're logged into the correct Google account
- Check that you have access to the `meant2grow-dev` project
- Verify the project exists in [Google Cloud Console](https://console.cloud.google.com/)

### OAuth consent screen not configured?
- You must configure the OAuth consent screen before creating OAuth clients
- Follow Step 2 above to set it up

### Still seeing redirect_uri_mismatch?
- Make sure `https://sandbox.meant2grow.com` is exactly in the authorized redirect URIs (no trailing slash)
- Wait 1-2 minutes after saving for changes to propagate
- Clear browser cache and try again
