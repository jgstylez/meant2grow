# Current Deployment Status

**Last Updated:** December 2024

## ✅ Completed Steps

1. ✅ **OAuth Client ID Created**
   - Client ID: `493534533344-e2mcmbht3802t1fhdmtq9rgrf0ljc1qe.apps.googleusercontent.com`
   - Saved in `.env.local.template`

2. ✅ **Storage Enabled**
   - Bucket: `gs://meant2grow-dev.firebasestorage.app`

3. ✅ **Code Ready**
   - All functions built successfully
   - Frontend code ready
   - Security rules created

## ⏳ Next Steps

### 0. Create Service Account for Meet API (You're here!)

**Current Page:** Service Accounts  
**Quick Guide:** See `CREATE_SERVICE_ACCOUNT.md`

1. Click "+ CREATE SERVICE ACCOUNT"
2. Name: `meant2grow-meet-service`
3. Role: `Service Account User`
4. Create JSON key
5. Enable Meet API
6. Set secrets in Secret Manager

### 1. Create `.env.local` File

Copy `.env.local.template` to `.env.local`:

```bash
cp .env.local.template .env.local
```

Then update it with your Firebase config values (see `GET_FIREBASE_CONFIG.md`).

### 2. Get Firebase Config Values

**Quick Link:** https://console.firebase.google.com/project/meant2grow-dev/settings/general

1. Scroll to "Your apps" section
2. If no web app exists, click "Add app" > Web icon
3. Copy these values:
   - `apiKey` → Replace `YOUR_API_KEY_HERE`
   - `messagingSenderId` → Replace `YOUR_SENDER_ID_HERE`
   - `appId` → Replace `YOUR_APP_ID_HERE`

### 3. Enable Firestore

**Quick Link:** https://console.firebase.google.com/project/meant2grow-dev/firestore

1. Click "Create database"
2. Choose "Start in test mode"
3. Select location: `us-central1`
4. Click "Enable"

### 4. Create Service Account for Meet API

**Quick Links:**
- Enable Meet API: https://console.cloud.google.com/apis/library/meet.googleapis.com?project=meant2grow-dev
- Create Service Account: https://console.cloud.google.com/iam-admin/serviceaccounts?project=meant2grow-dev

1. Enable Meet API
2. Create service account: `meant2grow-meet-service`
3. Create JSON key
4. Save `client_email` and `private_key`

### 5. Set Firebase Functions Secrets

**Quick Link:** https://console.cloud.google.com/secret-manager?project=meant2grow-dev

Create two secrets:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` = your service account email
- `GOOGLE_SERVICE_ACCOUNT_KEY` = your private key

### 6. Deploy

```bash
# Deploy security rules
firebase deploy --only firestore:rules,storage:rules

# Build functions
cd functions && npm run build && cd ..

# Build frontend
npm run build

# Deploy everything
firebase deploy
```

## 📋 Progress Checklist

- [x] OAuth Client ID created
- [x] Storage enabled
- [ ] `.env.local` created with all values
- [ ] Firestore enabled
- [ ] Meet API enabled
- [ ] Service account created
- [ ] Functions secrets set
- [ ] Security rules deployed
- [ ] Functions deployed
- [ ] Hosting deployed

## 🎯 Quick Reference

- **Firebase Console:** https://console.firebase.google.com/project/meant2grow-dev
- **Google Cloud Console:** https://console.cloud.google.com/?project=meant2grow-dev
- **OAuth Client:** https://console.cloud.google.com/apis/credentials?project=meant2grow-dev

