# Firebase Deployment Guide

This guide covers deploying Meant2Grow to Firebase Hosting and Cloud Functions.

## Prerequisites

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project (if not done):
   ```bash
   firebase init
   ```
   Select:
   - ✅ Hosting
   - ✅ Functions
   - ✅ Firestore
   - ✅ Storage

## Project Structure

```
meant2grow/
├── functions/              # Cloud Functions
│   ├── src/
│   │   └── index.ts      # Function definitions
│   ├── package.json
│   └── tsconfig.json
├── dist/                  # Built frontend (generated)
├── firebase.json          # Firebase configuration
├── .firebaserc           # Firebase project mapping
├── firestore.rules       # Firestore security rules
├── storage.rules         # Storage security rules
└── firestore.indexes.json # Firestore indexes
```

## Environment Setup

### 1. Update `.firebaserc`

Edit `.firebaserc` and replace `your-firebase-project-id` with your actual Firebase project ID:

```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

### 2. Set Cloud Functions Environment Variables

**Using Firebase Functions v2 params (recommended):**

```bash
# Set string parameter (for service account email)
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_EMAIL
# When prompted, enter: your-service-account@your-project.iam.gserviceaccount.com

# Set secret parameter (for private key - sensitive)
firebase functions:secrets:set GOOGLE_SERVICE_ACCOUNT_KEY
# When prompted, paste your full private key including BEGIN/END lines
```

**Note:** The functions code uses `defineString` and `defineSecret` from `firebase-functions/params`. This is the modern approach and replaces the deprecated `functions.config()` API.

### 3. Update Frontend Environment Variables

Create `.env.production` for production builds:

```env
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FUNCTIONS_URL=https://us-central1-meant2grow-dev.cloudfunctions.net
```

**Note:** The frontend code already uses `VITE_FUNCTIONS_URL` with fallbacks. Update this value with your actual project ID after deployment.

## Build and Deploy

### Build Functions

```bash
cd functions
npm install
npm run build
cd ..
```

### Build Frontend

```bash
npm run build
```

### Deploy Everything

```bash
firebase deploy
```

### Deploy Individual Services

```bash
# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only Storage rules
firebase deploy --only storage:rules
```

## Local Development

### Run Firebase Emulators

```bash
# Start all emulators
firebase emulators:start

# Start specific emulators
firebase emulators:start --only hosting,functions,firestore
```

### Update Frontend to Use Emulator URLs

For local development, update your `.env.local`:

```env
VITE_FUNCTIONS_URL=http://localhost:5001/your-project-id/us-central1
```

## Cloud Functions URLs

After deployment, your functions will be available at:

- **Auth Function**: `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/authGoogle`
- **Meet Function**: `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/createMeetLink`

Update `VITE_FUNCTIONS_URL` in your production environment variables.

## Custom Domain Setup

1. Go to Firebase Console > Hosting
2. Click "Add custom domain"
3. Follow the verification steps
4. Update your OAuth redirect URIs in Google Cloud Console to include your custom domain

## Monitoring and Logs

### View Function Logs

```bash
firebase functions:log
```

### View Specific Function Logs

```bash
firebase functions:log --only authGoogle
firebase functions:log --only createMeetLink
```

### View in Firebase Console

- Go to Firebase Console > Functions
- Click on a function to view logs and metrics

## Troubleshooting

### Functions Not Deploying

1. Check Node.js version (must be 18):
   ```bash
   node --version
   ```

2. Ensure functions are built:
   ```bash
   cd functions && npm run build
   ```

3. Check Firebase CLI version:
   ```bash
   firebase --version
   ```

### CORS Errors

Cloud Functions automatically handle CORS. If you see CORS errors:
- Check that the function is returning proper CORS headers
- Verify the function URL is correct
- Check browser console for specific error messages

### Environment Variables Not Working

1. Verify secrets are set:
   ```bash
   firebase functions:secrets:access GOOGLE_SERVICE_ACCOUNT_EMAIL
   firebase functions:secrets:access GOOGLE_SERVICE_ACCOUNT_KEY
   ```

2. List all secrets:
   ```bash
   firebase functions:secrets:list
   ```

3. Redeploy functions after changing secrets:
   ```bash
   firebase deploy --only functions
   ```

4. **Important:** Secrets must be referenced in function options. Check `functions/src/index.ts` to ensure secrets are included in the function configuration.

## Cost Considerations

- **Firebase Hosting**: Free tier includes 10GB storage and 360MB/day transfer
- **Cloud Functions**: Free tier includes 2 million invocations/month
- **Firestore**: Free tier includes 1GB storage and 50K reads/day
- **Cloud Storage**: Free tier includes 5GB storage

Monitor usage in Firebase Console > Usage and billing.

## Security Checklist

- [ ] Firestore security rules deployed
- [ ] Storage security rules deployed
- [ ] Service account keys stored securely (not in code)
- [ ] Environment variables set correctly
- [ ] OAuth redirect URIs configured
- [ ] CORS properly configured
- [ ] Functions have proper error handling
- [ ] Rate limiting considered (if needed)

## Next Steps

1. Set up CI/CD pipeline (GitHub Actions, etc.)
2. Configure custom domain
3. Set up monitoring and alerts
4. Implement proper authentication tokens (JWT)
5. Add error tracking (Sentry, etc.)
6. Set up automated backups

