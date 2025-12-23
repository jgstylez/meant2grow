# Next Steps - Quick Action Guide

## 🎯 Immediate Actions Required

### 1. Enable Firebase Services (5 minutes)

Go to Firebase Console: https://console.firebase.google.com/project/meant2grow-dev

1. **Enable Firestore:**
   - Navigate to: Firestore Database
   - Click "Create database"
   - Choose "Start in test mode"
   - Select location (e.g., `us-central1`)
   - Click "Enable"

2. **Enable Cloud Storage:**
   - Navigate to: Storage
   - Click "Get started"
   - Choose "Start in test mode"
   - Use same location as Firestore
   - Click "Done"

3. **Get Firebase Config:**
   - Go to: Project Settings > General
   - Scroll to "Your apps" > Web app (or create one)
   - Copy all config values

### 2. Set Up Google OAuth (10 minutes)

1. Go to: https://console.cloud.google.com/apis/credentials?project=meant2grow-dev

2. **Configure OAuth Consent Screen:**
   - Click "OAuth consent screen"
   - User Type: External
   - App name: Meant2Grow
   - User support email: your email
   - Scopes: Add only:
     - `openid`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
   - Save

3. **Create OAuth Client:**
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: Web application
   - Name: Meant2Grow Web Client
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - `https://meant2grow-dev.web.app`
     - `https://meant2grow-dev.firebaseapp.com`
   - Authorized redirect URIs:
     - `http://localhost:3000`
     - `https://meant2grow-dev.web.app`
     - `https://meant2grow-dev.firebaseapp.com`
   - Create
   - **Copy the Client ID**

### 3. Create Service Account for Meet API (10 minutes)

1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=meant2grow-dev

2. **Create Service Account:**
   - Click "Create Service Account"
   - Name: `meant2grow-meet-service`
   - Description: Service account for creating Google Meet links
   - Click "Create and Continue"
   - Grant role: "Service Account User"
   - Click "Done"

3. **Create Key:**
   - Click on the service account you just created
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON"
   - Download the JSON file
   - **Save the `client_email` and `private_key` values**

4. **Enable Meet API:**
   - Go to: https://console.cloud.google.com/apis/library/meet.googleapis.com?project=meant2grow-dev
   - Click "Enable"

### 4. Set Environment Variables (5 minutes)

#### Create `.env.local`:
```bash
# Copy from Firebase Console > Project Settings > General > Your apps > Web app
VITE_GOOGLE_CLIENT_ID=paste_your_oauth_client_id_here
VITE_FIREBASE_API_KEY=paste_your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=meant2grow-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=meant2grow-dev
VITE_FIREBASE_STORAGE_BUCKET=meant2grow-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=paste_your_sender_id_here
VITE_FIREBASE_APP_ID=paste_your_app_id_here
VITE_FUNCTIONS_URL=https://us-central1-meant2grow-dev.cloudfunctions.net
```

#### Set Firebase Functions Secrets:
```bash
# Set service account email
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
# When prompted, paste: your-service-account@meant2grow-dev.iam.gserviceaccount.com

# Set service account key (private key)
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY
# When prompted, paste the full private key including BEGIN/END lines
```

### 5. Deploy Security Rules (2 minutes)

```bash
firebase deploy --only firestore:rules,storage:rules
```

### 6. Test Locally (Optional)

```bash
# Start emulators
firebase emulators:start

# In another terminal, start dev server
npm run dev
```

Update `.env.local` for emulator:
```env
VITE_FUNCTIONS_URL=http://localhost:5001/meant2grow-dev/us-central1
```

### 7. Deploy to Firebase (5 minutes)

```bash
# Build frontend
npm run build

# Build functions
cd functions && npm run build && cd ..

# Deploy everything
firebase deploy

# Or deploy individually:
firebase deploy --only hosting
firebase deploy --only functions
```

## ✅ Verification Checklist

After completing the above:

- [ ] Can access Firebase Console for meant2grow-dev
- [ ] Firestore Database is enabled
- [ ] Cloud Storage is enabled
- [ ] OAuth client ID created and copied
- [ ] Service account created and key downloaded
- [ ] Meet API is enabled
- [ ] `.env.local` created with all values
- [ ] Firebase Functions secrets set
- [ ] Security rules deployed
- [ ] Functions deployed successfully
- [ ] Hosting deployed successfully
- [ ] Can access app at: https://meant2grow-dev.web.app
- [ ] Google Sign-In works
- [ ] Can create organization
- [ ] Can join organization with code

## 🐛 Troubleshooting

### Functions won't deploy
- Check: `cd functions && npm run build` succeeds
- Verify: Secrets are set: `firebase functions:secrets:list`
- Check: Billing is enabled (required for Cloud Functions)

### Google Sign-In fails
- Verify: `VITE_GOOGLE_CLIENT_ID` is set correctly
- Check: OAuth redirect URIs include your domain
- Verify: Google Sign-In script loads in browser console

### Meet API fails
- Verify: Meet API is enabled in Google Cloud Console
- Check: Service account has correct permissions
- Verify: Secrets are set correctly

## 📚 Reference Documentation

- `IMPLEMENTATION_STATUS.md` - Current status and what's done
- `GOOGLE_INTEGRATION_SETUP.md` - Detailed setup guide
- `FIREBASE_DEPLOYMENT.md` - Deployment instructions
- `INTEGRATION_SUMMARY.md` - Integration overview

