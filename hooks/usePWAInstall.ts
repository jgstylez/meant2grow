import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallState {
  isInstalled: boolean;
  isInstallable: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  isMobile: boolean;
  canShowPrompt: boolean;
  promptEvent: BeforeInstallPromptEvent | null;
}

/**
 * Hook to detect PWA installation state and handle installation prompts
 */
export function usePWAInstall(): PWAInstallState & {
  install: () => Promise<void>;
} {
  const [state, setState] = useState<PWAInstallState>(() => {
    // Detect if app is already installed (standalone mode)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    // Detect platform
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isAndroid = /Android/.test(userAgent);
    const isMobile = isIOS || isAndroid;

    let platform: 'ios' | 'android' | 'desktop' | 'unknown' = 'unknown';
    if (isIOS) platform = 'ios';
    else if (isAndroid) platform = 'android';
    else platform = 'desktop';

    return {
      isInstalled: isStandalone,
      isInstallable: false,
      platform,
      isMobile,
      canShowPrompt: false,
      promptEvent: null,
    };
  });

  // Handle beforeinstallprompt event (Android Chrome/Edge)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser install prompt
      e.preventDefault();
      
      const promptEvent = e as BeforeInstallPromptEvent;
      
      setState(prev => ({
        ...prev,
        isInstallable: true,
        canShowPrompt: true,
        promptEvent: promptEvent,
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Detect standalone mode changes (user might install while using app)
  useEffect(() => {
    const checkStandalone = () => {
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');

      setState(prev => ({
        ...prev,
        isInstalled: isStandalone,
        // If installed, can't show prompt anymore
        canShowPrompt: prev.canShowPrompt && !isStandalone,
      }));
    };

    // Check on mount
    checkStandalone();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => checkStandalone();
    
    // Some browsers support addEventListener, others use addListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      (mediaQuery as any).addListener(handleChange);
    }

    // Also check periodically (for iOS which doesn't always fire events)
    const interval = setInterval(checkStandalone, 1000);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        (mediaQuery as any).removeListener(handleChange);
      }
      clearInterval(interval);
    };
  }, []);

  // Handle app installed event (optional, for analytics)
  useEffect(() => {
    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        canShowPrompt: false,
        promptEvent: null,
      }));
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Install function - triggers native prompt for Android
  const install = useCallback(async () => {
    if (state.promptEvent) {
      // Android: Show native install prompt
      await state.promptEvent.prompt();
      const choiceResult = await state.promptEvent.userChoice;
      
      setState(prev => ({
        ...prev,
        isInstallable: choiceResult.outcome === 'dismissed',
        canShowPrompt: choiceResult.outcome === 'dismissed',
        promptEvent: choiceResult.outcome === 'accepted' ? null : prev.promptEvent,
      }));
    } else if (state.platform === 'ios') {
      // iOS: Can't programmatically trigger, user must use Share menu
      // This function won't do anything for iOS, but we can show instructions
      console.log('iOS installation requires manual steps via Share menu');
    }
  }, [state.promptEvent, state.platform]);

  return {
    ...state,
    install,
  };
}

