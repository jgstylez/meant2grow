# CI/CD Setup Guide

This guide covers setting up GitHub Actions for automated deployments to sandbox and production environments.

## Overview

The CI/CD pipeline consists of three workflows:

1. **CI** (`ci.yml`) - Runs on all pushes and PRs (`npm run lint`, `npm run build`, functions build; tests placeholder)
2. **Deploy Sandbox** (`deploy-sandbox.yml`) - Deploys to sandbox on push to `main`/`develop`
3. **Deploy Production** (`deploy-production.yml`) - Deploys to production via manual trigger or release tags

## Prerequisites

1. GitHub repository with Actions enabled
2. Firebase projects created (sandbox and production)
3. Firebase CLI token for CI/CD
4. Service account JSON keys for both environments

## Step 1: Generate Firebase CI Token

Generate a Firebase CI token for automated deployments:

```bash
firebase login:ci
```

This will output a token. Save this token securely - you'll need it for GitHub Secrets.

**Important**: Generate separate tokens for sandbox and production if using different Firebase accounts, or use the same token if both projects are in the same account.

## Step 2: Configure GitHub Secrets

Go to your GitHub repository > Settings > Secrets and variables > Actions

### Quick Setup Checklist

Use this checklist to ensure all secrets are configured:

**Firebase Authentication (2 secrets):**
- [ ] `FIREBASE_TOKEN_SANDBOX`
- [ ] `FIREBASE_TOKEN_PRODUCTION`

**Sandbox Environment Variables (15 secrets):**
- [ ] `SANDBOX_GOOGLE_CLIENT_ID`
- [ ] `SANDBOX_FIREBASE_API_KEY`
- [ ] `SANDBOX_FIREBASE_AUTH_DOMAIN`
- [ ] `SANDBOX_FIREBASE_PROJECT_ID`
- [ ] `SANDBOX_FIREBASE_STORAGE_BUCKET`
- [ ] `SANDBOX_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `SANDBOX_FIREBASE_APP_ID`
- [ ] `SANDBOX_FIREBASE_VAPID_KEY`
- [ ] `SANDBOX_FUNCTIONS_URL`
- [ ] `SANDBOX_APP_URL`
- [ ] `SANDBOX_MAILTRAP_API_TOKEN`
- [ ] `SANDBOX_MAILTRAP_INBOX_ID`
- [ ] `SANDBOX_MAILTRAP_FROM_EMAIL`
- [ ] `SANDBOX_MAILTRAP_REPLY_TO_EMAIL`
- [ ] `SANDBOX_GIPHY_API_KEY`

**Production Environment Variables (15 secrets):**
- [ ] `PROD_GOOGLE_CLIENT_ID`
- [ ] `PROD_FIREBASE_API_KEY`
- [ ] `PROD_FIREBASE_AUTH_DOMAIN`
- [ ] `PROD_FIREBASE_PROJECT_ID`
- [ ] `PROD_FIREBASE_STORAGE_BUCKET`
- [ ] `PROD_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `PROD_FIREBASE_APP_ID`
- [ ] `PROD_FIREBASE_VAPID_KEY`
- [ ] `PROD_FUNCTIONS_URL`
- [ ] `PROD_APP_URL`
- [ ] `PROD_MAILTRAP_API_TOKEN`
- [ ] `PROD_MAILTRAP_INBOX_ID`
- [ ] `PROD_MAILTRAP_FROM_EMAIL`
- [ ] `PROD_MAILTRAP_REPLY_TO_EMAIL`
- [ ] `PROD_GIPHY_API_KEY`

**Total: 32 secrets required**

### Step-by-Step Instructions

#### 1. Generate Firebase CI Tokens

First, generate Firebase CI tokens for automated deployments:

**For Sandbox:**
```bash
# Ensure you're authenticated to the sandbox project
firebase use sandbox
firebase login:ci
```

Copy the token that's displayed. This is your `FIREBASE_TOKEN_SANDBOX`.

**For Production:**
```bash
# Switch to production project
firebase use production
firebase login:ci
```

Copy the token that's displayed. This is your `FIREBASE_TOKEN_PRODUCTION`.

**Note**: If both projects are in the same Firebase account, you can use the same token for both. However, it's recommended to generate separate tokens for better security and auditability.

#### 2. Navigate to GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** (top navigation)
3. Click **Secrets and variables** in the left sidebar
4. Click **Actions**

#### 3. Add Firebase Authentication Secrets

Click **New repository secret** and add:

