// Firebase Cloud Messaging Service Worker
// This file must be in the public root directory and named exactly 'firebase-messaging-sw.js'

importScripts('https://www.gstatic.com/firebasejs/12.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.6.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// Note: These values will be replaced at build time or injected via environment variables
const firebaseConfig = {
  apiKey: '{{VITE_FIREBASE_API_KEY}}',
  authDomain: '{{VITE_FIREBASE_AUTH_DOMAIN}}',
  projectId: '{{VITE_FIREBASE_PROJECT_ID}}',
  storageBucket: '{{VITE_FIREBASE_STORAGE_BUCKET}}',
  messagingSenderId: '{{VITE_FIREBASE_MESSAGING_SENDER_ID}}',
  appId: '{{VITE_FIREBASE_APP_ID}}'
};

firebase.initializeApp(firebaseConfig);

// Service worker activation - claim clients immediately (required for iOS)
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages
const messaging = firebase.messaging();

// Handle background messages (works for both Android and iOS)
messaging.onBackgroundMessage((payload) => {
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

