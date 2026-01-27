import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { isSandbox } from '../utils/environment';

interface EnvironmentBannerProps {
  /** Whether an impersonation banner is shown above this one */
  hasImpersonationBanner?: boolean;
}

export const EnvironmentBanner: React.FC<EnvironmentBannerProps> = ({
  hasImpersonationBanner = false,
}) => {
  const isSandboxEnv = isSandbox();

  if (!isSandboxEnv) {
    // Don't show banner in production
    return null;
  }

  // Calculate top offset based on impersonation banner
  const topOffset = hasImpersonationBanner ? '3.5rem' : '0';

  return (
    <div
      className="fixed left-0 right-0 z-[99] bg-orange-500 text-white px-3 py-2 shadow-lg pointer-events-auto flex items-center h-10"
      style={{ top: topOffset }}
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
