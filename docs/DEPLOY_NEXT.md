# Next Steps - Ready to Deploy!

✅ **Service Account Created**  
✅ **Secrets Set in Secret Manager**

## Step 1: Verify Secrets Are Set

Quick check: https://console.cloud.google.com/secret-manager?project=meant2grow-dev

You should see:

- ✅ `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- ✅ `GOOGLE_SERVICE_ACCOUNT_KEY`

## Step 2: Enable Firestore (if not already done)

**Quick Link:** https://console.firebase.google.com/project/meant2grow-dev/firestore

1. If you see "Create database", click it
2. Choose "Start in test mode"
3. Select location: `us-central1`
4. Click "Enable"

## Step 3: Complete `.env.local` File

Make sure `.env.local` has all values filled in:

```bash
# Check if file exists
cat .env.local
```

If you need to create it:

```bash
cp env.local.example .env.local
```

Then edit `.env.local` and replace:

- `YOUR_API_KEY_HERE` → Your Firebase API key
- `YOUR_SENDER_ID_HERE` → Your Firebase messaging sender ID
- `YOUR_APP_ID_HERE` → Your Firebase app ID

**Get these from:** https://console.firebase.google.com/project/meant2grow-dev/settings/general

## Step 4: Deploy Security Rules

```bash
firebase deploy --only firestore:rules,storage:rules
```

Expected output:

```
✔  firestore: rules deployed
✔  storage: rules deployed
```

## Step 5: Build Functions

```bash
cd functions
npm run build
cd ..
```

## Step 6: Build Frontend

```bash
npm run build
```

## Step 7: Deploy Everything

```bash
# Deploy all at once
firebase deploy

# Or deploy individually:
firebase deploy --only functions
firebase deploy --only hosting
```

## Step 8: Test Your App

After deployment, visit:

- https://meant2grow-dev.web.app
- https://meant2grow-dev.firebaseapp.com

Try:

1. Google Sign-In
2. Create a new organization
3. Test joining with organization code

## 🎉 You're Almost Done!

Just a few more steps and your app will be live!

## 🐛 Troubleshooting

### If deployment fails:

- Check: `cd functions && npm run build` succeeds
- Verify: Secrets exist in Secret Manager
- Check: Firestore is enabled
- Check: Billing is enabled (required for Cloud Functions)

### If functions fail at runtime:

- Check logs: `firebase functions:log`
- Verify secrets are accessible
- Check Meet API is enabled
