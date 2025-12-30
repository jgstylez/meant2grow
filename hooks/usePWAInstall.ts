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
/**
 * Comprehensive mobile device detection
 * Strictly excludes desktop browsers (including touch-enabled laptops)
 * Only shows banner on actual mobile devices (phones/tablets)
 */
function detectMobileDevice(): { isMobile: boolean; platform: 'ios' | 'android' | 'desktop' | 'unknown' } {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const ua = userAgent.toLowerCase();
  
  // Collect all detection data for debugging
  const detectionData: any = {
    fullUserAgent: userAgent,
    userAgentShort: userAgent.substring(0, 100),
  };
  
  // Check for iOS - multiple patterns to catch all variations
  // iOS Safari, Chrome on iOS, Firefox on iOS, etc.
  const isIOS = 
    /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream ||
    (window.navigator as any).standalone === true ||
    /iphone|ipad|ipod/.test(ua) ||
    // Safari on iOS 13+ sometimes reports as Mac, but has touch
    (ua.includes('macintosh') && 'ontouchend' in document && window.innerWidth < 1024);
  
  detectionData.isIOS = isIOS;
  
  // Check for Android - be comprehensive
  // Android Chrome, Samsung Internet, Firefox, Edge, etc.
  const isAndroid = 
    /Android/.test(userAgent) || 
    /android/.test(ua) ||
    ua.includes('wv') || // WebView indicator
    ua.includes('samsung') || // Samsung Internet
    ua.includes('mobile'); // Generic mobile indicator
  
  detectionData.isAndroid = isAndroid;
  
  // Additional mobile indicators - check touch FIRST before using it
  const hasTouchScreen = 
    'ontouchstart' in window || 
    navigator.maxTouchPoints > 0 || 
    (navigator as any).msMaxTouchPoints > 0 ||
    'TouchEvent' in window;
  
  detectionData.hasTouchScreen = hasTouchScreen;
  detectionData.maxTouchPoints = navigator.maxTouchPoints;
  
  // Check for desktop browser indicators - exclude these explicitly
  // But be VERY careful not to exclude mobile browsers
  // Mobile browsers often include "mobile" or have touch, so check for those first
  const hasMobileIndicator = ua.includes('mobile') || ua.includes('phone') || hasTouchScreen;
  
  const hasWindowsDesktop = ua.includes('windows') && !ua.includes('phone') && !ua.includes('mobile') && !hasMobileIndicator;
  const hasMacDesktop = ua.includes('macintosh') && 
                       !ua.includes('iphone') && 
                       !ua.includes('ipad') && 
                       !ua.includes('ipod') && 
                       !('ontouchend' in document) &&
                       !hasMobileIndicator;
  const hasLinuxDesktop = ua.includes('linux') && 
                         !ua.includes('android') && 
                         !ua.includes('mobile') && 
                         !hasMobileIndicator;
  const hasX11 = ua.includes('x11') && !hasMobileIndicator;
  
  // Only consider it desktop if we're SURE it's desktop (not mobile)
  // If there's any mobile indicator, don't mark as desktop
  const isDesktopBrowser = !hasMobileIndicator && (hasWindowsDesktop || hasMacDesktop || hasLinuxDesktop || hasX11);
  
  detectionData.desktopChecks = {
    hasWindowsDesktop,
    hasMacDesktop,
    hasLinuxDesktop,
    hasX11,
    isDesktopBrowser,
  };
  
  // Get screen dimensions
  const screenWidth = window.innerWidth || screen.width || (window as any).screen?.width || 0;
  const screenHeight = window.innerHeight || screen.height || (window as any).screen?.height || 0;
  const screenAvailWidth = screen.availWidth || 0;
  const screenAvailHeight = screen.availHeight || 0;
  
  detectionData.screen = {
    width: screenWidth,
    height: screenHeight,
    availWidth: screenAvailWidth,
    availHeight: screenAvailHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
  };
  
  // Mobile screen size check - phones/tablets
  // Modern phones can have larger screens, so be more lenient
  const isPhoneSize = screenWidth <= 768;
  const isTabletSize = screenWidth > 768 && screenWidth <= 1024 && screenHeight <= 1366;
  const isSmallScreen = isPhoneSize || isTabletSize;
  
  detectionData.screenChecks = {
    isPhoneSize,
    isTabletSize,
    isSmallScreen,
  };
  
  // Check for mobile connection (if available)
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  const isMobileConnection = connection?.type === 'cellular';
  const connectionType = connection?.type || 'unknown';
  
  detectionData.connection = {
    available: !!connection,
    type: connectionType,
    isMobileConnection,
  };
  
  // Mobile detection logic:
  // Priority 1: Explicit mobile UA (iOS/Android) - most reliable
  // Priority 2: Touch + small screen (but exclude desktop browsers first)
  // Priority 3: Touch + mobile connection
  
  const isMobileUA = isIOS || isAndroid;
  const isMobileByTouch = hasTouchScreen && isSmallScreen && !isDesktopBrowser;
  const isMobileByConnection = hasTouchScreen && isMobileConnection && !isDesktopBrowser;
  
  // Final decision: mobile if we have mobile UA OR (touch + small screen AND not desktop)
  const isMobile = isMobileUA || isMobileByTouch || isMobileByConnection;
  
  detectionData.mobileChecks = {
    isMobileUA,
    isMobileByTouch,
    isMobileByConnection,
    finalIsMobile: isMobile,
  };
  
  // Determine platform
  let platform: 'ios' | 'android' | 'desktop' | 'unknown' = 'desktop';
  if (isIOS) {
    platform = 'ios';
  } else if (isAndroid) {
    platform = 'android';
  } else if (isMobile) {
    // If detected as mobile but platform unclear
    platform = 'unknown';
  }
  
  detectionData.platform = platform;
  
  // Comprehensive debug logging - always log to help diagnose issues
  console.group('🔍 [Mobile Detection]');
  console.log('User Agent:', userAgent);
  console.log('Detection Result:', {
    isMobile,
    platform,
    isDesktopBrowser,
  });
  console.log('Detailed Checks:', detectionData);
  console.groupEnd();
  
  return { isMobile, platform };
}

export function usePWAInstall(): PWAInstallState & {
  install: () => Promise<void>;
} {
  const [state, setState] = useState<PWAInstallState>(() => {
    // Detect if app is already installed (standalone mode)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    const { isMobile, platform } = detectMobileDevice();

    return {
      isInstalled: isStandalone,
      isInstallable: false,
      platform,
      isMobile,
      canShowPrompt: false,
      promptEvent: null,
    };
  });

  // Update mobile detection on window resize/orientation change
  useEffect(() => {
    const updateMobileDetection = () => {
      const { isMobile, platform } = detectMobileDevice();
      setState(prev => ({
        ...prev,
        isMobile,
        platform: prev.platform === 'unknown' && platform !== 'unknown' ? platform : prev.platform,
      }));
    };

    // Update on resize
    window.addEventListener('resize', updateMobileDetection);
    window.addEventListener('orientationchange', updateMobileDetection);
    
    // Also check after a short delay (in case initial detection missed something)
    const timeoutId = setTimeout(updateMobileDetection, 500);

    return () => {
      window.removeEventListener('resize', updateMobileDetection);
      window.removeEventListener('orientationchange', updateMobileDetection);
      clearTimeout(timeoutId);
    };
  }, []);

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