| Secret Name | Value | Where to Find |
|------------|-------|---------------|
| `FIREBASE_TOKEN_SANDBOX` | Token from `firebase login:ci` (sandbox) | Generated in step 1 above |
| `FIREBASE_TOKEN_PRODUCTION` | Token from `firebase login:ci` (production) | Generated in step 1 above |

#### 4. Add Sandbox Environment Variables

Click **New repository secret** for each sandbox variable. Use the values from your `.env.sandbox` file or Firebase Console:

| Secret Name | Value Source | Where to Find |
|------------|--------------|---------------|
| `SANDBOX_GOOGLE_CLIENT_ID` | Google Cloud Console | Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client ID |
| `SANDBOX_FIREBASE_API_KEY` | Firebase Console | Firebase Console > Project Settings > General > Your apps > Web app > API Key |
| `SANDBOX_FIREBASE_AUTH_DOMAIN` | Firebase Console | Firebase Console > Project Settings > General > Your apps > Web app > Auth Domain (usually `meant2grow-dev.firebaseapp.com`) |
| `SANDBOX_FIREBASE_PROJECT_ID` | Firebase Console | Firebase Console > Project Settings > General > Project ID (usually `meant2grow-dev`) |
| `SANDBOX_FIREBASE_STORAGE_BUCKET` | Firebase Console | Firebase Console > Project Settings > General > Your apps > Web app > Storage Bucket (usually `meant2grow-dev.appspot.com`) |
| `SANDBOX_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console | Firebase Console > Project Settings > Cloud Messaging > Sender ID |
| `SANDBOX_FIREBASE_APP_ID` | Firebase Console | Firebase Console > Project Settings > General > Your apps > Web app > App ID |
| `SANDBOX_FIREBASE_VAPID_KEY` | Firebase Console | Firebase Console > Project Settings > Cloud Messaging > Web Push certificates > Key pair > Public key |
| `SANDBOX_FUNCTIONS_URL` | Firebase Console | Cloud Functions URL (usually `https://us-central1-meant2grow-dev.cloudfunctions.net`) |
| `SANDBOX_APP_URL` | Configuration | Application URL (usually `https://sandbox.meant2grow.com`) |
| `SANDBOX_MAILTRAP_API_TOKEN` | Mailtrap Dashboard | Mailtrap Dashboard > Settings > API Tokens |
| `SANDBOX_MAILTRAP_INBOX_ID` | Mailtrap Dashboard | Mailtrap Dashboard > Inboxes > Your Inbox > Settings > SMTP Settings > Inbox ID |
| `SANDBOX_MAILTRAP_FROM_EMAIL` | Configuration | From email address (usually `noreply@meant2grow.com`) |
| `SANDBOX_MAILTRAP_REPLY_TO_EMAIL` | Configuration | Reply-to email address (usually `support@meant2grow.com`) |
| `SANDBOX_GIPHY_API_KEY` | GIPHY Developer Portal | GIPHY Developer Portal > Create App > API Key |

#### 5. Add Production Environment Variables

Click **New repository secret** for each production variable. Use the values from your `.env.production` file or Firebase Console:

| Secret Name | Value Source | Where to Find |
|------------|--------------|---------------|
| `PROD_GOOGLE_CLIENT_ID` | Google Cloud Console | Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client ID (production project) |
| `PROD_FIREBASE_API_KEY` | Firebase Console | Firebase Console > Project Settings > General > Your apps > Web app > API Key (production project) |
| `PROD_FIREBASE_AUTH_DOMAIN` | Firebase Console | Firebase Console > Project Settings > General > Your apps > Web app > Auth Domain (usually `meant2grow-prod.firebaseapp.com`) |
| `PROD_FIREBASE_PROJECT_ID` | Firebase Console | Firebase Console > Project Settings > General > Project ID (usually `meant2grow-prod`) |
| `PROD_FIREBASE_STORAGE_BUCKET` | Firebase Console | Firebase Console > Project Settings > General > Your apps > Web app > Storage Bucket (usually `meant2grow-prod.appspot.com`) |
| `PROD_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console | Firebase Console > Project Settings > Cloud Messaging > Sender ID (production project) |
| `PROD_FIREBASE_APP_ID` | Firebase Console | Firebase Console > Project Settings > General > Your apps > Web app > App ID (production project) |
| `PROD_FIREBASE_VAPID_KEY` | Firebase Console | Firebase Console > Project Settings > Cloud Messaging > Web Push certificates > Key pair > Public key (production project) |
| `PROD_FUNCTIONS_URL` | Firebase Console | Cloud Functions URL (usually `https://us-central1-meant2grow-prod.cloudfunctions.net`) |
| `PROD_APP_URL` | Configuration | Application URL (usually `https://meant2grow.com`) |
| `PROD_MAILTRAP_API_TOKEN` | Mailtrap Dashboard | Mailtrap Dashboard > Settings > API Tokens (production account) |
| `PROD_MAILTRAP_INBOX_ID` | Mailtrap Dashboard | Mailtrap Dashboard > Inboxes > Your Inbox > Settings > SMTP Settings > Inbox ID (production inbox, may be empty) |
| `PROD_MAILTRAP_FROM_EMAIL` | Configuration | From email address (usually `noreply@meant2grow.com`) |
| `PROD_MAILTRAP_REPLY_TO_EMAIL` | Configuration | Reply-to email address (usually `support@meant2grow.com`) |
| `PROD_GIPHY_API_KEY` | GIPHY Developer Portal | GIPHY Developer Portal > Create App > API Key (can be same as sandbox) |

