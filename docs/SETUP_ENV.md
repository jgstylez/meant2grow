# Environment Setup

Use this guide with `env.local.example`, `.env.sandbox.example`, and `.env.production.example`.

## 1) Configure Firebase aliases

```bash
cp .firebaserc.example .firebaserc
```

Default alias mapping in this repo:

- `default`: `meant2grow-dev`
- `sandbox`: `meant2grow-dev`
- `production`: `meant2grow-prod`

## 2) Create local and deployment env files

```bash
cp env.local.example .env.local
cp .env.sandbox.example .env.sandbox
cp .env.production.example .env.production
```

## 3) Required client-side environment variables

These values must be present (with environment-specific values):

- `VITE_GOOGLE_CLIENT_ID`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FUNCTIONS_URL` (or rely on project-id derived default)
- `VITE_APP_URL`

Optional but commonly used:

- `VITE_FIREBASE_VAPID_KEY`
- `VITE_GIPHY_API_KEY`
- `VITE_MAILERSEND_API_TOKEN`
- `VITE_MAILERSEND_FROM_EMAIL`
- `VITE_MAILERSEND_REPLY_TO_EMAIL`

## 4) Billing and Flowglad variables

When using Flowglad features, configure:

- `FLOWGLAD_SECRET_KEY`
- `FLOWGLAD_WEBHOOK_SECRET`
- `FLOWGLAD_PRICE_STARTER_MONTHLY`
- `FLOWGLAD_PRICE_STARTER_YEARLY`
- `FLOWGLAD_PRICE_PRO_MONTHLY`
- `FLOWGLAD_PRICE_PRO_YEARLY`
- `FLOWGLAD_PRICE_BUSINESS_MONTHLY`
- `FLOWGLAD_PRICE_BUSINESS_YEARLY`

## 5) Firebase Functions environment/secrets

Functions use Firebase-managed env/secrets, including:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_KEY`
- `VIDEO_SDK_SECRET`
- `MAILERSEND_API_TOKEN` (or Mailtrap values when explicitly configured)
- `MAILERSEND_FROM_EMAIL`
- `MAILERSEND_REPLY_TO_EMAIL`
- `VITE_APP_URL`

Set them with:

```bash
firebase use sandbox   # or production
firebase functions:secrets:set <SECRET_NAME>
```

## 6) Verify environment configuration

1. Run `npm run dev` and confirm app loads.
2. Verify auth and Firestore requests use the expected project.
3. If local function calls fail, verify `VITE_FUNCTIONS_URL` and proxy behavior in `vite.config.ts`.

## Common Issues

- Wrong Firebase project: check `VITE_FIREBASE_PROJECT_ID` and current `firebase use`.
- Missing OAuth config: verify `VITE_GOOGLE_CLIENT_ID`.
- Missing function secrets: check Firebase Functions logs and set required secrets.
- Env changes not reflected: restart the dev server after updating env files.

## Related Docs

- `DEPLOYMENT.md`
- `CI_CD_SETUP.md`
- `FLOWGLAD_INTEGRATION_GUIDE.md`

