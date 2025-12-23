# Get Firebase Config Values

Your OAuth Client ID is already set! ✅

Now you need to get your Firebase config values:

## Step 1: Get Firebase Config

1. **Open Firebase Console:**
   https://console.firebase.google.com/project/meant2grow-dev/settings/general

2. **Scroll down to "Your apps" section**

3. **If you see a web app already:**
   - Click on it to see the config
   - Copy the values

4. **If no web app exists:**
   - Click "Add app" (or the `</>` icon)
   - Choose "Web" platform
   - Register app (nickname is optional, e.g., "Meant2Grow Web")
   - Click "Register app"
   - You'll see the config values

5. **Copy these values:**
   - `apiKey` → `VITE_FIREBASE_API_KEY`
   - `messagingSenderId` → `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` → `VITE_FIREBASE_APP_ID`

## Step 2: Update `.env.local`

Open `.env.local` and replace:
- `YOUR_API_KEY_HERE` with your `apiKey`
- `YOUR_SENDER_ID_HERE` with your `messagingSenderId`
- `YOUR_APP_ID_HERE` with your `appId`

The file should look like this (with your actual values):

```env
# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=493534533344-e2mcmbht3802t1fhdmtq9rgrf0ljc1qe.apps.googleusercontent.com

# Firebase Config
VITE_FIREBASE_API_KEY=AIzaSyC...your-actual-key
VITE_FIREBASE_AUTH_DOMAIN=meant2grow-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=meant2grow-dev
VITE_FIREBASE_STORAGE_BUCKET=meant2grow-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=493534533344
VITE_FIREBASE_APP_ID=1:493534533344:web:...your-actual-app-id

# Functions URL
VITE_FUNCTIONS_URL=https://us-central1-meant2grow-dev.cloudfunctions.net
```

## Next Steps

After updating `.env.local`:
1. ✅ OAuth Client ID - DONE
2. ⏳ Get Firebase config values
3. ⏳ Enable Firestore
4. ⏳ Create service account for Meet API
5. ⏳ Set Firebase Functions secrets
6. ⏳ Deploy!

