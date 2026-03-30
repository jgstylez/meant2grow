/**
 * Best-effort per-instance sliding window for videoCallSession (Cloud Functions may scale to
 * multiple instances; this still stops runaway clients and accidental tight loops).
 */
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
/** Burst protection (e.g. HMR, Strict Mode double effects, accidental refetch loops). */
const MAX_PER_MINUTE = 25;
const MAX_PER_HOUR = 180;

type Buckets = { minute: number[]; hour: number[] };

const buckets = new Map<string, Buckets>();

function prune(ts: number[], now: number, windowMs: number): number[] {
  return ts.filter((t) => now - t < windowMs);
}

export function checkVideoCallSessionRateLimit(uid: string):
  | { ok: true }
  | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  let b = buckets.get(uid);
  if (!b) {
    b = { minute: [], hour: [] };
    buckets.set(uid, b);
  }
  b.minute = prune(b.minute, now, MINUTE_MS);
  b.hour = prune(b.hour, now, HOUR_MS);

  if (b.minute.length >= MAX_PER_MINUTE) {
    const oldest = Math.min(...b.minute);
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((oldest + MINUTE_MS - now) / 1000)),
    };
  }
  if (b.hour.length >= MAX_PER_HOUR) {
    const oldest = Math.min(...b.hour);
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((oldest + HOUR_MS - now) / 1000)),
    };
  }

  b.minute.push(now);
  b.hour.push(now);

  if (buckets.size > 8000) {
    for (const [k, v] of buckets) {
      v.hour = prune(v.hour, now, HOUR_MS);
      if (v.hour.length === 0) buckets.delete(k);
    }
  }

  return { ok: true };
}
