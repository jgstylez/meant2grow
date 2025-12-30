# Fix: App Engine Required for Firebase Functions Deployment

## Issue
```
Error: Failed to make request to https://cloudfunctions.googleapis.com/v2/projects/meant2grow-dev/locations/us-central1/functions:generateUploadUrl

There was an issue deploying your functions. Verify that your project has a Google App Engine instance setup.
```

## Solution

Firebase Functions v2 requires Google App Engine to be enabled in your project. Here's how to fix it:

### Option 1: Enable App Engine via Console (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/appengine)
2. Select your project: `meant2grow-dev`
3. Click "Create Application"
4. Choose a region (use `us-central` to match your functions region)
5. Click "Create"
6. Wait for App Engine to initialize (takes 1-2 minutes)

### Option 2: Enable via gcloud CLI

```bash
# Install gcloud CLI if not already installed
# https://cloud.google.com/sdk/docs/install

# Login and set project
gcloud auth login
gcloud config set project meant2grow-dev

# Enable App Engine API
gcloud services enable appengine.googleapis.com

# Create App Engine app
gcloud app create --region=us-central
```

### Option 3: Enable via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `meant2grow-dev`
3. Go to Settings → Project Settings
4. Under "Your apps", if App Engine isn't enabled, you'll see a prompt
5. Click "Enable App Engine" or follow the link to Google Cloud Console

## After Enabling App Engine

Once App Engine is enabled, try deploying again:

```bash
cd functions
npm run build  # Verify build succeeds
firebase deploy --only functions
```

## Notes

- App Engine is free for the first 28 hours per day
- You only need to enable it once per project
- It's required for Firebase Functions v2 (onCall functions)
- The region should match your functions region (`us-central1`)

## Verify App Engine is Enabled

```bash
gcloud app describe --project=meant2grow-dev
```

You should see your App Engine app details.

---

**Status:** After enabling App Engine, the deployment should succeed! ✅

