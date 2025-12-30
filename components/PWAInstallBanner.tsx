import React, { useState, useEffect, useRef } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

// iOS Share Icon - matches the native iOS Share icon (square with upward arrow)
// This is the exact shape: a rounded square with an arrow pointing up from the center top
const IOSShareIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Rounded square/rectangle at bottom */}
    <rect x="4" y="10" width="16" height="12" rx="1.5" ry="1.5" />
    {/* Upward arrow emerging from top center */}
    <path d="M12 10V4" />
    <path d="M8 6l4-4 4 4" />
  </svg>
);

interface PWAInstallBannerProps {
  currentUser: { id: string } | null;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ currentUser }) => {
  const { isInstalled, platform, canShowPrompt, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Check screen size using media query (more reliable than user agent)
  // Show on screens 768px and below (mobile/tablet)
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileScreen(window.innerWidth <= 768);
    };

    // Check immediately
    checkScreenSize();

    // Listen for resize events
    window.addEventListener('resize', checkScreenSize);
    
    // Also listen to media query changes
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobileScreen(e.matches);
    };
    
    // Set initial state
    setIsMobileScreen(mediaQuery.matches);
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      (mediaQuery as any).addListener(handleMediaChange);
    }

    return () => {
      window.removeEventListener('resize', checkScreenSize);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        (mediaQuery as any).removeListener(handleMediaChange);
      }
    };
  }, []);

  // Update CSS variable for banner height to adjust main content padding
  useEffect(() => {
    if (!currentUser || isInstalled || !isMobileScreen || isDismissed) {
      // Reset padding when banner is hidden
      document.documentElement.style.setProperty('--pwa-banner-offset', '0px');
      return;
    }

    if (bannerRef.current) {
      const updatePadding = () => {
        const height = bannerRef.current?.offsetHeight || 0;
        const root = document.documentElement;
        
        // Set banner height only (padding will be added via CSS calc in Layout)
        // This ensures proper spacing even when banner is not visible
        root.style.setProperty('--pwa-banner-offset', `${height}px`);
      };

      // Update immediately
      updatePadding();

      // Update on resize
      const resizeObserver = new ResizeObserver(updatePadding);
      resizeObserver.observe(bannerRef.current);

      // Also listen to window resize for media query changes
      const mediaQuery640 = window.matchMedia('(min-width: 640px)');
      const mediaQuery768 = window.matchMedia('(min-width: 768px)');
      
      const handleMediaChange = () => updatePadding();
      mediaQuery640.addEventListener('change', handleMediaChange);
      mediaQuery768.addEventListener('change', handleMediaChange);

      return () => {
        resizeObserver.disconnect();
        mediaQuery640.removeEventListener('change', handleMediaChange);
        mediaQuery768.removeEventListener('change', handleMediaChange);
      };
    }
  }, [currentUser, isInstalled, isMobileScreen, isDismissed]);

  // Don't show if:
  // - User not signed up
  // - Already installed
  // - Not mobile
  // - User dismissed (though we want it persistent, so this might not be used)
  
  // Handle dismiss - save to localStorage so it persists
  const handleDismiss = () => {
    setIsDismissed(true);
    // Save dismissal preference (optional - remove if you want it to show again on refresh)
    // localStorage.setItem('pwa-banner-dismissed', 'true');
  };

  // Don't show if:
  // - User not signed up
  // - Already installed
  // - Not mobile screen size (<= 768px)
  // - User dismissed
  if (!currentUser || isInstalled || !isMobileScreen || isDismissed) {
    return null;
  }

  const isIOS = platform === 'ios';
  const isAndroid = platform === 'android';

  const handleInstall = async () => {
    if (isAndroid && canShowPrompt) {
      await install();
    }
    // For iOS, we just show instructions (can't programmatically trigger)
  };

  // Calculate top offset to account for mobile header (if visible)
  const topOffset = typeof window !== 'undefined' && window.innerWidth < 768 ? '64px' : '0px';

  return (
    <div 
      ref={bannerRef}
      className="fixed left-0 right-0 z-[60] bg-emerald-600 text-white shadow-lg md:hidden"
      style={{ top: topOffset }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {isIOS ? (
              <IOSShareIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <Download className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-semibold text-sm sm:text-base mb-1">
                  Install Meant2Grow App
                </h3>
                <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed">
                  {isIOS ? (
                    <>
                      Tap the <IOSShareIcon className="w-3 h-3 inline mx-0.5" /> Share button, then select{' '}
                      <strong>"Add to Home Screen"</strong> for push notifications and faster access.
                    </>
                  ) : (
                    <>
                      Install the app to get push notifications and quick access. Tap{' '}
                      <strong>"Install"</strong> when prompted, or use the browser menu.
                    </>
                  )}
                </p>
              </div>

              {/* Action Button or Dismiss */}
              {platform === 'android' && canShowPrompt ? (
                <button
                  onClick={handleInstall}
                  className="flex-shrink-0 bg-white text-emerald-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-emerald-50 transition-colors flex items-center gap-1.5 shadow-sm"
                  aria-label="Install app"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Install</span>
                </button>
              ) : (
                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 p-1.5 text-emerald-50 hover:text-white hover:bg-emerald-700 rounded transition-colors"
                  aria-label="Dismiss banner"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Platform-specific visual guide */}
            {isIOS && (
              <div className="mt-2 pt-2 border-t border-emerald-500/30">
                <div className="flex items-center gap-2 text-xs text-emerald-100">
                  <Smartphone className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong>Step 1:</strong> Tap Share{' '}
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-white/20 mx-0.5">
                      <IOSShareIcon className="w-3 h-3" />
                    </span>
                    {' '}
                    <strong>Step 2:</strong> Scroll down → Tap "Add to Home Screen"
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

