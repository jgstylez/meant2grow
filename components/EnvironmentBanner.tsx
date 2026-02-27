import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { isSandbox } from '../utils/environment';

interface EnvironmentBannerProps {
  /** Whether an impersonation banner is shown above this one */
  hasImpersonationBanner?: boolean;
  /** When false, banner is in document flow (reserves space, no overlay). Use for public pages. Default true for fixed overlay. */
  fixed?: boolean;
}

export const EnvironmentBanner: React.FC<EnvironmentBannerProps> = ({
  hasImpersonationBanner = false,
  fixed = true,
}) => {
  const isSandboxEnv = isSandbox();

  if (!isSandboxEnv) {
    // Don't show banner in production
    return null;
  }

  // Calculate top offset based on impersonation banner (only when fixed)
  // Include safe-area-inset-top for iOS PWA standalone (notch); falls back to 0 on desktop
  const topOffset = hasImpersonationBanner
    ? 'calc(3.5rem + env(safe-area-inset-top, 0px))'
    : 'env(safe-area-inset-top, 0px)';

  const baseClass = 'left-0 right-0 z-[99] bg-orange-500 text-white px-3 py-2 shadow-lg pointer-events-auto flex items-center h-10';
  const positionClass = fixed ? 'fixed' : 'w-full';

  return (
    <div
      className={`${positionClass} ${baseClass}`}
      style={fixed ? { top: topOffset } : undefined}
    >
      <div className="max-w-7xl mx-auto flex items-center gap-1.5 w-full">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          SANDBOX Environment
        </span>
      </div>
    </div>
  );
};
