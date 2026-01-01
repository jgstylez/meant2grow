import { useEffect, useState, useCallback } from 'react';
import { 
  initializeFCM, 
  setupForegroundMessageHandler,
  setupTokenRefreshHandler,
  isNotificationSupported,
  getNotificationPermission,
  removeFCMToken
} from '../services/messaging';
import { getAuth } from 'firebase/auth';
import { getErrorMessage } from '../utils/errors';

interface FCMState {
  isSupported: boolean;
  permission: NotificationPermission;
  token: string | null;
  isInitializing: boolean;
  error: string | null;
}

/**
 * Hook to manage Firebase Cloud Messaging
 */
export function useFCM(userId: string | null) {
  const [state, setState] = useState<FCMState>({
    isSupported: isNotificationSupported(),
    permission: getNotificationPermission(),
    token: null,
    isInitializing: false,
    error: null,
  });

  // Initialize FCM when user is logged in
  useEffect(() => {
    if (!userId || !state.isSupported) {
      return;
    }

    // Check permission status directly (don't include in dependencies)
    // Permission changes are a result of initialization, not a trigger for it
    const currentPermission = getNotificationPermission();
    
    // Only initialize if permission is not denied
    if (currentPermission === 'denied') {
      setState(prev => ({ ...prev, error: 'Notification permission denied' }));
      return;
    }

    // Initialize FCM
    const init = async () => {
      setState(prev => ({ ...prev, isInitializing: true, error: null }));
      
      try {
        const result = await initializeFCM(userId);
        // Update permission after initialization (it may have changed)
        const updatedPermission = getNotificationPermission();
        setState(prev => ({
          ...prev,
          token: result?.token || null,
          isInitializing: false,
          permission: updatedPermission,
        }));
      } catch (error: unknown) {
        console.error('Error initializing FCM:', error);
        // Update permission even on error (user may have granted/denied during the process)
        const updatedPermission = getNotificationPermission();
        setState(prev => ({
          ...prev,
          isInitializing: false,
          error: getErrorMessage(error) || 'Failed to initialize notifications',
          permission: updatedPermission,
        }));
      }
    };

    init();
  }, [userId, state.isSupported]); // Removed state.permission - it's updated during init, not a trigger

  // Set up token refresh handler
  useEffect(() => {
    if (!userId || !state.isSupported || !state.token) {
      return;
    }

    const cleanup = setupTokenRefreshHandler(userId);
    return cleanup;
  }, [userId, state.isSupported, state.token]);

  // Set up foreground message handler
  useEffect(() => {
    if (!state.isSupported) {
      return;
    }

    const unsubscribe = setupForegroundMessageHandler((payload) => {
      // Handle foreground notifications
      // You can customize this to show in-app notifications
      console.log('Foreground notification received:', payload);
      
      // Show browser notification if permission is granted
      if (getNotificationPermission() === 'granted') {
        const notificationTitle = payload.notification?.title || payload.data?.title || 'New Notification';
        const notificationOptions: NotificationOptions = {
          body: payload.notification?.body || payload.data?.body || '',
          icon: payload.notification?.icon || '/icon-192.png',
          badge: '/icon-192.png',
          tag: payload.data?.notificationId || 'notification',
          data: {
            url: payload.data?.url || '/',
            chatId: payload.data?.chatId,
            notificationId: payload.data?.notificationId,
            type: payload.data?.type,
          },
        };

        // Show notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notificationTitle, notificationOptions);
        }
      }
    });

    return unsubscribe;
  }, [state.isSupported]);

  // Cleanup: remove token on logout
  useEffect(() => {
    return () => {
      if (userId) {
        removeFCMToken(userId).catch(console.error);
      }
    };
  }, [userId]);

  // Request permission manually (for cases where user initially denied)
  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      return false;
    }

    try {
      const result = await initializeFCM(userId || '');
      setState(prev => ({
        ...prev,
        token: result?.token || null,
        permission: getNotificationPermission(),
        error: null,
      }));
      return result !== null && result.token !== null;
    } catch (error: unknown) {
      setState(prev => ({
        ...prev,
        error: getErrorMessage(error) || 'Failed to request permission',
        permission: getNotificationPermission(),
      }));
      return false;
    }
  }, [userId, state.isSupported]);

  return {
    ...state,
    requestPermission,
  };
}

