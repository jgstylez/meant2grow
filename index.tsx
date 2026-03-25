import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { getErrorMessage } from './utils/errors';

// Register service worker for PWA and push notifications (required for iOS).
// In `vite` dev, `/firebase-messaging-sw.js` is not emitted at the root (SPA fallback serves
// index.html as text/html), which causes SecurityError / MIME type failures. Production and
// `vite preview` serve the file built by vite-plugin-pwa.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  let swRegistration: ServiceWorkerRegistration | null = null;

  const registerSW = async () => {
    try {
      const swUrl = '/firebase-messaging-sw.js';
      try {
        const response = await fetch(swUrl, { method: 'HEAD' });
        if (!response.ok) {
          console.warn('[SW] Service worker file not found or not accessible:', swUrl);
        }
      } catch (fetchError) {
        console.warn('[SW] Could not verify service worker file:', fetchError);
      }

      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: '/',
      });
      swRegistration = registration;

      // When a new SW is installed, skipWaiting so it activates immediately (fixes stale cache on iPhone)
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.skipWaiting();
            }
          });
        }
      });

      // When controller changes (new SW took over), reload to get fresh content
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    } catch (error: unknown) {
      console.error('[SW] Service Worker registration failed:', error);
      const errorMessage = getErrorMessage(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('[SW] Error details:', {
        message: errorMessage,
        stack: errorStack,
        url: window.location.href,
        swUrl: '/firebase-messaging-sw.js',
      });
    }
  };

  // Check for SW updates when app becomes visible (e.g. user opens PWA from home screen)
  const checkForUpdates = () => {
    swRegistration?.update();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdates();
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) checkForUpdates();
  });

  if (document.readyState === 'loading') {
    window.addEventListener('load', registerSW);
  } else {
    registerSW();
  }
}

// App initialization - no logging needed

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Root element found - no logging needed

import ErrorBoundary from './components/ErrorBoundary';

const root = ReactDOM.createRoot(rootElement);

// Rendering app - no logging needed

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// App render initiated - no logging needed