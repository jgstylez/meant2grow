# Deployment Guide

This guide covers deployment procedures for both sandbox and production environments.

## Overview

The application uses two separate Firebase projects:
- **Sandbox**: `meant2grow-dev` (sandbox.meant2grow.com)
- **Production**: `meant2grow-prod` (meant2grow.com)

## Prerequisites

1. Firebase CLI installed: `npm install -g firebase-tools`
2. Authenticated with Firebase: `firebase login`
3. Node.js 20+ installed
4. `.firebaserc` file configured (copy from `.firebaserc.example`)

## Environment Setup

### 1. Configure `.firebaserc`

Copy the example file and update with your project IDs:

```bash
cp .firebaserc.example .firebaserc
```

The `.firebaserc` file should contain:

```json
{
  "projects": {
    "default": "meant2grow-dev",
    "sandbox": "meant2grow-dev",
    "production": "meant2grow-prod"
  }
}
```

### 2. Create Environment Files

#### For Sandbox:
```bash
cp .env.sandbox.example .env.sandbox
# Edit .env.sandbox with actual sandbox values
```

#### For Production:
```bash
cp .env.production.example .env.production
# Edit .env.production with actual production values
```

#### For Local Development:
```bash
cp env.local.example .env.local
# Edit .env.local with actual local values
```

## Manual Deployment

### Deploy to Sandbox

```bash
# Switch to sandbox project
firebase use sandbox

# Build and deploy
npm run build:sandbox
firebase deploy
```

Or use the convenience script:
```bash
npm run firebase:deploy:sandbox
```

### Deploy to Production

```bash
# Switch to production project
firebase use production

# Build and deploy
npm run build:production
firebase deploy
```

Or use the convenience script:
```bash
npm run firebase:deploy:production
```

### Deploy Specific Services

```bash
# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only Storage rules
firebase deploy --only storage:rules

# Deploy multiple services
firebase deploy --only hosting,functions,firestore:rules
```

## Automated Deployment (CI/CD)

Deployments are automated via GitHub Actions:

- **Sandbox**: Automatically deploys on push to `main` or `develop` branches
- **Production**: Deploy manually via GitHub Actions UI or create a release tag

See [CI_CD_SETUP.md](./CI_CD_SETUP.md) for setup instructions.

## Firebase Functions Secrets

Functions secrets are managed separately for each environment using Firebase Secret Manager.

### Set Secrets for Sandbox

```bash
firebase use sandbox
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY
firebase functions:secrets:set MAILTRAP_API_TOKEN
firebase functions:secrets:set MAILTRAP_USE_SANDBOX
firebase functions:secrets:set MAILTRAP_INBOX_ID
firebase functions:secrets:set MAILTRAP_FROM_EMAIL
firebase functions:secrets:set MAILTRAP_REPLY_TO_EMAIL
firebase functions:secrets:set VITE_APP_URL
```

### Set Secrets for Production

```bash
firebase use production
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY
firebase functions:secrets:set MAILTRAP_API_TOKEN
firebase functions:secrets:set MAILTRAP_USE_SANDBOX
firebase functions:secrets:set MAILTRAP_INBOX_ID
firebase functions:secrets:set MAILTRAP_FROM_EMAIL
firebase functions:secrets:set MAILTRAP_REPLY_TO_EMAIL
firebase functions:secrets:set VITE_APP_URL
```

## Environment Variables Reference

### Required Variables

All environments require these variables (with environment-specific values):

- `VITE_GOOGLE_CLIENT_ID` - Google OAuth Client ID
- `VITE_FIREBASE_API_KEY` - Firebase API Key
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase Auth Domain
- `VITE_FIREBASE_PROJECT_ID` - Firebase Project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Firebase Storage Bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase Messaging Sender ID
- `VITE_FIREBASE_APP_ID` - Firebase App ID
- `VITE_FIREBASE_VAPID_KEY` - Firebase VAPID Key (for push notifications)
- `VITE_FUNCTIONS_URL` - Cloud Functions URL
- `VITE_APP_URL` - Application URL

### Optional Variables

- `VITE_MAILTRAP_API_TOKEN` - Mailtrap API token
- `VITE_MAILTRAP_USE_SANDBOX` - Use Mailtrap sandbox mode (true/false)
- `VITE_MAILTRAP_INBOX_ID` - Mailtrap inbox ID
- `VITE_MAILTRAP_FROM_EMAIL` - From email address
- `VITE_MAILTRAP_REPLY_TO_EMAIL` - Reply-to email address
- `VITE_GIPHY_API_KEY` - GIPHY API key for GIF picker
- `FLOWGLAD_SECRET_KEY` - Flowglad secret key
- `FLOWGLAD_WEBHOOK_SECRET` - Flowglad webhook secret
- `FLOWGLAD_PRICE_*` - Flowglad price IDs

## Troubleshooting

### Build Fails

1. Check Node.js version: `node --version` (should be 20+)
2. Clear node_modules and reinstall: `rm -rf node_modules && npm ci`
3. Check environment variables are set correctly
4. Verify `.firebaserc` is configured correctly

### Deployment Fails

1. Verify Firebase authentication: `firebase login`
2. Check correct project is selected: `firebase use`
3. Verify you have deployment permissions for the project
4. Check Firebase project exists and services are enabled

### Functions Deployment Fails

1. Verify functions build succeeds: `cd functions && npm run build`
2. Check Firebase Functions secrets are set correctly
3. Verify service account has necessary permissions
4. Check Firebase Functions billing is enabled

### Environment Variables Not Loading

1. Verify `.env.*` files exist and are in the correct location
2. Check file naming matches environment (`.env.sandbox`, `.env.production`)
3. Verify variables have `VITE_` prefix for client-side access
4. Restart development server after changing `.env` files

## Best Practices

1. **Always test in sandbox first** before deploying to production
2. **Use separate OAuth clients** for sandbox and production
3. **Keep secrets secure** - never commit `.env` files or `.firebaserc`
4. **Verify deployments** by checking the deployed URLs after deployment
5. **Monitor deployments** via Firebase Console and GitHub Actions
6. **Use environment-specific service accounts** for better security
7. **Document any manual changes** made directly in Firebase Console

## Rollback Procedure

If a deployment causes issues:

1. **Hosting Rollback**: Use Firebase Console > Hosting > Releases to rollback
2. **Functions Rollback**: Redeploy previous version from git history
3. **Rules Rollback**: Redeploy previous rules from git history

```bash
# Rollback to a specific commit
git checkout <previous-commit-hash>
npm run build:sandbox  # or build:production
firebase deploy
git checkout main  # or your working branch
```

## Support

For deployment issues:
1. Check GitHub Actions logs for CI/CD deployments
2. Check Firebase Console for deployment status
3. Review application logs in Firebase Console
4. Contact the development team
