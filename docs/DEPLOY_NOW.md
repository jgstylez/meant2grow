# Deploy Now - Complete Guide

**Project:** meant2grow-dev  
**Storage:** ✅ Already enabled (gs://meant2grow-dev.firebasestorage.app)

## 🚀 Quick Start - Follow These Steps

### ✅ Step 1: Enable Firestore (2 minutes)

1. Open: https://console.firebase.google.com/project/meant2grow-dev/firestore
2. If you see "Create database", click it
3. Select "Start in test mode"
4. Choose location: `us-central1`
5. Click "Enable"

### ✅ Step 2: Get Firebase Config (2 minutes)

1. Open: https://console.firebase.google.com/project/meant2grow-dev/settings/general
2. Scroll to "Your apps"
3. If no web app exists:
   - Click "Add app" > Web icon (</>)
   - Register app (nickname optional)
4. Copy these values (you'll need them):
   - `apiKey`
   - `messagingSenderId`
   - `appId`

### ✅ Step 3: Set Up Google OAuth (5 minutes)

#### 3.1 OAuth Consent Screen
1. Open: https://console.cloud.google.com/apis/credentials/consent?project=meant2grow-dev
2. Click "OAuth consent screen"
3. Fill in:
   - **User Type:** External
   - **App name:** Meant2Grow
   - **User support email:** [your email]
4. Click "Save and Continue"
5. **Scopes:** Click "Add or Remove Scopes"
   - Add: `openid`, `userinfo.email`, `userinfo.profile`
   - **Remove any calendar/drive scopes**
6. Click "Save and Continue" through all steps

#### 3.2 Create OAuth Client
1. Open: https://console.cloud.google.com/apis/credentials?project=meant2grow-dev
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
6. **Authorized redirect URIs:** (same as above)
7. Click "CREATE"
8. **COPY THE CLIENT ID** - You'll need this!

### ✅ Step 4: Enable Meet API & Create Service Account (5 minutes)

#### 4.1 Enable Meet API
1. Open: https://console.cloud.google.com/apis/library/meet.googleapis.com?project=meant2grow-dev
2. Click "ENABLE"

#### 4.2 Create Service Account
1. Open: https://console.cloud.google.com/iam-admin/serviceaccounts?project=meant2grow-dev
2. Click "+ CREATE SERVICE ACCOUNT"
3. **Name:** `meant2grow-meet-service`
4. **Description:** Service account for creating Google Meet links
5. Click "CREATE AND CONTINUE"
6. **Role:** Select "Service Account User"
7. Click "CONTINUE" then "DONE"

#### 4.3 Create Key
1. Click on `meant2grow-meet-service`
2. Go to "KEYS" tab
3. Click "ADD KEY" > "Create new key"
4. Choose "JSON"
5. Click "CREATE"
6. **JSON file downloads** - Open it and save:
   - `client_email` (e.g., `meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com`)
   - `private_key` (the full key string)

### ✅ Step 5: Create `.env.local` (2 minutes)

Create `.env.local` in project root:

```env
# Google OAuth (from Step 3.2)
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE

# Firebase Config (from Step 2)
VITE_FIREBASE_API_KEY=YOUR_API_KEY_HERE
VITE_FIREBASE_AUTH_DOMAIN=meant2grow-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=meant2grow-dev
VITE_FIREBASE_STORAGE_BUCKET=meant2grow-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID_HERE
VITE_FIREBASE_APP_ID=YOUR_APP_ID_HERE

# Functions URL
VITE_FUNCTIONS_URL=https://us-central1-meant2grow-dev.cloudfunctions.net
```

**Replace all `YOUR_*_HERE` with actual values!**

### ✅ Step 6: Set Functions Secrets (3 minutes)

For Firebase Functions v2, secrets are stored in Google Cloud Secret Manager.

#### Option A: Using Google Cloud Console (Easiest)

1. Open: https://console.cloud.google.com/secret-manager?project=meant2grow-dev
2. Click "CREATE SECRET"

**Secret 1:**
- **Name:** `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- **Secret value:** `meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com` (from Step 4.3)
- Click "CREATE SECRET"

**Secret 2:**
- **Name:** `GOOGLE_SERVICE_ACCOUNT_KEY`
- **Secret value:** Paste the full `private_key` from Step 4.3 (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)
- Click "CREATE SECRET"

#### Option B: Using Firebase CLI

```bash
# Set email (string parameter)
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
# Paste: meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com

# Set key (secret)
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY
# Paste the full private key (including BEGIN/END lines)
```

**Note:** The `defineString` in the code will automatically read from environment variables or Firebase config. For `defineSecret`, it must be in Secret Manager.

### ✅ Step 7: Deploy Security Rules (1 minute)

```bash
firebase deploy --only firestore:rules,storage:rules
```

### ✅ Step 8: Build Functions (1 minute)

```bash
cd functions
npm run build
cd ..
```

### ✅ Step 9: Build Frontend (1 minute)

```bash
npm run build
```

### ✅ Step 10: Deploy Everything (2 minutes)

```bash
firebase deploy
```

Or deploy individually:
```bash
firebase deploy --only functions
firebase deploy --only hosting
```

### ✅ Step 11: Test (2 minutes)

1. Visit: https://meant2grow-dev.web.app
2. Try Google Sign-In
3. Create a new organization
4. Test joining with organization code

## 🎉 Done!

Your app should now be live at:
- https://meant2grow-dev.web.app
- https://meant2grow-dev.firebaseapp.com

## 🐛 Troubleshooting

### Functions fail to deploy
- Check: `cd functions && npm run build` succeeds
- Verify: Secrets exist in Secret Manager
- Check: Billing is enabled (required for Cloud Functions)

### OAuth not working
- Verify: `VITE_GOOGLE_CLIENT_ID` in `.env.local`
- Check: Browser console for errors
- Verify: OAuth redirect URIs match your domain

### Meet API errors
- Check logs: `firebase functions:log --only createMeetLink`
- Verify: Meet API is enabled
- Verify: Secrets are set correctly

## 📋 Quick Reference

- **Firebase Console:** https://console.firebase.google.com/project/meant2grow-dev
- **Google Cloud Console:** https://console.cloud.google.com/?project=meant2grow-dev
- **Secret Manager:** https://console.cloud.google.com/secret-manager?project=meant2grow-dev

## ✅ Final Checklist

- [ ] Firestore enabled
- [ ] Firebase config copied
- [ ] OAuth consent screen configured
- [ ] OAuth client ID created
- [ ] Meet API enabled
- [ ] Service account created
- [ ] Service account key downloaded
- [ ] `.env.local` created
- [ ] Secrets set in Secret Manager
- [ ] Security rules deployed
- [ ] Functions built
- [ ] Frontend built
- [ ] Everything deployed
- [ ] App tested

**Total Time:** ~25 minutes

