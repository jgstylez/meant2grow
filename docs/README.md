# Meant2Grow Documentation Index

This file is the starting point for current project documentation.

## Current Core Docs

- `../README.md`: Project overview, local development, tests (`npm test`), and key scripts.
- `DEPLOYMENT.md`: Firebase-first deployment workflow for sandbox and production.
- `SETUP_ENV.md`: Environment file setup for local, sandbox, and production.
- `CI_CD_SETUP.md`: GitHub Actions and deployment automation setup.
- `FLOWGLAD_INTEGRATION_GUIDE.md`: Flowglad billing integration details.
- `FIRESTORE_INDEXES.md`: Firestore index requirements and deployment.
- `FIRESTORE_ACCESS.md`: Firestore access patterns and usage notes.
- `PUSH_NOTIFICATIONS_SETUP.md`: PWA service worker, FCM (VAPID), install → permission → token flow, and verification.

## Runbooks / Operational Guides

- `SANDBOX_DEPLOY_CHECKLIST.md`
- `PRE_DEPLOYMENT_CHECKLIST.md`
- `PRODUCTION_APPROVAL_SETUP.md`
- `QUICK_APPROVAL_REFERENCE.md`
- `GOOGLE_OAUTH_VERIFICATION_FIX.md`
- `FIX_REDIRECT_URI_MISMATCH.md`
- `FIX_AUTHDOMAIN_CUSTOM_DOMAIN.md`
- `FIX_CONTINUE_URI_ERROR.md`
- `FIX_SERVICE_ACCOUNT_PERMISSIONS.md`

## Historical Reviews And Status Snapshots

These files are retained for context and audit history. Prefer the "Current Core Docs" section above for active implementation details.

- `CODEBASE_REVIEW.md`
- `CODEBASE_REVIEW_2025.md`
- `CODEBASE_REVIEW_2026-01-24.md`
- `PRODUCTION_READINESS.md`
- `PRODUCTION_READINESS_REVIEW.md`
- `PRODUCTION_READINESS_REVIEW_2025.md`
- `PRODUCTION_READINESS_ASSESSMENT.md`
- `CURRENT_STATUS.md`
- `CURRENT_STATUS_SUMMARY.md`
- `COMPREHENSIVE_STATUS_REPORT.md`
- `IMPLEMENTATION_SUMMARY.md`
- `IMPLEMENTATION_SUMMARY_2026-01-24.md`
- `REFACTORING_PROGRESS_2026-01-24.md`
- `SESSION_SUMMARY_2025-12-22.md`

## Notes On Deployment Models

- Primary deployment in this repository is Firebase Hosting + Firebase Functions.
- Vercel deployment docs are retained for teams that run `api/` handlers on Vercel.
- If you are unsure which path to use, start with `DEPLOYMENT.md`.
