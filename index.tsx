import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Register service worker for PWA and push notifications (required for iOS)
if ('serviceWorker' in navigator) {
  // Register immediately, don't wait for load event (better for production)
  const registerSW = async () => {
    try {
      // First, verify the service worker file is accessible
      const swUrl = '/firebase-messaging-sw.js';
      try {
        const response = await fetch(swUrl, { method: 'HEAD' });
        if (!response.ok) {
          console.warn('[SW] Service worker file not found or not accessible:', swUrl);
          console.warn('[SW] This may prevent PWA installation banner from showing');
        }
      } catch (fetchError) {
        console.warn('[SW] Could not verify service worker file:', fetchError);
      }

      // Try to register the service worker
      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: '/',
      });
      
      console.log('[SW] Service Worker registered successfully:', registration.scope);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New service worker available');
            }
          });
        }
      });
    } catch (error: any) {
      console.error('[SW] Service Worker registration failed:', error);
      // Log more details for debugging
      console.error('[SW] Error details:', {
        message: error.message,
        stack: error.stack,
        url: window.location.href,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        swUrl: '/firebase-messaging-sw.js',
      });
    }
  };

  // Register immediately if DOM is ready, otherwise wait for load
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