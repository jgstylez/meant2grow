# Final Deployment Steps

✅ **Service Account Created**  
✅ **Secrets Set**  
✅ **`.env.local` Created** (just now)

## Remaining Steps

### Step 1: Complete `.env.local` File

You need to add your Firebase config values. Open `.env.local` and replace:

1. **Get Firebase Config:**
   - Go to: https://console.firebase.google.com/project/meant2grow-dev/settings/general
   - Scroll to "Your apps" section
   - If no web app exists, click "Add app" > Web icon
   - Copy these values:
     - `apiKey` → Replace `YOUR_API_KEY_HERE`
     - `messagingSenderId` → Replace `YOUR_SENDER_ID_HERE`
     - `appId` → Replace `YOUR_APP_ID_HERE`

### Step 2: Enable Firestore

**Quick Link:** https://console.firebase.google.com/project/meant2grow-dev/firestore

1. If you see "Create database", click it
2. Choose "Start in test mode"
3. Select location: `us-central1`
4. Click "Enable"

### Step 3: Deploy Security Rules

```bash
firebase deploy --only firestore:rules,storage:rules
```

### Step 4: Build Functions

```bash
cd functions
npm run build
cd ..
```

### Step 5: Build Frontend

```bash
npm run build
```

### Step 6: Deploy Everything

```bash
firebase deploy
```

Or deploy individually:

```bash
firebase deploy --only functions
firebase deploy --only hosting
```

### Step 7: Test Your App

Visit: https://meant2grow-dev.web.app

Try:

- Google Sign-In
- Create organization
- Join with organization code

## 🎉 You're Almost There!

Just need to:

1. Fill in Firebase config in `.env.local`
2. Enable Firestore
3. Deploy!

## Quick Commands Summary

```bash
# 1. Edit .env.local (add Firebase config values)

# 2. Deploy rules
firebase deploy --only firestore:rules,storage:rules

# 3. Build functions
cd functions && npm run build && cd ..

# 4. Build frontend
npm run build

# 5. Deploy everything
firebase deploy
```

## 🐛 Troubleshooting

### If Firestore command fails:

- Firestore might not be enabled yet
- Go to Firebase Console and enable it first

### If deployment fails:

- Check: `cd functions && npm run build` succeeds
- Verify: `.env.local` has all values filled
- Check: Secrets exist in Secret Manager
