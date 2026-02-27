/**
 * Analytics ingest helper. In development, skips the request to avoid
 * ERR_CONNECTION_REFUSED when the local ingest server is not running.
 */
const INGEST_URL = 'http://127.0.0.1:7243/ingest/a6853916-ca8d-4c7b-8a80-610201bf60a7';

export function safeIngest(payload: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    return;
  }
  fetch(INGEST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