### Quick Reference: Secret Names

**Firebase Authentication Secrets:**
- `FIREBASE_TOKEN_SANDBOX` - Firebase CI token for sandbox
- `FIREBASE_TOKEN_PRODUCTION` - Firebase CI token for production

**Sandbox Environment Variables (all prefixed with `SANDBOX_`):**
- `SANDBOX_GOOGLE_CLIENT_ID`
- `SANDBOX_FIREBASE_API_KEY`
- `SANDBOX_FIREBASE_AUTH_DOMAIN`
- `SANDBOX_FIREBASE_PROJECT_ID`
- `SANDBOX_FIREBASE_STORAGE_BUCKET`
- `SANDBOX_FIREBASE_MESSAGING_SENDER_ID`
- `SANDBOX_FIREBASE_APP_ID`
- `SANDBOX_FIREBASE_VAPID_KEY`
- `SANDBOX_FUNCTIONS_URL`
- `SANDBOX_APP_URL`
- `SANDBOX_MAILTRAP_API_TOKEN`
- `SANDBOX_MAILTRAP_INBOX_ID`
- `SANDBOX_MAILTRAP_FROM_EMAIL`
- `SANDBOX_MAILTRAP_REPLY_TO_EMAIL`
- `SANDBOX_GIPHY_API_KEY`

**Production Environment Variables (all prefixed with `PROD_`):**
- `PROD_GOOGLE_CLIENT_ID`
- `PROD_FIREBASE_API_KEY`
- `PROD_FIREBASE_AUTH_DOMAIN`
- `PROD_FIREBASE_PROJECT_ID`
- `PROD_FIREBASE_STORAGE_BUCKET`
- `PROD_FIREBASE_MESSAGING_SENDER_ID`
- `PROD_FIREBASE_APP_ID`
- `PROD_FIREBASE_VAPID_KEY`
- `PROD_FUNCTIONS_URL`
- `PROD_APP_URL`
- `PROD_MAILTRAP_API_TOKEN`
- `PROD_MAILTRAP_INBOX_ID`
- `PROD_MAILTRAP_FROM_EMAIL`
- `PROD_MAILTRAP_REPLY_TO_EMAIL`
- `PROD_GIPHY_API_KEY`

### Tips for Adding Secrets

1. **Copy from Environment Files**: If you have `.env.sandbox` or `.env.production` files locally, you can copy values from there (remove the `VITE_` prefix for GitHub Secrets).

2. **Use Bulk Import**: GitHub doesn't support bulk import, but you can use the GitHub CLI or API to automate secret creation:
   ```bash
   # Example using GitHub CLI (gh)
   gh secret set SANDBOX_FIREBASE_API_KEY --body "your-api-key"
   ```

3. **Verify Values**: Double-check each value before saving. Secrets cannot be viewed after creation, only updated.

4. **Test After Setup**: After adding all secrets, trigger a test deployment to verify everything works.

### Helper Scripts and Checklists

We've created helper resources to make secret setup easier:

1. **Checklist Document**: `scripts/github-secrets-checklist.md` - Printable checklist of all required secrets
2. **Verification Script**: `scripts/verify-github-secrets.sh` - Script to verify secrets are set (requires GitHub CLI)

To use the verification script:
```bash
# Install GitHub CLI if not already installed
# macOS: brew install gh
# Linux: See https://cli.github.com/

# Authenticate with GitHub
gh auth login

# Run verification script
./scripts/verify-github-secrets.sh
```

## Step 4: Configure Production Environment Protection

