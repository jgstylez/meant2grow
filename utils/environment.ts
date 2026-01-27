/**
 * Environment detection utilities
 * Determines if the app is running in sandbox or production environment
 */

/**
 * Detects if the app is running in sandbox environment
 * Checks multiple indicators for reliability
 */
export function isSandbox(): boolean {
  // Check Firebase project ID
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || '';
  if (projectId.includes('dev') || projectId === 'meant2grow-dev') {
    return true;
  }

  // Check app URL
  const appUrl = import.meta.env.VITE_APP_URL || '';
  if (appUrl.includes('sandbox')) {
    return true;
  }

  // Check hostname (fallback for runtime detection)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('sandbox') || hostname.includes('dev')) {
      return true;
    }
  }

  // Default to production
  return false;
}

/**
 * Gets the current environment name
 */
export function getEnvironment(): 'sandbox' | 'production' {
  return isSandbox() ? 'sandbox' : 'production';
}
