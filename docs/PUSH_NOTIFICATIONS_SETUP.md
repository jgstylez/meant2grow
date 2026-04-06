# Push Notifications and PWA Setup

This guide explains how web push works for Meant2Grow (Firebase Cloud Messaging + PWA), what to configure, and how to verify delivery after users install the app to their home screen.

## Overview

- **PWA**: `vite-plugin-pwa` uses **`injectManifest`** with source `src/firebase-messaging-sw.js`. The built file is emitted at **`/firebase-messaging-sw.js`** on the deployed site (not a hand-placed file under `public/`).
- **Registration**: `index.tsx` registers that URL in **production** only (`import.meta.env.PROD`). Vite dev disables the workbox service worker so local dev does not register push (avoids MIME / SW errors).
- **FCM**: After login, `useFCM` → `initializeFCM` requests **notification permission**, obtains a token, and saves it. Cloud Functions read **`users/{userId}.fcmToken`** to send pushes (see `sendFCMPushNotification` in `functions/src/index.ts`). The client also maintains a **`devices`** array on the user document for multi-device tracking (`services/deviceTracking.ts`).

## End-to-end flow (mobile install → push)

1. User opens the **HTTPS** app (required for service workers and push).
2. User **installs** the PWA (Android/Chrome: install prompt; iOS/Safari: Share → Add to Home Screen).
3. User **logs in** (or is already logged in). `useFCM` runs with the Firestore user id used for storage (`fcmStorageUserId` in `App.tsx`).
4. The browser prompts for **notification permission** (if not already granted or denied). User must tap **Allow** for pushes to work.
5. The service worker at `/firebase-messaging-sw.js` is active; `getToken` runs with the **Web Push certificate (VAPID)** key and the active `ServiceWorkerRegistration`.
6. The token is written to Firestore (`fcmToken` + device entry). When a notification is created server-side, the **FCM** path sends the push to that token.
7. **After install**, the browser may fire `appinstalled`; the app listens and **re-initializes FCM** so the token matches the installed app context when relevant. Users should still **open the installed icon** at least once (especially on iOS) and grant permission when prompted.

### iOS (Safari 16.4+)

- Push for web requires **Add to Home Screen** and opening from the **home screen icon** (standalone). In-browser Safari alone does not get the same push behavior.
- Permission often must be requested in **user interaction** context; the app requests it after login via `Notification.requestPermission()`.

### Install banner (Android vs iOS)

On **mobile width** (≤768px) and when the user is **signed in**, `PWAInstallBanner` nudges install. Copy is **platform-specific**:

| Platform | What users see |
|----------|----------------|
| **iPhone / iPad (Safari)** | Steps: **Share** → **Add to Home Screen** → **Add** → open from the home screen and allow notifications. iOS has **no** system “install app” API; the banner cannot open that flow automatically. |
| **Android (Chrome and compatible browsers)** | **Install** / **Install Now** when the browser offers an install prompt; otherwise **⋮** → **Install app** or **Add to Home screen**, then open the installed app and allow notifications. |

Dismiss (✕) hides the banner for the session; Android may show a separate **Install** chip when `beforeinstallprompt` is available.

### Local development

- **`isLocalDevelopment()`** (Vite dev **or** `localhost` / `127.0.0.1`): FCM initialization is **skipped** and `isNotificationSupported()` is **false** so push is not exercised locally. Test on a **deployed** HTTPS host or tunnel with a production build.

## Prerequisites

1. Firebase project with **Cloud Messaging** enabled  
2. Web app registered in Firebase Console  
3. **HTTPS** (or `localhost` for non-push dev)  
4. **Web Push certificates** (VAPID key) in env — see below  

## Configuration

### 1. VAPID key (Web Push certificates)