For production deployments, set up environment protection rules with approval gates:

1. Go to Settings > Environments
2. Create or edit "production" environment
3. Enable "Required reviewers" (recommended for production)
4. Add required reviewers who can approve production deployments

**📖 Detailed Guide**: See [Production Approval Setup Guide](./PRODUCTION_APPROVAL_SETUP.md) for complete step-by-step instructions on setting up the approval process.

## Step 5: Set Up Firebase Functions Secrets

Functions secrets are managed separately in Firebase Secret Manager for each project.

### Sandbox Functions Secrets

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

### Production Functions Secrets

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

## Step 6: Test CI/CD Pipeline

### Test CI Workflow

1. Push a commit to any branch
2. Go to Actions tab in GitHub
3. Verify CI workflow runs successfully

### Test Sandbox Deployment

1. Push a commit to `main` or `develop` branch
2. Go to Actions tab in GitHub
3. Verify "Deploy to Sandbox" workflow runs successfully
4. Check sandbox.meant2grow.com to verify deployment

### Test Production Deployment

#### Option 1: Manual Trigger

1. Go to Actions > Deploy to Production
2. Click "Run workflow"
3. Type "deploy" in the confirmation field
4. Click "Run workflow"
5. Verify deployment succeeds

#### Option 2: Release Tag

1. Create a new release tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
2. Go to Actions tab in GitHub
3. Verify "Deploy to Production" workflow runs automatically
4. Check meant2grow.com to verify deployment

## Workflow Triggers

### CI Workflow
- **Triggers**: Push to any branch, Pull requests
- **Purpose**: Verify code quality (lint, build, test)

### Sandbox Deployment
- **Triggers**: Push to `main` or `develop` branches
- **Purpose**: Automatically deploy to sandbox environment
- **No approval required**

### Production Deployment
- **Triggers**: 
  - Manual workflow dispatch (requires confirmation)
  - Release tag creation (e.g., `v1.0.0`)
- **Purpose**: Deploy to production environment
- **Requires approval** (if environment protection rules are configured)
- **Approval Process**: See [Production Approval Setup Guide](./PRODUCTION_APPROVAL_SETUP.md)

## Troubleshooting

### Workflow Fails: Authentication Error

- Verify `FIREBASE_TOKEN_SANDBOX` or `FIREBASE_TOKEN_PRODUCTION` is set correctly
- Regenerate token if expired: `firebase login:ci` (run while authenticated to the correct project)
- Ensure the token has permissions to deploy to the target Firebase project

### Workflow Fails: Build Error

- Check GitHub Actions logs for specific error
- Verify all required environment variables are set in GitHub Secrets
- Test build locally: `npm run build:sandbox` or `npm run build:production`

### Workflow Fails: Deployment Error

- Verify Firebase project ID matches GitHub Secret
- Check service account has deployment permissions
- Verify Firebase project exists and services are enabled

### Environment Variables Not Found

- Verify all required secrets are set in GitHub repository settings
- Check secret names match exactly (case-sensitive)
- Ensure secrets are set for the correct environment

## Security Best Practices

1. **Never commit secrets** - Always use GitHub Secrets
2. **Rotate tokens regularly** - Regenerate Firebase CI tokens periodically (tokens don't expire but should be rotated for security)
3. **Use separate tokens** - Generate separate CI tokens for sandbox and production if using different Firebase accounts
4. **Limit access** - Only grant necessary permissions to Firebase projects
5. **Enable branch protection** - Protect `main` branch from direct pushes
6. **Require reviews** - Enable required reviewers for production deployments
7. **Monitor deployments** - Review deployment logs regularly

## Updating Secrets

### Update Environment Variables

1. Go to Settings > Secrets and variables > Actions
2. Find the secret to update
3. Click "Update"
4. Enter new value
5. Save

### Update Firebase Functions Secrets

```bash
# For sandbox
firebase use sandbox
firebase functions:secrets:set SECRET_NAME

# For production
firebase use production
firebase functions:secrets:set SECRET_NAME
```

## Monitoring Deployments

### GitHub Actions

- View workflow runs: Actions tab in GitHub
- View logs: Click on a workflow run to see detailed logs
- View deployment summary: Check workflow summary after completion

### Firebase Console

- View hosting deployments: Firebase Console > Hosting
- View function deployments: Firebase Console > Functions
- View deployment history: Check release history in Hosting

## Support

For CI/CD issues:
1. Check GitHub Actions logs
2. Verify all secrets are configured correctly
3. Test workflows locally if possible
4. Contact the development team
