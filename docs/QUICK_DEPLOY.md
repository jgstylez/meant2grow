# Quick Deployment Guide

**Project:** meant2grow-dev  
**Status:** Storage enabled ✅ (gs://meant2grow-dev.firebasestorage.app)

## 🎯 Step-by-Step Deployment

### Step 1: Verify/Create Firebase Web App Config

1. Go to: https://console.firebase.google.com/project/meant2grow-dev/settings/general
2. Scroll to "Your apps" section
3. If no web app exists, click "Add app" > Web (</>) icon
4. Register app (nickname optional)
5. **Copy all config values** - you'll need these for `.env.local`

### Step 2: Enable Firestore (if not already enabled)

1. Go to: https://console.firebase.google.com/project/meant2grow-dev/firestore
2. If you see "Create database", click it
3. Choose "Start in test mode"
4. Select location: `us-central1` (or your preferred region)
5. Click "Enable"

### Step 3: Set Up Google OAuth

#### 3.1 OAuth Consent Screen
1. Go to: https://console.cloud.google.com/apis/credentials/consent?project=meant2grow-dev
2. Click "OAuth consent screen"
3. Fill in:
   - **User Type:** External
   - **App name:** Meant2Grow
   - **User support email:** [your email]
   - **Developer contact:** [your email]
4. Click "Save and Continue"
5. **Scopes:** Click "Add or Remove Scopes"
   - Search and add:
     - `openid`
     - `userinfo.email`
     - `userinfo.profile`
   - **Remove any calendar/drive scopes**
6. Click "Save and Continue" through remaining steps

#### 3.2 Create OAuth Client
1. Go to: https://console.cloud.google.com/apis/credentials?project=meant2grow-dev
2. Click "+ CREATE CREDENTIALS" > "OAuth client ID"
3. **Application type:** Web application
4. **Name:** Meant2Grow Web Client
5. **Authorized JavaScript origins:**
   ```
   http://localhost:3000
   http://localhost:5173
   https://meant2grow-dev.web.app
   https://meant2grow-dev.firebaseapp.com
   ```
6. **Authorized redirect URIs:**
   ```
   http://localhost:3000
   http://localhost:5173
   https://meant2grow-dev.web.app
   https://meant2grow-dev.firebaseapp.com
   ```
7. Click "CREATE"
8. **COPY THE CLIENT ID** (you'll need this)

### Step 4: Create Service Account for Meet API

#### 4.1 Enable Meet API
1. Go to: https://console.cloud.google.com/apis/library/meet.googleapis.com?project=meant2grow-dev
2. Click "ENABLE"

#### 4.2 Create Service Account
1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=meant2grow-dev
2. Click "+ CREATE SERVICE ACCOUNT"
3. **Service account details:**
   - **Service account name:** `meant2grow-meet-service`
   - **Service account ID:** (auto-filled)
   - **Description:** Service account for creating Google Meet links
4. Click "CREATE AND CONTINUE"
5. **Grant this service account access:**
   - Click "Select a role"
   - Search for "Service Account User"
   - Select it
   - Click "CONTINUE"
6. Click "DONE"

#### 4.3 Create Key
1. Click on the service account (`meant2grow-meet-service`)
2. Go to "KEYS" tab
3. Click "ADD KEY" > "Create new key"
4. Choose "JSON"
5. Click "CREATE"
6. **JSON file downloads** - save it securely
7. Open the JSON file and note:
   - `client_email` (e.g., `meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com`)
   - `private_key` (the full key string)

### Step 5: Create `.env.local` File

Create `.env.local` in the project root with:

```env
# Google OAuth Client ID (from Step 3.2)
VITE_GOOGLE_CLIENT_ID=paste_your_client_id_here

# Firebase Config (from Step 1)
VITE_FIREBASE_API_KEY=paste_your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=meant2grow-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=meant2grow-dev
VITE_FIREBASE_STORAGE_BUCKET=meant2grow-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=paste_your_sender_id_here
VITE_FIREBASE_APP_ID=paste_your_app_id_here

# Functions URL
VITE_FUNCTIONS_URL=https://us-central1-meant2grow-dev.cloudfunctions.net
```

**Replace all `paste_your_*_here` with actual values!**

### Step 6: Set Firebase Functions Secrets

For Firebase Functions v2 with `params`, we need to set secrets. Run these commands:

```bash
# Set service account email
echo "meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com" | \
  firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL

# Set service account key (paste the private_key from JSON file)
# You'll need to paste the full key including BEGIN/END lines
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY
```

**Note:** When prompted, paste the full private key from the JSON file (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines).

**Alternative method** (if the above doesn't work):
You can also set these via Google Cloud Console:
1. Go to: https://console.cloud.google.com/secret-manager?project=meant2grow-dev
2. Create secrets manually:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_KEY`

### Step 7: Deploy Security Rules

```bash
firebase deploy --only firestore:rules,storage:rules
```

Expected output:
```
✔  firestore: rules deployed
✔  storage: rules deployed
```

### Step 8: Build Functions

```bash
cd functions
npm install  # If not already done
npm run build
cd ..
```

### Step 9: Build Frontend

```bash
npm run build
```

This creates the `dist/` folder with your built app.

### Step 10: Deploy Everything

```bash
# Deploy all at once
firebase deploy

# Or deploy individually:
firebase deploy --only functions
firebase deploy --only hosting
```

### Step 11: Verify Deployment

1. **Check Function URLs:**
   - Auth: https://us-central1-meant2grow-dev.cloudfunctions.net/authGoogle
   - Meet: https://us-central1-meant2grow-dev.cloudfunctions.net/createMeetLink

2. **Visit your app:**
   - https://meant2grow-dev.web.app
   - https://meant2grow-dev.firebaseapp.com

3. **Test:**
   - Try Google Sign-In
   - Create a new organization
   - Test joining with organization code

## 🐛 Troubleshooting

### Functions won't deploy
```bash
# Check build
cd functions && npm run build

# Check if secrets are accessible
# (Functions will fail at runtime if secrets aren't set)
```

### OAuth not working
- Verify `VITE_GOOGLE_CLIENT_ID` in `.env.local`
- Check browser console for errors
- Verify OAuth redirect URIs match your domain

### Meet API errors
- Check function logs: `firebase functions:log --only createMeetLink`
- Verify Meet API is enabled
- Verify service account secrets are set

## 📋 Quick Reference

- **Firebase Console:** https://console.firebase.google.com/project/meant2grow-dev
- **Google Cloud Console:** https://console.cloud.google.com/?project=meant2grow-dev
- **App URL:** https://meant2grow-dev.web.app

## ✅ Checklist

- [ ] Firestore enabled
- [ ] Storage enabled (already done ✅)
- [ ] Firebase web app config copied
- [ ] OAuth consent screen configured
- [ ] OAuth client ID created
- [ ] Meet API enabled
- [ ] Service account created
- [ ] Service account key downloaded
- [ ] `.env.local` created with all values
- [ ] Firebase Functions secrets set
- [ ] Security rules deployed
- [ ] Functions built
- [ ] Frontend built
- [ ] Everything deployed
- [ ] App tested and working

