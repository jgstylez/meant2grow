# Quick Fix for Deployment Error

## The Problem
Deployment fails when trying to enable Storage API automatically.

## The Solution (3 Steps)

### Step 1: Enable Storage API Manually
**Open this link and click "ENABLE":**
https://console.cloud.google.com/apis/library/storage.googleapis.com?project=meant2grow-dev

### Step 2: Fix Service Account Email
The deployment prompted for `GOOGLE_SERVICE_ACCOUNT_EMAIL` but you entered your personal email. It needs the service account email:

```bash
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
```

**When prompted, enter:**
```
meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com
```

(Get this from your `meant2grow-dev-dfcfbc9ebeaa.json` file - it's the `client_email` field)

### Step 3: Ensure Billing is Enabled
**Check billing:**
https://console.cloud.google.com/billing?project=meant2grow-dev

Cloud Functions requires billing to be enabled.

### Step 4: Deploy Again
```bash
firebase deploy
```

## That's It!

After enabling the Storage API manually, the deployment should proceed successfully.

