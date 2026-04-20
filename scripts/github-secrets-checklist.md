# GitHub Secrets Setup Checklist

Use this checklist to ensure all required secrets are configured in GitHub.

## Firebase Authentication Secrets (2)

- [ ] `FIREBASE_TOKEN_SANDBOX` - Firebase CI token for sandbox project
- [ ] `FIREBASE_TOKEN_PRODUCTION` - Firebase CI token for production project

## Sandbox Environment Variables (14)

- [ ] `SANDBOX_GOOGLE_CLIENT_ID` - Google OAuth Client ID
- [ ] `SANDBOX_FIREBASE_API_KEY` - Firebase API Key
- [ ] `SANDBOX_FIREBASE_AUTH_DOMAIN` - Firebase Auth Domain (e.g., `meant2grow-dev.firebaseapp.com`)
- [ ] `SANDBOX_FIREBASE_PROJECT_ID` - Firebase Project ID (e.g., `meant2grow-dev`)
- [ ] `SANDBOX_FIREBASE_STORAGE_BUCKET` - Firebase Storage Bucket (e.g., `meant2grow-dev.appspot.com`)
- [ ] `SANDBOX_FIREBASE_MESSAGING_SENDER_ID` - Firebase Messaging Sender ID
- [ ] `SANDBOX_FIREBASE_APP_ID` - Firebase App ID
- [ ] `SANDBOX_FIREBASE_VAPID_KEY` - Firebase VAPID Key (for push notifications)
- [ ] `SANDBOX_APP_URL` - Application URL (e.g., `https://sandbox.meant2grow.com`)
- [ ] `SANDBOX_MAILERSEND_API_TOKEN` - MailerSend API Token
- [ ] `SANDBOX_MAILERSEND_FROM_EMAIL` - From email address (e.g., `noreply@meant2grow.com`) - must be verified in MailerSend
- [ ] `SANDBOX_MAILERSEND_REPLY_TO_EMAIL` - Reply-to email address (e.g., `support@meant2grow.com`)
- [ ] `SANDBOX_GIPHY_API_KEY` - GIPHY API Key

## Production Environment Variables (14)

- [ ] `PROD_GOOGLE_CLIENT_ID` - Google OAuth Client ID
- [ ] `PROD_FIREBASE_API_KEY` - Firebase API Key
- [ ] `PROD_FIREBASE_AUTH_DOMAIN` - Firebase Auth Domain (e.g., `meant2grow-prod.firebaseapp.com`)
- [ ] `PROD_FIREBASE_PROJECT_ID` - Firebase Project ID (e.g., `meant2grow-prod`)
- [ ] `PROD_FIREBASE_STORAGE_BUCKET` - Firebase Storage Bucket (e.g., `meant2grow-prod.appspot.com`)
- [ ] `PROD_FIREBASE_MESSAGING_SENDER_ID` - Firebase Messaging Sender ID
- [ ] `PROD_FIREBASE_APP_ID` - Firebase App ID
- [ ] `PROD_FIREBASE_VAPID_KEY` - Firebase VAPID Key (for push notifications)
- [ ] `PROD_APP_URL` - Application URL (e.g., `https://meant2grow.com`)
- [ ] `PROD_MAILERSEND_API_TOKEN` - MailerSend API Token
- [ ] `PROD_MAILERSEND_FROM_EMAIL` - From email address (e.g., `noreply@meant2grow.com`) - must be verified in MailerSend
- [ ] `PROD_MAILERSEND_REPLY_TO_EMAIL` - Reply-to email address (e.g., `support@meant2grow.com`)
- [ ] `PROD_GIPHY_API_KEY` - GIPHY API Key

## Total: 30 secrets required

Cloud Functions HTTPS base URLs are not secrets: the build sets `https://us-central1-<Firebase project id>.cloudfunctions.net` from `SANDBOX_FIREBASE_PROJECT_ID` / `PROD_FIREBASE_PROJECT_ID`.

## Quick Setup Instructions

1. **Generate Firebase CI Tokens:**
   ```bash
   # For sandbox
   firebase use sandbox
   firebase login:ci
   # Copy the token → FIREBASE_TOKEN_SANDBOX
   
   # For production
   firebase use production
   firebase login:ci
   # Copy the token → FIREBASE_TOKEN_PRODUCTION
   ```

2. **Navigate to GitHub Secrets:**
   - Go to your repository on GitHub
   - Settings → Secrets and variables → Actions
   - Click "New repository secret" for each secret

3. **Copy Values:**
   - Use values from `.env.sandbox` or `.env.production` files (remove `VITE_` prefix)
   - Or get values from Firebase Console, Google Cloud Console, Mailtrap, etc.

4. **Verify Setup:**
   - Push a commit to `main` branch to test sandbox deployment
   - Or manually trigger production deployment workflow

## Where to Find Values

### Firebase Values
- **Firebase Console** → Project Settings → General → Your apps → Web app
- **Firebase Console** → Project Settings → Cloud Messaging (for VAPID key and Sender ID)

### Google OAuth Client ID
- **Google Cloud Console** → APIs & Services → Credentials → OAuth 2.0 Client ID

### MailerSend Values
- **MailerSend Dashboard** → Settings → API Tokens (https://app.mailersend.com/api-tokens)
- **MailerSend Dashboard** → Domains → Verify your sending domain

### GIPHY API Key
- **GIPHY Developer Portal** → Create App → API Key

## Notes

- Secret names are **case-sensitive** - use exact names as shown
- Secrets cannot be viewed after creation, only updated
- If a secret is missing, the workflow will fail with a clear error message
- MailerSend requires domain verification - ensure your FROM_EMAIL domain is verified in MailerSend dashboard
