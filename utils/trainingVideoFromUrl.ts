/** Derive listing media from hosted video URLs (no API keys). */

export const TRAINING_VIDEO_THUMB_PLACEHOLDER =
  "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=640&q=80";

const HOST_PATTERNS = [
  /youtube\.com/,
  /youtu\.be/,
  /vimeo\.com/,
  /wistia\.(com|net)/,
  /theblacktube\.com/,
  /blacktube\.com/,
];

export function isSupportedTrainingVideoUrl(url: string): boolean {
  if (!url.trim()) return false;
  const lower = url.toLowerCase();
  return HOST_PATTERNS.some((p) => p.test(lower));
}

export function extractYoutubeVideoId(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id || null;
    }
    if (!host.includes("youtube.com")) return null;
    if (u.pathname.startsWith("/embed/")) {
      return u.pathname.split("/")[2] || null;
    }
    if (u.pathname.startsWith("/shorts/")) {
      return u.pathname.split("/")[2] || null;
    }
    const v = u.searchParams.get("v");
    if (v) return v;
  } catch {
    /* invalid URL */
  }
  return null;
}

function parseYoutubeTimeToSeconds(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^\d+(\.\d+)?$/.test(t)) return Math.floor(parseFloat(t));

  let secs = 0;
  let matched = false;
  const h = /(\d+)h/i.exec(t);
  const m = /(\d+)m/i.exec(t);
  const s = /(\d+)s/i.exec(t);
  if (h) {
    matched = true;
    secs += parseInt(h[1], 10) * 3600;
  }
  if (m) {
    matched = true;
    secs += parseInt(m[1], 10) * 60;
  }
  if (s) {
    matched = true;
    secs += parseInt(s[1], 10);
  }
  return matched ? secs : null;
}

export function formatVideoTimestamp(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** YouTube start offset from share links (?t= / &start=), or null. */
export function extractStartTimeFromVideoUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./, "");
    if (host !== "youtu.be" && !host.includes("youtube.com")) return null;

    const tRaw = u.searchParams.get("t") ?? u.searchParams.get("start");
    if (tRaw == null) return null;
    const secs = parseYoutubeTimeToSeconds(tRaw);
    if (secs == null) return null;
    return formatVideoTimestamp(secs);
  } catch {
    return null;
  }
}

export async function resolveThumbnailFromVideoUrl(
  url: string
): Promise<string | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  const ytId = extractYoutubeVideoId(trimmed);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  }

  if (/vimeo\.com/.test(lower)) {
    try {
      const r = await fetch(
        `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(trimmed)}`
      );
      if (!r.ok) return null;
      const j = (await r.json()) as { thumbnail_url?: string };
      return typeof j.thumbnail_url === "string" ? j.thumbnail_url : null;
    } catch {
      return null;
    }
  }

  if (/wistia\.(com|net)/.test(lower)) {
    try {
      const r = await fetch(
        `https://fast.wistia.com/oembed.json?url=${encodeURIComponent(trimmed)}`
      );
      if (!r.ok) return null;
      const j = (await r.json()) as { thumbnail_url?: string };
      return typeof j.thumbnail_url === "string" ? j.thumbnail_url : null;
    } catch {
      return null;
    }
  }

  return null;
}
