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
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "";
  if (projectId.includes("dev") || projectId === "meant2grow-dev") {
    return true;
  }

  // Check app URL
  const appUrl = import.meta.env.VITE_APP_URL || "";
  if (appUrl.includes("sandbox")) {
    return true;
  }

  // Check hostname (fallback for runtime detection)
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname.includes("sandbox") || hostname.includes("dev")) {
      return true;
    }
  }

  // Default to production
  return false;
}

/**
 * Gets the current environment name
 */
export function getEnvironment(): "sandbox" | "production" {
  return isSandbox() ? "sandbox" : "production";
}

/** True when running the Vite dev server */
export function isViteDevelopment(): boolean {
  return Boolean(import.meta.env.DEV);
}

/**
 * Local app URLs (Vite dev, or preview/build served from localhost).
 * Use to relax UX (FCM, noisy logs) without affecting production deployments.
 */
export function isLocalDevelopmentHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

export function isLocalDevelopment(): boolean {
  return isViteDevelopment() || isLocalDevelopmentHost();
}

/** Set `VITE_VERBOSE_CHAT=true` in .env.local to log group merge / filter diagnostics in Chat. */
export function isVerboseChatLogging(): boolean {
  return import.meta.env.VITE_VERBOSE_CHAT === "true";
}

/** Production web app hostnames (not localhost, not dev server). */
export function isProductionWebAppHost(): boolean {
  if (typeof window === "undefined") return import.meta.env.PROD;
  const h = window.location.hostname;
  if (isLocalDevelopmentHost()) return false;
  return (
    h.endsWith("meant2grow.com") ||
    h.endsWith(".web.app") ||
    h.endsWith(".firebaseapp.com")
  );
}
