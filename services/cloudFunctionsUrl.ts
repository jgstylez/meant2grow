/**
 * Base URL for Firebase HTTPS callable endpoints (same path pattern as Cloud Functions URLs).
 *
 * - **Vite dev on localhost only:** Uses `/api/functions/*` so the browser talks same-origin; Vite proxies to
 *   Cloud Functions (avoids CORS when calling from `localhost` / `127.0.0.1`).
 * - **Any other host (sandbox.meant2grow.com, preview on LAN IP, etc.):** Always uses
 *   `https://us-central1-… .cloudfunctions.net/…`. Using `/api/functions/*` on Firebase Hosting returns
 *   SPA `index.html` (200, `text/html`) and breaks JSON clients such as `videoCallSession`.
 * - **Dev + emulator:** Set `VITE_FUNCTIONS_USE_EMULATOR=true` to hit the local emulator instead.
 * - **Production builds:** Same `*.cloudfunctions.net` base; we do not use Hosting as the functions base.
 */
export function getDefaultCloudFunctionsBaseUrl(): string {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "meant2grow-dev";
  return `https://us-central1-${projectId}.cloudfunctions.net`;
}

/** Same base URL as {@link getCloudFunctionUrl} for non-dev builds. */
export function getResolvedCloudFunctionsBaseUrl(): string {
  return getDefaultCloudFunctionsBaseUrl();
}

export function getCloudFunctionUrl(functionName: string): string {
  const name = functionName.replace(/^\//, "");

  if (import.meta.env.DEV && import.meta.env.VITE_FUNCTIONS_USE_EMULATOR === "true") {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "meant2grow-dev";
    return `http://localhost:5001/${projectId}/us-central1/${name}`;
  }

  // Production / preview bundles: never use `/api/functions/*` (Hosting serves HTML for that path).
  if (import.meta.env.PROD) {
    const base = getDefaultCloudFunctionsBaseUrl().replace(/\/$/, "");
    return `${base}/${name}`;
  }

  const useViteDevProxy =
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  if (useViteDevProxy) {
    return `/api/functions/${name}`;
  }

  const base = getDefaultCloudFunctionsBaseUrl().replace(/\/$/, "");

  return `${base}/${name}`;
}
