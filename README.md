# Meant2Grow

Meant2Grow is a React + Firebase mentorship platform with role-based experiences, real-time Firestore data, communication tools, billing integration, and cloud function backends.

## Tech Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, PWA support
- Backend: Firebase Cloud Functions (Node 22) and optional Vercel API routes in `api/`
- Data/Auth: Firestore, Firebase Auth, Firebase Storage
- Integrations: Flowglad, Google OAuth, Google APIs, Resend (transactional email), MailerSend (fallback)

## Repository Structure

- `components/`, `hooks/`, `services/`, `utils/`: Main frontend code
- `functions/`: Firebase Cloud Functions codebase
- `api/`: Vercel-style API handlers (optional deployment model)
- `scripts/`: Maintenance and migration scripts
- `docs/`: Operational guides, setup docs, and historical reviews

## Prerequisites

- Node.js 20+ recommended for local/CI workflows
- npm
- Firebase CLI (`npm install -g firebase-tools`) for deploy and emulator workflows

Note: `functions/` targets Node 22 at runtime (`firebase.json` + `functions/package.json`).

## Local Development

1. Install dependencies:
   - `npm install`
   - `cd functions && npm install && cd ..`
2. Configure local env:
   - `cp env.local.example .env.local`
   - Fill required values in `.env.local`
3. Start the app:
   - `npm run dev`

The Vite dev server proxies `/api/functions/*` to your configured Cloud Functions target (`VITE_FUNCTIONS_URL`).

## Build And Quality Checks

- `npm run lint`: Lint frontend and shared TS files
- `npm run lint:fix`: Apply safe lint auto-fixes
- `npm test`: Run Vitest unit and component tests once
- `npm run test:watch`: Vitest in watch mode
- `npm run build`: Production build
- `npm run build:sandbox`: Sandbox build path (uses `NODE_ENV=sandbox`)
- `npm run build:production`: Production build path
- `cd functions && npm run build`: Build Cloud Functions bundle

CI runs install, lint, frontend build, and functions build on pushes and pull requests (`.github/workflows/ci.yml`).

## Deployment

Primary deployment model is Firebase Hosting + Firebase Functions:

- Sandbox: `npm run firebase:deploy:sandbox`
- Production: `npm run firebase:deploy:production`
- Functions only: `npm run firebase:deploy:functions`
- Hosting only: `npm run firebase:deploy:hosting`

Project aliases are configured in `.firebaserc` (`sandbox` and `production`).

## PWA and push notifications

The web app is installable (`public/manifest.json`, `vite-plugin-pwa` with `src/firebase-messaging-sw.js`). **Push** uses Firebase Cloud Messaging with a **VAPID** key, notification **permission**, and a production **service worker**. Local Vite dev intentionally skips SW/FCM; test on a deployed HTTPS host. See **`docs/PUSH_NOTIFICATIONS_SETUP.md`**.

## Documentation

Start here:

- `docs/README.md` (documentation index)
- `docs/SETUP_ENV.md` (environment setup)
- `docs/DEPLOYMENT.md` (deployment guide)
- `docs/CI_CD_SETUP.md` (CI/CD setup)
- `docs/PUSH_NOTIFICATIONS_SETUP.md` (PWA + FCM)

## Security Note

Do not commit real credentials or secret keys. Keep local `.env*` and service account secrets in secure secret managers.
