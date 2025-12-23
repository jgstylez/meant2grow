# Setup Environment Variables

## ✅ OAuth Client ID Already Set!

Your OAuth Client ID: `493534533344-e2mcmbht3802t1fhdmtq9rgrf0ljc1qe.apps.googleusercontent.com`

## Step 1: Create `.env.local` File

Copy the example file:

```bash
cp env.local.example .env.local
```

Or create `.env.local` manually with this content:

```env
# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=493534533344-e2mcmbht3802t1fhdmtq9rgrf0ljc1qe.apps.googleusercontent.com

# Firebase Config (Get these from Firebase Console)
VITE_FIREBASE_API_KEY=YOUR_API_KEY_HERE
VITE_FIREBASE_AUTH_DOMAIN=meant2grow-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=meant2grow-dev
VITE_FIREBASE_STORAGE_BUCKET=meant2grow-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID_HERE
VITE_FIREBASE_APP_ID=YOUR_APP_ID_HERE

# Functions URL
VITE_FUNCTIONS_URL=https://us-central1-meant2grow-dev.cloudfunctions.net
```

## Step 2: Get Firebase Config Values

1. **Open Firebase Console:**
   https://console.firebase.google.com/project/meant2grow-dev/settings/general

2. **Scroll to "Your apps" section**

3. **If no web app exists:**
   - Click "Add app" (or `</>` icon)
   - Choose "Web"
   - Register app (nickname optional)
   - Click "Register app"

4. **Copy these values from the config:**
   - `apiKey` → Replace `YOUR_API_KEY_HERE` in `.env.local`
   - `messagingSenderId` → Replace `YOUR_SENDER_ID_HERE` in `.env.local`
   - `appId` → Replace `YOUR_APP_ID_HERE` in `.env.local`

## Step 3: Verify `.env.local`

Your `.env.local` should look like this (with real values):

```env
VITE_GOOGLE_CLIENT_ID=493534533344-e2mcmbht3802t1fhdmtq9rgrf0ljc1qe.apps.googleusercontent.com
VITE_FIREBASE_API_KEY=AIzaSyC...your-actual-key
VITE_FIREBASE_AUTH_DOMAIN=meant2grow-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=meant2grow-dev
VITE_FIREBASE_STORAGE_BUCKET=meant2grow-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=493534533344
VITE_FIREBASE_APP_ID=1:493534533344:web:...your-actual-app-id
VITE_FUNCTIONS_URL=https://us-central1-meant2grow-dev.cloudfunctions.net
```

## Next Steps

After `.env.local` is complete:
1. Enable Firestore
2. Create service account for Meet API
3. Set Firebase Functions secrets
4. Deploy!

See `DEPLOY_NOW.md` for complete instructions.

