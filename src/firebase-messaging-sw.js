// Firebase Cloud Messaging Service Worker
// This file is processed by Vite and uses ES modules with import.meta.env

import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";
import { precacheAndRoute } from "workbox-precaching";

// Precache and route all assets
precacheAndRoute(self.__WB_MANIFEST);

// Initialize Firebase in the service worker
// Environment variables are injected at build time via Vite's define option
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Service worker activation - claim clients immediately (required for iOS)
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle background messages (works for both Android and iOS)
onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: payload.notification?.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.data?.notificationId || 'notification',
    data: {
      url: payload.data?.url || '/',
      chatId: payload.data?.chatId,
      notificationId: payload.data?.notificationId,
      type: payload.data?.type
    },
    requireInteraction: false,
    silent: false,
    // iOS-specific: ensure notifications work in standalone mode
    dir: 'ltr',
    lang: 'en',
    vibrate: [200, 100, 200],
    timestamp: Date.now()
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  
  event.notification.close();

  const data = event.notification.data || {};
  let url = data.url || '/';
  
  // If there's a chatId, navigate to that chat
  if (data.chatId) {
    url = `/chat:${data.chatId}`;
  }
  
  // If there's a notificationId, navigate to notifications
  if (data.notificationId && !data.chatId) {
    url = '/notifications';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
