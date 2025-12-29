# Complete Deployment Guide - Meant2Grow to Firebase

This guide covers deploying all changes (frontend, backend, Firestore rules, etc.) to Firebase.

## Quick Deploy (All at Once)

```bash
# 1. Build frontend
npm run build

# 2. Build functions
cd functions && npm run build && cd ..

# 3. Deploy everything
firebase deploy
```

## Step-by-Step Deployment

### Step 1: Prerequisites Check

```bash
# Verify Firebase CLI is installed
firebase --version

# Verify you're logged in
firebase login

# Verify project is set
firebase projects:list
```

### Step 2: Build Frontend

```bash
# Build the React/Vite frontend
npm run build

# Verify dist/ folder was created
ls -la dist/
```

**Expected output:** `dist/` folder with `index.html` and `assets/` folder

### Step 3: Build Cloud Functions

```bash
cd functions

# Install dependencies (if needed)
npm install

# Build TypeScript
npm run build

# Verify build succeeded
ls -la lib/

cd ..
```

**Expected output:** `functions/lib/` folder with compiled JavaScript files

### Step 4: Deploy Firestore Rules & Indexes

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

**Note:** If you get index errors, you may need to wait for indexes to build in Firebase Console.

### Step 5: Deploy Storage Rules

```bash
firebase deploy --only storage:rules
```

### Step 6: Deploy Cloud Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific function
firebase deploy --only functions:authGoogle
firebase deploy --only functions:createMeetLink
```

**Important:** Make sure secrets are set in Google Cloud Secret Manager:

**Check if secrets exist:**
```bash
# Option 1: Using gcloud CLI (if installed)
gcloud secrets list --project=meant2grow-dev

# Option 2: Check in Google Cloud Console
# https://console.cloud.google.com/secret-manager?project=meant2grow-dev
```

**Set secrets if needed:**
```bash
# Set email (string parameter)
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
# When prompted, enter: meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com

# Set private key (secret)
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY
# When prompted, paste the full private key (including BEGIN/END lines)
```

**Or use Google Cloud Console (easier):**
1. Go to: https://console.cloud.google.com/secret-manager?project=meant2grow-dev
2. Click "CREATE SECRET"
3. Create `GOOGLE_SERVICE_ACCOUNT_EMAIL` with your service account email
4. Create `GOOGLE_SERVICE_ACCOUNT_KEY` with your private key

### Step 7: Deploy Frontend (Hosting)

```bash
firebase deploy --only hosting
```

### Step 8: Deploy Everything (Alternative)

If you want to deploy everything at once:

```bash
firebase deploy
```

This will deploy:
- ✅ Hosting (frontend)
- ✅ Functions (backend)
- ✅ Firestore rules
- ✅ Firestore indexes
- ✅ Storage rules

## Post-Deployment Steps

### 1. Verify Deployment

**Check Hosting:**
- Visit: `https://meant2grow-dev.web.app` (or your project URL)
- Verify the app loads correctly

**Check Functions:**
```bash
# View function logs
firebase functions:log

# Or check in Firebase Console
# https://console.firebase.google.com/project/meant2grow-dev/functions
```

**Check Firestore:**
- Go to Firebase Console → Firestore
- Verify rules are active
- Verify indexes are building/completed

### 2. Update Environment Variables

After deployment, update your frontend environment variables if needed:

**Production `.env.production`:**
```env
VITE_FUNCTIONS_URL=https://us-central1-meant2grow-dev.cloudfunctions.net
```

**Note:** The functions URL format is:
```
https://us-central1-{PROJECT_ID}.cloudfunctions.net
```

### 3. Test Critical Features

- [ ] User authentication (Google OAuth)
- [ ] Organization creation
- [ ] User signup with organization code
- [ ] Chat functionality
- [ ] Calendar/meetings
- [ ] Resources (discussion guides, templates, videos)
- [ ] Platform operator features (if applicable)

### 4. Run Migration Scripts (If Needed)

After deployment, you may need to run migration scripts:

```bash
# Create platform operator users
npm run create:platform-admin admin@meant2grow.com "Operator Name"

# Migrate platform resources
npm run migrate:platform-resources
```

**Note:** These scripts need to run locally with proper Firebase Admin credentials.

## Troubleshooting

### Build Errors

**Frontend build fails:**
```bash
# Clear cache and rebuild
rm -rf dist/ node_modules/.vite
npm run build
```

**Functions build fails:**
```bash
cd functions
rm -rf lib/ node_modules
npm install
npm run build
```

### Deployment Errors

**"Permission denied" errors:**
- Verify you're logged in: `firebase login`
- Verify project access: `firebase projects:list`
- Check Firebase Console for project permissions

**"Function deployment failed":**
- Check function logs: `firebase functions:log`
- Verify secrets are set: `firebase functions:secrets:list`
- Check Node.js version (must match runtime in firebase.json)

**"Hosting deployment failed":**
- Verify `dist/` folder exists
- Check `firebase.json` hosting configuration
- Verify `index.html` exists in `dist/`

### Function URL Issues

After deployment, functions are available at:
- `https://us-central1-{PROJECT_ID}.cloudfunctions.net/{functionName}`

Update your frontend code or environment variables to use the correct URLs.

## Deployment Checklist

Before deploying:

- [ ] All code changes committed
- [ ] Frontend builds successfully (`npm run build`)
- [ ] Functions build successfully (`cd functions && npm run build`)
- [ ] Firestore rules tested locally (if using emulator)
- [ ] Environment variables configured
- [ ] Secrets set for Cloud Functions
- [ ] `.firebaserc` has correct project ID

After deploying:

- [ ] Hosting URL loads correctly
- [ ] Functions are accessible
- [ ] Firestore rules deployed
- [ ] Storage rules deployed
- [ ] Test authentication flow
- [ ] Test critical user flows
- [ ] Check function logs for errors
- [ ] Verify environment variables in production

## Rollback (If Needed)

If something goes wrong:

```bash
# View deployment history
firebase hosting:clone meant2grow-dev:live meant2grow-dev:previous

# Or rollback functions
firebase functions:delete functionName
# Then redeploy previous version
```

## Continuous Deployment

For automated deployments, consider setting up:

1. **GitHub Actions** - Auto-deploy on push to main
2. **Firebase CI/CD** - Use Firebase's built-in CI/CD
3. **Manual deployment** - Current approach (recommended for now)

## Next Steps

1. ✅ Deploy everything
2. ✅ Test all features
3. ✅ Set up monitoring/alerts
4. ✅ Configure custom domain (optional)
5. ✅ Set up CI/CD pipeline (optional)

## Quick Reference Commands

```bash
# Build everything
npm run build && cd functions && npm run build && cd ..

# Deploy everything
firebase deploy

# Deploy specific services
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage:rules

# View logs
firebase functions:log
firebase hosting:channel:list

# Check status
firebase projects:list
firebase use
```

