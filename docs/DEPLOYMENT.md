# Deployment Guide

This guide covers the current Firebase deployment workflow for sandbox and production.

## Deployment Targets

- Sandbox project: `meant2grow-dev`
- Production project: `meant2grow-prod`
- Firebase aliases are defined in `.firebaserc` (`sandbox`, `production`)

## Runtime And Tooling Requirements

- Node.js 20+ for local/CI workflows
- Firebase Functions runtime: Node 22 (`firebase.json`, `functions/package.json`)
- Firebase CLI installed and authenticated:
  - `npm install -g firebase-tools`
  - `firebase login`

## Environment Setup

### 1) Configure Firebase project aliases

```bash
cp .firebaserc.example .firebaserc
```

Verify that `.firebaserc` maps:

- `sandbox` -> `meant2grow-dev`
- `production` -> `meant2grow-prod`

### 2) Create environment files

```bash
cp env.local.example .env.local
cp .env.sandbox.example .env.sandbox
cp .env.production.example .env.production
```

Fill each file with the correct environment values before deployment.

## Recommended Deployment Commands

Use the npm scripts from `package.json` to ensure build + deploy steps stay consistent.

### Sandbox

```bash
npm run firebase:deploy:sandbox
```

### Production

```bash
npm run firebase:deploy:production
```

### Service-Specific Deployments

```bash
# Hosting only
npm run firebase:deploy:hosting

# Functions only
npm run firebase:deploy:functions

# Single function (video call token endpoint)
npm run firebase:deploy:videoCallSession

# Firestore indexes
npm run firebase:deploy:indexes
```

## Manual Deployment (Fallback)

### Sandbox

```bash
firebase use sandbox
npm run build:sandbox
firebase deploy
```

### Production

```bash
firebase use production
npm run build:production
firebase deploy
```

## Functions Secrets

Set Firebase Functions secrets per environment with `firebase functions:secrets:set` after selecting the project alias.

Commonly used secrets include:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_KEY`
- `VIDEO_SDK_SECRET`
- `MAILERSEND_API_TOKEN` (or Mailtrap values when explicitly using Mailtrap mode)
- `MAILERSEND_FROM_EMAIL`
- `MAILERSEND_REPLY_TO_EMAIL`
- `VITE_APP_URL`

The functions code supports both MailerSend and Mailtrap providers via environment-driven configuration.

## CI Notes

Current CI (`.github/workflows/ci.yml`) runs:

- root install (`npm ci`)
- functions install (`cd functions && npm ci`)
- `npm run lint`
- `npm run build`
- `cd functions && npm run build`

If builds pass in CI but deployment fails, validate Firebase permissions, secrets, and active project alias.

## Troubleshooting

### Build or Type Errors

1. Confirm Node version: `node --version`
2. Reinstall dependencies:
   - `npm ci`
   - `cd functions && npm ci && cd ..`
3. Verify required env values are present

### Deploy Failures

1. Verify login: `firebase login`
2. Verify active alias: `firebase use`
3. Verify target project services (Functions, Hosting, Firestore) are enabled
4. Check Firebase Console deployment logs

### Functions-Specific Failures

1. Build functions locally: `cd functions && npm run build`
2. Verify required secrets for the function path
3. Confirm billing/quota status in GCP/Firebase project
