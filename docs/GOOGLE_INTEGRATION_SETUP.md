# Google Services Integration Setup Guide

This guide will help you set up all the Google services needed for Meant2Grow.

## Prerequisites

1. A Google Cloud account
2. A Firebase project
3. Firebase CLI installed (`npm install -g firebase-tools`)
4. Node.js 18+ installed

## Step 1: Set Up Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Identity and Access Management (IAM) API**
   - **Google Meet API** (for video calls)

### Enable APIs:

```bash
# Or use the console UI
gcloud services enable iam.googleapis.com
gcloud services enable meet.googleapis.com
```

## Step 2: Configure OAuth 2.0

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Configure OAuth consent screen:
   - User Type: External (or Internal for Workspace)
   - App name: Meant2Grow
   - User support email: your email
   - Scopes: Only request these minimal scopes:
     - `openid`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
   - **DO NOT** request calendar or drive scopes
4. Create OAuth client ID:
   - Application type: **Web application**
   - Name: Meant2Grow Web Client
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - `https://your-project-id.web.app` (Firebase Hosting)
     - `https://your-project-id.firebaseapp.com` (Firebase Hosting)
     - `https://your-custom-domain.com` (if using custom domain)
   - Authorized redirect URIs:
     - `http://localhost:3000`
     - `https://your-project-id.web.app`
     - `https://your-project-id.firebaseapp.com`
     - `https://your-custom-domain.com`
5. Copy the **Client ID** - you'll need this for `VITE_GOOGLE_CLIENT_ID`

