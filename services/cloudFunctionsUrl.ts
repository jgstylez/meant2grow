/**
 * Base URL for Firebase HTTPS callable endpoints (same path pattern as Cloud Functions URLs).
 *
 * - **Vite dev:** Uses `/api/functions/*` so the browser talks same-origin; Vite proxies to
 *   `VITE_FUNCTIONS_URL` (avoids CORS when calling deployed functions from localhost).
 * - **Dev + emulator:** Set `VITE_FUNCTIONS_USE_EMULATOR=true` to hit the local emulator instead.
 * - **Production build:** Uses `VITE_FUNCTIONS_URL` or derives from `VITE_FIREBASE_PROJECT_ID` (us-central1).
 */
export function getDefaultCloudFunctionsBaseUrl(): string {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "meant2grow-dev";
  return `https://us-central1-${projectId}.cloudfunctions.net`;
}

export function getCloudFunctionUrl(functionName: string): string {
  const name = functionName.replace(/^\//, "");

  if (import.meta.env.DEV && import.meta.env.VITE_FUNCTIONS_USE_EMULATOR === "true") {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "meant2grow-dev";
    return `http://localhost:5001/${projectId}/us-central1/${name}`;
  }

  if (import.meta.env.DEV) {
    return `/api/functions/${name}`;
  }

  const base = (
    import.meta.env.VITE_FUNCTIONS_URL || getDefaultCloudFunctionsBaseUrl()
  ).replace(/\/$/, "");

  return `${base}/${name}`;
}
