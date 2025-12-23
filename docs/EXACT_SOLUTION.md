# Exact Solution for Deployment Error

## Issues Found

1. **Storage API Enablement Error:** Firebase CLI can't enable `storage.googleapis.com` automatically
2. **Wrong Service Account Email:** Set to `joshua@greenxvii.com` instead of service account email

## Exact Fix Steps

### Step 1: Enable Storage API Manually

**Open this URL and click "ENABLE":**
```
https://console.cloud.google.com/apis/library/storage.googleapis.com?project=meant2grow-dev
```

### Step 2: Fix Service Account Email

The `.env.meant2grow-dev` file has the wrong email. Fix it:

```bash
# Set the correct service account email
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
```

**When prompted, paste this (from your JSON file):**
```
meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com
```

**Or edit the file directly:**
```bash
# Edit the file
nano functions/.env.meant2grow-dev

# Change this line:
GOOGLE_SERVICE_ACCOUNT_EMAIL=joshua@greenxvii.com

# To:
GOOGLE_SERVICE_ACCOUNT_EMAIL=meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com
```

### Step 3: Verify Billing is Enabled

**Check billing:**
```
https://console.cloud.google.com/billing?project=meant2grow-dev
```

Cloud Functions requires billing to be enabled.

### Step 4: Deploy Again

```bash
firebase deploy
```

## Why This Happened

1. **Storage API:** Firebase CLI tries to auto-enable APIs but may lack permissions. Manual enablement via console is more reliable.

2. **Service Account Email:** During the prompt, a personal email was entered instead of the service account email from the JSON key file.

## Quick Commands

```bash
# Fix service account email
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
# Paste: meant2grow-meet-service@meant2grow-dev.iam.gserviceaccount.com

# Then deploy
firebase deploy
```

## After Fixing

The deployment should proceed past the Storage API error and continue with:
- ✅ Functions deployment
- ✅ Hosting deployment
- ✅ Rules deployment

