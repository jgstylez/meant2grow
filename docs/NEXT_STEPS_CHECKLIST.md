# Next Steps Checklist

This checklist guides you through completing the remaining manual setup tasks for the CI/CD implementation.

## ✅ Code Implementation Complete

All code changes have been implemented:
- ✅ Firebase configuration updated
- ✅ Environment config files created
- ✅ GitHub Actions workflows created
- ✅ Build configuration updated
- ✅ Functions configuration updated
- ✅ Helper scripts created
- ✅ Documentation created

## 📋 Manual Setup Tasks

### Task 1: Create Production Firebase Project

**Status:** ⏳ Pending

**Steps:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name: `meant2grow-prod`
4. Click "Continue"
5. **Disable Google Analytics** (or enable if you want analytics)
6. Click "Create project"
7. Wait for project creation to complete

**Enable Required Services:**

1. **Firestore Database:**
   - Go to Firestore Database
   - Click "Create database"
   - Choose "Start in production mode" (we'll deploy rules)
   - Select location: `us-central1` (same as sandbox)
   - Click "Enable"

2. **Storage:**
   - Go to Storage
   - Click "Get started"
   - Choose "Start in production mode" (we'll deploy rules)
   - Click "Next" then "Done"

3. **Authentication:**
   - Go to Authentication
   - Click "Get started"
   - Enable "Email/Password"
   - Enable "Google" (add OAuth consent screen if needed)
   - Click "Save"

4. **Cloud Functions:**
   - Go to Functions
   - Click "Get started"
   - Enable billing if prompted
   - Functions will be deployed automatically via CI/CD

5. **Cloud Messaging:**
   - Go to Cloud Messaging
   - Click "Get started"
   - Generate Web Push certificates (VAPID key)
   - Save the VAPID key for GitHub Secrets

**Create Web App:**

1. Go to Project Settings > General
2. Scroll to "Your apps" section
3. Click the Web icon (`</>`)
4. Register app (nickname: "Meant2Grow Production")
5. **Copy all config values** - you'll need these for GitHub Secrets:
   - API Key
   - Auth Domain
   - Project ID
   - Storage Bucket
   - Messaging Sender ID
   - App ID

**Set Custom Domain:**

1. Go to Hosting
2. Click "Get started"
3. After initial setup, click "Add custom domain"
4. Enter: `meant2grow.com`
5. Follow verification steps
6. Update DNS records as instructed

**Checklist:**
- [ ] Production Firebase project created (`meant2grow-prod`)
- [ ] Firestore enabled (region: `us-central1`)
- [ ] Storage enabled
- [ ] Authentication enabled (Email/Password + Google)
- [ ] Cloud Functions enabled
- [ ] Cloud Messaging enabled (VAPID key generated)
- [ ] Web app created and config values copied
- [ ] Custom domain `meant2grow.com` configured

---

### Task 2: Update Local Firebase Configuration

**Status:** ⏳ Pending

**Steps:**

1. Copy `.firebaserc.example` to `.firebaserc`:
   ```bash
   cp .firebaserc.example .firebaserc
   ```

2. Verify `.firebaserc` contains:
   ```json
   {
     "projects": {
       "default": "meant2grow-dev",
       "sandbox": "meant2grow-dev",
       "production": "meant2grow-prod"
     }
   }
   ```

3. Test Firebase project switching:
   ```bash
   firebase use sandbox
   firebase use production
   firebase use default
   ```

**Checklist:**
- [ ] `.firebaserc` file created from example
- [ ] Project aliases verified
- [ ] Firebase project switching tested

---

### Task 3: Configure GitHub Secrets

**Status:** ⏳ Pending

**Steps:**

1. Go to your GitHub repository
2. Navigate to: **Settings** > **Secrets and variables** > **Actions**
3. Click **"New repository secret"**

**Add Firebase Authentication Secrets:**

- `FIREBASE_TOKEN_SANDBOX`:
  ```bash
  firebase use sandbox
  firebase login:ci
  # Copy the token that's displayed
  ```

- `FIREBASE_TOKEN_PRODUCTION`:
  ```bash
  firebase use production
  firebase login:ci
  # Copy the token that's displayed
  ```

**Add Sandbox Environment Variables:**

Add these secrets with `SANDBOX_` prefix (get values from Firebase Console for `meant2grow-dev`):

- `SANDBOX_GOOGLE_CLIENT_ID`
- `SANDBOX_FIREBASE_API_KEY`
- `SANDBOX_FIREBASE_AUTH_DOMAIN`
- `SANDBOX_FIREBASE_PROJECT_ID`
- `SANDBOX_FIREBASE_STORAGE_BUCKET`
- `SANDBOX_FIREBASE_MESSAGING_SENDER_ID`
- `SANDBOX_FIREBASE_APP_ID`
- `SANDBOX_FIREBASE_VAPID_KEY`
- `SANDBOX_APP_URL` (https://sandbox.meant2grow.com)
- `SANDBOX_MAILTRAP_API_TOKEN` (optional)
- `SANDBOX_MAILTRAP_INBOX_ID` (optional)
- `SANDBOX_MAILTRAP_FROM_EMAIL` (optional)
- `SANDBOX_MAILTRAP_REPLY_TO_EMAIL` (optional)
- `SANDBOX_GIPHY_API_KEY` (optional)

**Add Production Environment Variables:**

Add these secrets with `PROD_` prefix (get values from Firebase Console for `meant2grow-prod`):

- `PROD_GOOGLE_CLIENT_ID`
- `PROD_FIREBASE_API_KEY`
- `PROD_FIREBASE_AUTH_DOMAIN`
- `PROD_FIREBASE_PROJECT_ID`
- `PROD_FIREBASE_STORAGE_BUCKET`
- `PROD_FIREBASE_MESSAGING_SENDER_ID`
- `PROD_FIREBASE_APP_ID`
- `PROD_FIREBASE_VAPID_KEY`
- `PROD_APP_URL` (https://meant2grow.com)
- `PROD_MAILTRAP_API_TOKEN` (optional)
- `PROD_MAILTRAP_INBOX_ID` (optional)
- `PROD_MAILTRAP_FROM_EMAIL` (optional)
- `PROD_MAILTRAP_REPLY_TO_EMAIL` (optional)
- `PROD_GIPHY_API_KEY` (optional)

**Checklist:**
- [ ] `FIREBASE_TOKEN_SANDBOX` added
- [ ] `FIREBASE_TOKEN_PRODUCTION` added
- [ ] All `SANDBOX_*` secrets added
- [ ] All `PROD_*` secrets added

---

### Task 4: Set Up Firebase Functions Secrets

**Status:** ⏳ Pending

**For Sandbox Project:**

```bash
firebase use sandbox
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
# When prompted, enter: your-service-account@meant2grow-dev.iam.gserviceaccount.com

firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY
# When prompted, paste the full private key (including BEGIN/END lines)

firebase functions:secrets:set MAILTRAP_API_TOKEN
firebase functions:secrets:set MAILTRAP_USE_SANDBOX
# Enter: true

firebase functions:secrets:set MAILTRAP_INBOX_ID
firebase functions:secrets:set MAILTRAP_FROM_EMAIL
firebase functions:secrets:set MAILTRAP_REPLY_TO_EMAIL
firebase functions:secrets:set VITE_APP_URL
# Enter: https://sandbox.meant2grow.com
```

**For Production Project:**

```bash
firebase use production
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
# When prompted, enter: your-service-account@meant2grow-prod.iam.gserviceaccount.com

firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY
# When prompted, paste the full private key (including BEGIN/END lines)

firebase functions:secrets:set MAILTRAP_API_TOKEN
firebase functions:secrets:set MAILTRAP_USE_SANDBOX
# Enter: false

firebase functions:secrets:set MAILTRAP_INBOX_ID
firebase functions:secrets:set MAILTRAP_FROM_EMAIL
firebase functions:secrets:set MAILTRAP_REPLY_TO_EMAIL
firebase functions:secrets:set VITE_APP_URL
# Enter: https://meant2grow.com
```

**Checklist:**
- [ ] Sandbox Functions secrets set
- [ ] Production Functions secrets set

---

### Task 5: Deploy Firestore Rules and Indexes

**Status:** ⏳ Pending

**For Sandbox:**

```bash
firebase use sandbox
firebase deploy --only firestore:rules,firestore:indexes
```

**For Production:**

```bash
firebase use production
firebase deploy --only firestore:rules,firestore:indexes
```

**Checklist:**
- [ ] Sandbox Firestore rules deployed
- [ ] Sandbox Firestore indexes deployed
- [ ] Production Firestore rules deployed
- [ ] Production Firestore indexes deployed

---

### Task 6: Test CI/CD Workflows

**Status:** ⏳ Pending

**Test CI Workflow:**

1. Push a commit to any branch
2. Go to GitHub > Actions tab
3. Verify CI workflow runs successfully
4. Check that build completes without errors

**Test Sandbox Deployment:**

1. Push a commit to `main` or `develop` branch
2. Go to GitHub > Actions tab
3. Verify "Deploy to Sandbox" workflow runs
4. Check deployment logs for errors
5. Visit `sandbox.meant2grow.com` to verify deployment

**Test Production Deployment:**

1. Go to GitHub > Actions > "Deploy to Production"
2. Click "Run workflow"
3. Type "deploy" in the confirmation field
4. Click "Run workflow"
5. Verify deployment succeeds
6. Visit `meant2grow.com` to verify deployment

**Checklist:**
- [ ] CI workflow tested and working
- [ ] Sandbox deployment tested and working
- [ ] Production deployment tested and working
- [ ] Both environments accessible and functional

---

## 🎯 Quick Start Commands

Once setup is complete, you can use these commands:

```bash
# Local development
npm run dev

# Build for sandbox
npm run build:sandbox

# Build for production
npm run build:production

# Deploy to sandbox (manual)
npm run firebase:deploy:sandbox

# Deploy to production (manual)
npm run firebase:deploy:production
```

## 📚 Reference Documentation

- **Deployment Guide:** `docs/DEPLOYMENT.md`
- **CI/CD Setup:** `docs/CI_CD_SETUP.md`
- **Implementation Summary:** `docs/IMPLEMENTATION_SUMMARY.md`

## 🆘 Troubleshooting

If you encounter issues:

1. Check the troubleshooting sections in `docs/DEPLOYMENT.md`
2. Review GitHub Actions logs for detailed error messages
3. Verify all secrets are configured correctly
4. Test builds locally before deploying

## ✨ Next Steps After Setup

1. Set up branch protection rules for `main` branch
2. Configure required reviewers for production deployments
3. Set up monitoring/alerting for deployments
4. Document the process for your team
5. Create a release process document