## Step 3: Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing
3. Enable **Firestore Database**:
   - Go to **Firestore Database** > **Create database**
   - Start in **test mode** (we'll add security rules later)
   - Choose a location
4. Enable **Cloud Storage**:
   - Go to **Storage** > **Get started**
   - Start in **test mode**
   - Use same location as Firestore
5. Enable **Cloud Functions**:
   - Go to **Functions** > **Get started**
   - Choose a location (preferably same as Firestore)
   - Enable billing if prompted (required for Cloud Functions)
6. Enable **Firebase Hosting**:
   - Go to **Hosting** > **Get started**
   - Follow the setup wizard
7. Get your Firebase config:
   - Go to **Project Settings** > **General**
   - Scroll to **Your apps** > **Web app** (or create one)
   - Copy the config values
8. Initialize Firebase in your project:
   ```bash
   firebase login
   firebase init
   ```
   - Select: Hosting, Functions, Firestore, Storage
   - Choose your Firebase project
   - Follow the prompts

## Step 4: Create Service Account for Meet API

1. In Google Cloud Console, go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Fill in:
   - Name: `meant2grow-meet-service`
   - Description: Service account for creating Google Meet links
4. Grant roles:
   - **Service Account User**
5. Click **Done**
6. Click on the service account you just created
7. Go to **Keys** tab > **Add Key** > **Create new key**
8. Choose **JSON** format
9. Download the JSON file
10. Extract these values from the JSON:
    - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
    - `private_key` → `GOOGLE_SERVICE_ACCOUNT_KEY`
    - `project_id` → `FIREBASE_PROJECT_ID` (if using same project)

## Step 5: Grant Meet API Permissions

1. In Google Cloud Console, go to **IAM & Admin** > **IAM**
2. Find your service account
3. Click **Edit** (pencil icon)
4. Click **Add Another Role**
5. Add role: **Service Account User** (if not already added)
6. For Meet API, you may need to grant additional permissions:
   - Go to **APIs & Services** > **Library**
   - Search for "Google Meet API"
   - Click **Enable** (if not already enabled)

## Step 6: Configure Environment Variables

### Local Development (.env.local)

Create a `.env.local` file in the root directory:

```env
# Google OAuth (Client-side)
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id_here

# Firebase (Client-side)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

### Firebase Cloud Functions Environment Variables

**IMPORTANT:** We're using Firebase Functions v2 with `params` (not the deprecated `functions.config()`).

For Cloud Functions, set environment variables using Firebase CLI:

```bash
# Set string parameter (for non-sensitive values)
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
# When prompted, enter: your-service-account@your-project.iam.gserviceaccount.com

# Set secret parameter (for sensitive values like private keys)
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY
# When prompted, paste your private key (including BEGIN/END lines)
```

**Note:** The functions code uses `defineString` and `defineSecret` from `firebase-functions/params`. These are the modern, recommended approach and will continue to work after March 2026 when `functions.config()` is deprecated.

### Firebase Hosting Environment Variables

For client-side environment variables in Firebase Hosting:

1. Create a `.env.production` file with your production values
2. These will be baked into your build during `npm run build`
3. Or use Firebase Hosting environment variables (requires Firebase Hosting config)

**Important:** Client-side variables (`VITE_*`) are embedded in your build, so they're public. Only use non-sensitive values.

## Step 7: Firestore Security Rules

Update your Firestore security rules to enforce organization-based isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user belongs to organization
    function isUserInOrg(organizationId) {
      return request.auth != null &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.organizationId == organizationId;
    }

    // Organizations - users can read their own org
    match /organizations/{orgId} {
      allow read: if isUserInOrg(orgId);
      allow write: if false; // Only via admin/API
    }

    // Users - can read users in same org, write own profile
    match /users/{userId} {
      allow read: if request.auth != null &&
                     resource.data.organizationId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.organizationId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Matches - org-scoped
    match /matches/{matchId} {
      allow read, write: if request.auth != null &&
                            resource.data.organizationId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.organizationId;
    }

    // Goals - org-scoped
    match /goals/{goalId} {
      allow read: if request.auth != null &&
                     resource.data.organizationId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.organizationId;
      allow write: if request.auth != null &&
                      resource.data.organizationId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.organizationId &&
                      resource.data.userId == request.auth.uid;
    }

    // Calendar Events - org-scoped
    match /calendarEvents/{eventId} {
      allow read, write: if request.auth != null &&
                            resource.data.organizationId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.organizationId;
    }

    // Resources - org-scoped
    match /resources/{resourceId} {
      allow read: if request.auth != null &&
                     resource.data.organizationId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.organizationId;
      allow write: if request.auth != null &&
                      resource.data.organizationId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.organizationId;
    }

    // Notifications - org-scoped
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null &&
                            resource.data.organizationId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.organizationId &&
                            resource.data.userId == request.auth.uid;
    }
  }
}
```

## Step 8: Cloud Storage Security Rules

Update your Cloud Storage rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Organization-scoped file access
    match /{organizationId}/{allPaths=**} {
      allow read: if request.auth != null &&
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.organizationId == organizationId;
      allow write: if request.auth != null &&
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.organizationId == organizationId;
    }
  }
}
```

## Step 9: Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to the authentication page
3. Click "Continue with Google"
4. Sign in with your Google account
5. Create a new organization or join an existing one
6. Verify that:
   - User is created in Firestore
   - Organization is created (if new org)
   - You can access the dashboard

## Troubleshooting

### Google Sign-In not working

- Check that `VITE_GOOGLE_CLIENT_ID` is set correctly
- Verify the Google Sign-In script is loaded in `index.html`
- Check browser console for errors
- Ensure OAuth consent screen is configured

### Firebase errors

- Verify all Firebase environment variables are set
- Check Firestore is enabled and in test mode initially
- Verify Cloud Storage is enabled

### Meet API errors

- Ensure Meet API is enabled in Google Cloud Console
- Verify service account has correct permissions
- Check service account credentials are set in Cloud Functions config

### Cloud Functions errors

- Check Firebase Functions logs: `firebase functions:log`
- Verify secrets are set: `firebase functions:secrets:access GOOGLE_SERVICE_ACCOUNT_EMAIL`
- Ensure Firebase Admin SDK is initialized correctly
- Check that billing is enabled for Cloud Functions
- Verify functions are using v2 API (`firebase-functions/v2/https`)
- Ensure secrets are referenced in function options: `secrets: [serviceAccountKey]`

### Firebase Hosting errors

- Verify build completes successfully: `npm run build`
- Check `firebase.json` configuration
- Review Firebase Hosting logs in console

## Next Steps

1. Implement JWT token generation for authentication
2. Add proper error handling and user feedback
3. Set up Firestore indexes for better query performance
4. Implement real-time listeners for chat and notifications
5. Add file upload functionality for resources and avatars
6. Integrate Meet links into calendar events

## Step 10: Deploy to Firebase

### Build and Deploy

```bash
# Build the frontend
npm run build

# Deploy everything (Hosting + Functions)
firebase deploy

# Or deploy individually
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

### Custom Domain (Optional)

1. Go to Firebase Console > Hosting
2. Click **Add custom domain**
3. Follow the verification steps
4. Update your OAuth redirect URIs to include the custom domain

## Security Notes

- **Never** commit `.env.local` to version control
- Use Firebase Secret Manager for sensitive Cloud Functions variables
- Regularly rotate service account keys
- Review Firestore security rules before going to production
- Consider implementing rate limiting on Cloud Functions
- Add proper authentication middleware for API routes
- Use Firebase App Check to protect your APIs from abuse
- Enable CORS properly in Cloud Functions if needed
