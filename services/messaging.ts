import { messaging, getToken, onMessage } from './firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { getAuth } from 'firebase/auth';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

/**
 * Ensure service worker is registered before getting FCM token
 * Required for iOS push notifications
 */
async function ensureServiceWorkerRegistered(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    // Check if service worker is already registered
    const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (registration && registration.active) {
      return true;
    }

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    return true;
  } catch (error) {
    console.warn('Service worker not ready:', error);
    return false;
  }
}

/**
 * Request notification permission and get FCM token
 * Handles both iOS and Android requirements
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (!messaging) {
    console.warn('Firebase Cloud Messaging is not available');
    return null;
  }

  // Ensure service worker is registered (critical for iOS)
  const swReady = await ensureServiceWorkerRegistered();
  if (!swReady) {
    console.warn('Service worker not ready, cannot get FCM token');
    return null;
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    // Get FCM token
    // VAPID key is required for web push notifications (both iOS and Android)
    const tokenOptions: { vapidKey?: string; serviceWorkerRegistration?: ServiceWorkerRegistration } = {};
    
    if (VAPID_KEY) {
      tokenOptions.vapidKey = VAPID_KEY;
    }

    // Get service worker registration for iOS compatibility
    const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (registration) {
      tokenOptions.serviceWorkerRegistration = registration;
    }

    const token = await getToken(messaging, tokenOptions);

    if (!token) {
      console.warn('No FCM token available');
      return null;
    }

    return token;
  } catch (error: any) {
    console.error('Error getting FCM token:', error);
    
    // iOS-specific error handling
    if (error.code === 'messaging/unsupported-browser') {
      console.warn('Browser does not support FCM. iOS requires Safari 16.4+ and app must be installed as PWA.');
    }
    
    return null;
  }
}

/**
 * Save FCM token to Firestore for the current user
 */
export async function saveFCMToken(userId: string, token: string): Promise<void> {
  try {
    const tokenRef = doc(db, 'users', userId);
    const userDoc = await getDoc(tokenRef);
    
    if (userDoc.exists()) {
      // Update existing user document with FCM token
      await updateDoc(tokenRef, {
        fcmToken: token,
        fcmTokenUpdatedAt: new Date().toISOString(),
      });
    } else {
      // Create user document with FCM token (shouldn't happen, but handle gracefully)
      await setDoc(tokenRef, {
        fcmToken: token,
        fcmTokenUpdatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error saving FCM token:', error);
    throw error;
  }
}

/**
 * Remove FCM token from Firestore
 */
export async function removeFCMToken(userId: string): Promise<void> {
  try {
    const tokenRef = doc(db, 'users', userId);
    await updateDoc(tokenRef, {
      fcmToken: null,
      fcmTokenUpdatedAt: null,
    });
  } catch (error) {
    console.error('Error removing FCM token:', error);
    throw error;
  }
}

/**
 * Set up token refresh listener
 * FCM tokens can be refreshed automatically, we need to update Firestore when this happens
 */
export function setupTokenRefreshHandler(userId: string): () => void {
  if (!messaging) {
    return () => {};
  }

  // Note: onTokenRefresh is deprecated in newer Firebase versions
  // Instead, we'll check for token changes periodically and on app focus
  const handleTokenRefresh = async () => {
    try {
      const newToken = await requestNotificationPermission();
      if (newToken) {
        await saveFCMToken(userId, newToken);
        console.log('FCM token refreshed and saved');
      }
    } catch (error) {
      console.error('Error refreshing FCM token:', error);
    }
  };

  // Listen for visibility changes (app comes to foreground)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      handleTokenRefresh();
    }
  };

  // Listen for focus events
  const handleFocus = () => {
    handleTokenRefresh();
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleFocus);

  // Also check periodically (every 30 minutes)
  const intervalId = setInterval(handleTokenRefresh, 30 * 60 * 1000);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleFocus);
    clearInterval(intervalId);
  };
}

/**
 * Get FCM token for current user and save it
 */
export async function initializeFCM(userId: string): Promise<string | null> {
  if (!messaging) {
    return null;
  }

  try {
    const token = await requestNotificationPermission();
    
    if (token) {
      await saveFCMToken(userId, token);
      return token;
    }
    
    return null;
  } catch (error) {
    console.error('Error initializing FCM:', error);
    return null;
  }
}

/**
 * Set up foreground message handler
 * Returns a cleanup function
 */
export function setupForegroundMessageHandler(
  callback: (payload: any) => void
): () => void {
  if (!messaging) {
    return () => {};
  }

  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('Message received in foreground:', payload);
    callback(payload);
  });

  return unsubscribe;
}

/**
 * Check if notifications are supported
 */
export function isNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    messaging !== null
  );
}

/**
 * Check current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