1. [Firebase Console](https://console.firebase.google.com/) → your project  
2. **Project settings** → **Cloud Messaging** → **Web Push certificates**  
3. **Generate key pair** and copy the key  

### 2. Environment variable

In `.env.local` (and CI/hosting env for builds):

```env
VITE_FIREBASE_VAPID_KEY=your_generated_vapid_key_here
```

Also ensure Firebase web config vars used by Vite (`VITE_FIREBASE_*`) match the same project as this VAPID key.

### 3. Icons

Place **`/icon-192.png`** and **`/icon-512.png`** in `public/` (referenced by `public/manifest.json`). See `public/README_ICONS.md` or use [pwa-asset-generator](https://github.com/onderceylan/pwa-asset-generator).

### 4. Deploy Functions and Hosting

Push sending is implemented in Cloud Functions (e.g. `sendFCMPushNotification` using `users/{userId}.fcmToken`):

```bash
cd functions && npm run build && cd ..
firebase deploy --only functions
npm run build
firebase deploy --only hosting
```

## How it works (reference)

### Client

| Step | Behavior |
|------|----------|
| Install UI | `PWAInstallBanner` shows on mobile for signed-in users: **iOS** = Share → Add to Home Screen; **Android** = install prompt or Chrome menu fallback (see table above). |
| SW | `index.tsx` registers `/firebase-messaging-sw.js` in production; SW precaches assets and handles **background** FCM via `onBackgroundMessage` in `src/firebase-messaging-sw.js`. |
| Login | `useFCM` calls `initializeFCM` → `requestNotificationPermission` → `getToken` → `saveFCMToken`. |
| Install | `window` `appinstalled` triggers a **second** `initializeFCM` pass to refresh registration after PWA install. |
| Foreground | `setupForegroundMessageHandler` shows a `Notification` when the app is open and permission is granted. |

### Server

- Notification creation triggers logic that calls **`sendFCMPushNotification`**, which reads **`fcmToken`** from the user document.  
- Invalid tokens may be removed from `fcmToken` on send errors (see Functions code).  

### Firestore shape

- **`users/{userId}.fcmToken`**: string — **used by Cloud Functions** for sending.  
- **`users/{userId}.devices`**: array of device records (tokens, metadata) — client-managed for multiple devices.  

## Testing

### Automated tests

- Run `npm test` for unit/component tests (including auth-adjacent UI). Push itself is not simulated in CI; validate on a device.

### Manual checks

1. **Service worker** (Chrome DevTools → Application → Service Workers): `firebase-messaging-sw.js` **activated** on your HTTPS origin.  
2. **Permission**: Site settings → Notifications → **Allow**.  
3. **Token**: After login, confirm `fcmToken` on `users/{uid}` in Firestore (and `devices` if populated).  
4. **Send path**: Trigger a real notification (e.g. chat) and watch **Functions logs** for FCM send lines.  
5. **PWA**: Install the app, open from the **home screen icon**, confirm permission and that pushes arrive in **background** and **foreground**.  

## Troubleshooting

| Symptom | Things to check |
|--------|------------------|
| No token | HTTPS, not localhost-only; `VITE_FIREBASE_VAPID_KEY` set in **build** env; SW active; permission not **blocked**. |
| SW missing | Production build deployed; `index.tsx` only registers when `import.meta.env.PROD` is true. |
| Works in browser tab but not installed PWA | iOS: open from **home screen**; ensure iOS **16.4+**; re-check permission after install. |
| `invalid-registration-token` | Token expired or app uninstalled; user logs in again; Functions may clear `fcmToken`. |
| Push never sent | User doc missing `fcmToken`; Functions logs; FCM enabled for project. |

## Security

- Do not commit VAPID or API secrets.  
- Users must **opt in** to notifications (browser permission).  
- Enforce Firestore rules so only the owning user can write their tokens.  

## Related code

- `src/firebase-messaging-sw.js` — workbox precache + background FCM  
- `index.tsx` — SW registration (production)  
- `services/messaging.ts` — permission, token, Firestore save  
- `hooks/useFCM.ts` — lifecycle + `appinstalled`  
- `functions/src/index.ts` — `sendFCMPushNotification`  

## Additional resources

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)  
- [Web push overview](https://web.dev/push-notifications-overview/)  
- [PWA checklist](https://web.dev/pwa-checklist/)  
