# Deployment Checklist - Step by Step

**Project:** meant2grow-dev  
**Storage Bucket:** gs://meant2grow-dev.firebasestorage.app ✅ (Already enabled)

## ✅ Step 1: Verify Firebase Services

### Check Firestore Status
```bash
# Check if Firestore is enabled (will show error if not)
firebase firestore:databases:list
```

**If not enabled:** Go to https://console.firebase.google.com/project/meant2grow-dev/firestore and click "Create database"

### Check Storage Status
✅ Storage appears to be enabled (bucket URL provided: `gs://meant2grow-dev.firebasestorage.app`)

**Verify:** Go to https://console.firebase.google.com/project/meant2grow-dev/storage

### Get Firebase Config
1. Go to: https://console.firebase.google.com/project/meant2grow-dev/settings/general
2. Scroll to "Your apps" > Web app (or create one)
3. Copy the config values

## ✅ Step 2: Set Up Google OAuth

### 2.1 Configure OAuth Consent Screen
1. Go to: https://console.cloud.google.com/apis/credentials/consent?project=meant2grow-dev
2. Click "OAuth consent screen"
3. Fill in:
   - **User Type:** External
   - **App name:** Meant2Grow
   - **User support email:** your-email@example.com
   - **Developer contact:** your-email@example.com
4. Click "Save and Continue"
5. **Scopes:** Click "Add or Remove Scopes"
   - Add only these:
     - `openid`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
6. Click "Save and Continue" through remaining steps
7. Click "Back to Dashboard"

### 2.2 Create OAuth Client ID
1. Go to: https://console.cloud.google.com/apis/credentials?project=meant2grow-dev
2. Click "Create Credentials" > "OAuth client ID"
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
7. Click "Create"
8. **COPY THE CLIENT ID** - You'll need this for `.env.local`

## ✅ Step 3: Create Service Account for Meet API

### 3.1 Enable Meet API
1. Go to: https://console.cloud.google.com/apis/library/meet.googleapis.com?project=meant2grow-dev
2. Click "Enable"

### 3.2 Create Service Account
1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=meant2grow-dev
2. Click "Create Service Account"
3. **Service account details:**
   - Name: `meant2grow-meet-service`
   - Description: `Service account for creating Google Meet links`
4. Click "Create and Continue"
5. **Grant this service account access:**
   - Role: `Service Account User`
6. Click "Continue" then "Done"

### 3.3 Create and Download Key
1. Click on the service account you just created (`meant2grow-meet-service`)
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Choose "JSON"
5. Click "Create" - JSON file will download
6. **Save this file securely** - you'll need:
   - `client_email` (e.g., `meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com`)
   - `private_key` (the full key including BEGIN/END lines)

## ✅ Step 4: Set Environment Variables

### 4.1 Create `.env.local`
Create `.env.local` in the project root:

```env
# Google OAuth (from Step 2.2)
VITE_GOOGLE_CLIENT_ID=your_client_id_here

# Firebase Config (from Step 1.3)
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=meant2grow-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=meant2grow-dev
VITE_FIREBASE_STORAGE_BUCKET=meant2grow-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here

# Functions URL
VITE_FUNCTIONS_URL=https://us-central1-meant2grow-dev.cloudfunctions.net
```

**Important:** Add `.env.local` to `.gitignore` if not already there!

### 4.2 Set Firebase Functions Secrets
Run these commands (you'll be prompted to paste values):

```bash
# Set service account email (from Step 3.3)
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
# When prompted, paste: meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com

# Set service account private key (from Step 3.3 JSON file)
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY
# When prompted, paste the FULL private key including:
# -----BEGIN PRIVATE KEY-----
# ...key content...
# -----END PRIVATE KEY-----
```

**Verify secrets are set:**
```bash
firebase functions:secrets:list
```

## ✅ Step 5: Deploy Security Rules

```bash
firebase deploy --only firestore:rules,storage:rules
```

**Expected output:**
```
✔  Deployed rules to firestore...
✔  Deployed rules to storage...
```

## ✅ Step 6: Build and Deploy

### 6.1 Build Functions
```bash
cd functions
npm run build
cd ..
```

### 6.2 Build Frontend
```bash
npm run build
```

### 6.3 Deploy Everything
```bash
# Deploy all at once
firebase deploy

# Or deploy individually:
firebase deploy --only functions
firebase deploy --only hosting
```

## ✅ Step 7: Verify Deployment

### Check Function URLs
After deployment, your functions will be at:
- **Auth:** https://us-central1-meant2grow-dev.cloudfunctions.net/authGoogle
- **Meet:** https://us-central1-meant2grow-dev.cloudfunctions.net/createMeetLink

### Test the App
1. Visit: https://meant2grow-dev.web.app
2. Try Google Sign-In
3. Create a new organization
4. Test joining with organization code

## 🐛 Troubleshooting

### If Functions Deploy Fails
```bash
# Check build
cd functions && npm run build

# Check secrets
firebase functions:secrets:list

# View logs
firebase functions:log
```

### If OAuth Fails
- Verify `VITE_GOOGLE_CLIENT_ID` in `.env.local`
- Check OAuth redirect URIs match your domain
- Check browser console for errors

### If Meet API Fails
- Verify Meet API is enabled
- Check service account secrets are set
- View function logs: `firebase functions:log --only createMeetLink`

## 📋 Quick Reference

**Firebase Console:** https://console.firebase.google.com/project/meant2grow-dev  
**Google Cloud Console:** https://console.cloud.google.com/?project=meant2grow-dev  
**App URL (after deploy):** https://meant2grow-dev.web.app
