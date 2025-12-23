# Deployment Error Fix

## Error

```
Error: Failed to make request to https://serviceusage.googleapis.com/v1/projects/493534533344/services/storage.googleapis.com
```

## Root Cause

Firebase CLI is trying to automatically enable the Storage API but doesn't have permission or billing isn't enabled.

## Solution (Choose One)

### Option 1: Enable Storage API Manually (Recommended)

1. **Go to Google Cloud Console:**
   https://console.cloud.google.com/apis/library/storage.googleapis.com?project=meant2grow-dev

2. **Click "ENABLE"**

3. **Verify billing is enabled:**

   - Go to: https://console.cloud.google.com/billing?project=meant2grow-dev
   - Ensure a billing account is linked

4. **Then deploy again:**
   ```bash
   firebase deploy
   ```

### Option 2: Deploy Without Storage First

Deploy everything except storage, then enable storage separately:

```bash
# Deploy without storage
firebase deploy --except storage

# Then enable storage API manually and deploy storage rules
firebase deploy --only storage:rules
```

### Option 3: Fix Service Account Email Parameter

I noticed the prompt asked for `GOOGLE_SERVICE_ACCOUNT_EMAIL` and you entered `joshua@greenxvii.com`. This should be the service account email from your JSON file:

**Correct value:** `meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com`

Update the `.env.meant2grow-dev` file:

```bash
# Edit the file
nano functions/.env.meant2grow-dev

# Or set it again:
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
# Enter: meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com
```

## Exact Steps to Fix

1. **Enable Storage API:**

   - Visit: https://console.cloud.google.com/apis/library/storage.googleapis.com?project=meant2grow-dev
   - Click "ENABLE"

2. **Check Billing:**

   - Visit: https://console.cloud.google.com/billing?project=meant2grow-dev
   - Ensure billing account is linked (required for Cloud Functions)

3. **Fix Service Account Email:**

   ```bash
   firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
   # Enter: meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com
   ```

4. **Deploy Again:**
   ```bash
   firebase deploy
   ```

## Quick Fix Command

```bash
# Enable Storage API via gcloud (if you have it installed)
gcloud services enable storage.googleapis.com --project=meant2grow-dev

# Or enable via console:
# https://console.cloud.google.com/apis/library/storage.googleapis.com?project=meant2grow-dev
```

## Why This Happens

- Firebase CLI tries to auto-enable APIs during deployment
- Storage API requires billing to be enabled
- The CLI may not have sufficient permissions to enable APIs
- Manual enablement via console is more reliable
