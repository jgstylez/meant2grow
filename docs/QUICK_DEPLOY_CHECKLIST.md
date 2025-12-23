# Quick Deployment Checklist

## Pre-Deployment

- [ ] **Firebase CLI installed and logged in**
  ```bash
  firebase --version  # Should show version
  firebase login      # Login if needed
  ```

- [ ] **Project is set**
  ```bash
  firebase use meant2grow-dev  # or your project ID
  ```

- [ ] **Secrets are set** (for Cloud Functions)
  - Check: https://console.cloud.google.com/secret-manager?project=meant2grow-dev
  - Should see: `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_KEY`
  - If missing, set them:
    ```bash
    firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
    firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY
    ```

- [ ] **Environment variables configured**
  - `.env.local` exists for local development
  - `.env.production` exists for production builds (optional)

## Build & Deploy

### Step 1: Build Frontend
```bash
npm run build
```
✅ Verify: `dist/` folder created with `index.html`

### Step 2: Build Functions
```bash
cd functions
npm install  # if needed
npm run build
cd ..
```
✅ Verify: `functions/lib/` folder created with compiled JS

### Step 3: Deploy Everything
```bash
firebase deploy
```

This will deploy:
- ✅ Hosting (frontend)
- ✅ Functions (backend)
- ✅ Firestore rules
- ✅ Firestore indexes
- ✅ Storage rules

## Post-Deployment

- [ ] **Test hosting URL**
  - Visit: https://meant2grow-dev.web.app
  - Verify app loads

- [ ] **Check function logs**
  ```bash
  firebase functions:log
  ```

- [ ] **Verify Firestore rules**
  - Go to: Firebase Console → Firestore → Rules
  - Verify rules are deployed

- [ ] **Test critical features**
  - [ ] User authentication
  - [ ] Organization creation
  - [ ] Chat functionality
  - [ ] Resources (guides, templates, videos)

## Troubleshooting

**If deployment fails:**
1. Check error message
2. Verify all prerequisites above
3. Check `firebase-debug.log` for details

**If functions fail:**
- Verify secrets exist in Secret Manager
- Check function logs: `firebase functions:log`
- Verify Node.js version matches runtime (nodejs20)

**If hosting fails:**
- Verify `dist/` folder exists
- Check `firebase.json` configuration
- Verify `index.html` exists in `dist/`

## Quick Commands Reference

```bash
# Build everything
npm run build && cd functions && npm run build && cd ..

# Deploy everything
firebase deploy

# Deploy specific
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules

# Check status
firebase projects:list
firebase use
```

