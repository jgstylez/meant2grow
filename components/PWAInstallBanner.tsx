import React, { useState, useEffect, useRef } from 'react';
import { Download, X, Share2, Smartphone, ChevronRight } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallBannerProps {
  currentUser: { id: string } | null;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ currentUser }) => {
  const { isInstalled, isMobile, platform, canShowPrompt, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Debug logging (remove in production)
  useEffect(() => {
    if (currentUser) {
      console.log('[PWA Banner Debug]', {
        hasUser: !!currentUser,
        isInstalled,
        isMobile,
        platform,
        canShowPrompt,
        isDismissed,
        shouldShow: currentUser && !isInstalled && isMobile && !isDismissed
      });
    }
  }, [currentUser, isInstalled, isMobile, platform, canShowPrompt, isDismissed]);

  // Update CSS variable for banner height to adjust main content padding
  useEffect(() => {
    if (!currentUser || isInstalled || !isMobile || isDismissed) {
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
  }, [currentUser, isInstalled, isMobile, isDismissed]);

  // Don't show if:
  // - User not signed up
  // - Already installed
  // - Not mobile
  // - User dismissed (though we want it persistent, so this might not be used)
  
  // Debug: Log why banner might not be showing (only log once per condition change)
  useEffect(() => {
    if (currentUser && !isInstalled && isMobile && !isDismissed) {
      console.log('[PWA Banner] ✅ Showing banner', { 
        platform, 
        isMobile, 
        canShowPrompt,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        userAgent: navigator.userAgent.substring(0, 50)
      });
    } else {
      if (!currentUser) {
        console.log('[PWA Banner] ❌ Not showing: No current user');
      } else if (isInstalled) {
        console.log('[PWA Banner] ❌ Not showing: App already installed (standalone mode)');
      } else if (!isMobile) {
        console.log('[PWA Banner] ❌ Not showing: Not detected as mobile device', { 
          platform, 
          isMobile,
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
          hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
          userAgent: navigator.userAgent.substring(0, 50)
        });
      } else if (isDismissed) {
        console.log('[PWA Banner] ❌ Not showing: User dismissed');
      }
    }
  }, [currentUser, isInstalled, isMobile, isDismissed, platform, canShowPrompt]);
  
  // Fallback: If we're uncertain but have touch + small screen, show banner anyway
  // This handles edge cases where UA detection fails
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  const shouldShowFallback = hasTouchScreen && isSmallScreen && !isInstalled;
  
  // Don't show if:
  // - User not signed up
  // - Already installed
  // - Not mobile AND not fallback case
  // - User dismissed (though we want it persistent, so this might not be used)
  if (!currentUser || isInstalled || isDismissed) {
    return null;
  }
  
  // Show if mobile detected OR fallback conditions met
  if (!isMobile && !shouldShowFallback) {
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
      className="fixed left-0 right-0 z-[60] bg-emerald-600 text-white shadow-lg"
      style={{ top: topOffset }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {isIOS ? (
              <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
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
                      Tap the <Share2 className="w-3 h-3 inline mx-0.5" /> Share button, then select{' '}
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

              {/* Action Button */}
              {isAndroid && canShowPrompt ? (
                <button
                  onClick={handleInstall}
                  className="flex-shrink-0 bg-white text-emerald-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-emerald-50 transition-colors flex items-center gap-1.5 shadow-sm"
                  aria-label="Install app"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Install</span>
                </button>
              ) : (
                <div className="flex-shrink-0 flex items-center text-emerald-50">
                  <ChevronRight className="w-5 h-5" />
                </div>
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
                      <Share2 className="w-3 h-3" />
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

