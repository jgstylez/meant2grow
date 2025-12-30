# Push Notifications Setup Guide

This guide explains how to set up push notifications for Meant2Grow using Firebase Cloud Messaging (FCM) and Progressive Web App (PWA) technology.

## Overview

Meant2Grow now supports push notifications on mobile devices without requiring a native app. Users can install the web app to their home screen and receive push notifications for:
- New messages
- Meeting reminders
- Match notifications
- Goal completions
- System notifications

## Prerequisites

1. Firebase project with Cloud Messaging enabled
2. Web app registered in Firebase Console
3. HTTPS domain (required for service workers and push notifications)

## Setup Steps

### 1. Generate VAPID Key Pair

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Project Settings** > **Cloud Messaging**
4. Scroll to **Web Push certificates** section
5. Click **Generate key pair**
6. Copy the generated key

### 2. Add VAPID Key to Environment Variables

Add the VAPID key to your `.env.local` file:

```env
VITE_FIREBASE_VAPID_KEY=your_generated_vapid_key_here
```

### 3. Create App Icons

Create two icon files in the `public` folder:

- `icon-192.png` - 192x192 pixels
- `icon-512.png` - 512x512 pixels

**Recommended: Use [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)**

The easiest way is to use the pwa-asset-generator tool:

```bash
# Install globally (optional)
npm install -g pwa-asset-generator

# Generate icons from your logo
npx pwa-asset-generator logo.svg ./public --icon-only --background "#10b981"
```

Or if you have a PNG/JPEG logo:

```bash
npx pwa-asset-generator logo.png ./public --icon-only --background "#10b981" --manifest ./public/manifest.json
```

This will automatically:
- Generate both required icon sizes
- Use your brand color (#10b981) as background
- Update manifest.json with the icon paths

See `public/README_ICONS.md` for detailed instructions and advanced options.

**Manual Creation**: If you prefer to create icons manually, ensure they are:
- PNG format
- Exactly 192x192 and 512x512 pixels
- Square format with your logo centered
- High contrast for visibility on various backgrounds

### 4. Deploy Firebase Functions

The push notification functionality requires a Firestore trigger that sends FCM notifications when notifications are created:

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### 5. Build and Deploy Frontend

```bash
npm run build
firebase deploy --only hosting
```

## How It Works

### Client-Side Flow

1. **User visits app** → Service worker is registered
2. **User logs in** → FCM token is requested and stored in Firestore
3. **Notification permission** → Browser prompts user (if not already granted)
4. **Token stored** → FCM token is saved to `users/{userId}/fcmToken` in Firestore

### Server-Side Flow

1. **Notification created** → Any code that creates a notification (chat messages, matches, meetings, etc.)
2. **Firestore trigger** → `onNotificationCreated` trigger fires automatically
3. **FCM message sent** → Function retrieves user's FCM token and sends push notification
4. **User receives notification** → Even if app is closed, user sees native push notification

### Foreground Notifications

When the app is open and a notification arrives:
- The `onMessage` handler receives the notification
- A browser notification is shown (if permission granted)
- User can click to navigate to the relevant page

### Background Notifications

When the app is closed:
- Service worker receives the notification
- Native push notification is displayed
- User can click to open the app

## Testing

### 1. Test Service Worker Registration

1. Open browser DevTools
2. Go to **Application** > **Service Workers**
3. Verify `firebase-messaging-sw.js` is registered

### 2. Test FCM Token

1. Open browser DevTools Console
2. Log in to the app
3. Check console for FCM token (should be logged)
4. Verify token is saved in Firestore under `users/{userId}/fcmToken`

### 3. Test Push Notification

1. Send a message to another user (or create a match/meeting)
2. Verify notification is created in Firestore
3. Check Firebase Functions logs for FCM send confirmation
4. Verify push notification appears on device

### 4. Test PWA Installation

1. On mobile device, visit your app
2. Browser should show "Add to Home Screen" prompt
3. After installation, app should open in standalone mode
4. Verify push notifications still work

## Troubleshooting

### Notifications Not Appearing

1. **Check notification permission**: Ensure user granted permission
2. **Check FCM token**: Verify token exists in Firestore
3. **Check Functions logs**: Look for errors in Firebase Functions logs
4. **Check service worker**: Ensure service worker is registered and active

### Service Worker Not Registering

1. **Check HTTPS**: Service workers require HTTPS (or localhost)
2. **Check file location**: `firebase-messaging-sw.js` must be in root of `public` folder
3. **Check build**: Ensure service worker is copied to `dist` folder during build

### FCM Token Not Generated

1. **Check VAPID key**: Ensure VAPID key is set in environment variables
2. **Check Firebase config**: Verify all Firebase config values are correct
3. **Check browser support**: Ensure browser supports FCM (Chrome, Edge, Firefox, Safari 16.4+)

### Invalid Token Errors

If you see "invalid-registration-token" errors:
- The token may have expired
- The function automatically removes invalid tokens
- User needs to log in again to generate a new token

## Browser Support

- ✅ **Chrome/Edge** (Android & Desktop): Full support
- ✅ **Firefox** (Android & Desktop): Full support
- ✅ **Safari** (iOS 16.4+): Full support (requires user interaction for permission)
- ✅ **Safari** (macOS): Full support
- ❌ **Safari** (iOS < 16.4): Not supported

## Security Considerations

1. **VAPID Key**: Keep your VAPID key secure (don't commit to git)
2. **Token Storage**: FCM tokens are stored in Firestore with proper security rules
3. **Permission**: Users must explicitly grant notification permission
4. **HTTPS**: Push notifications require HTTPS (enforced by browsers)

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Notifications Guide](https://web.dev/push-notifications-overview/)
- [PWA Best Practices](https://web.dev/pwa-checklist/)

