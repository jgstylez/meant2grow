import type { VideoCallSessionResponse } from "../services/videoCallApi";

const STORAGE_KEY = "videoCallReturnPage";
const PENDING_SESSION_KEY = "videoCallPendingSession";
const PENDING_SESSION_MAX_AGE_MS = 5 * 60 * 1000;

type StoredPendingSession = VideoCallSessionResponse & { storedAt: number };

/** Remember where to return after leaving an in-app video call (e.g. chat:abc). */
export function setVideoCallReturnPage(page: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, page);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Read and clear the return route for the video call flow. Defaults to `"chat"`. */
export function consumeVideoCallReturnPage(): string {
  try {
    const p = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return p && p.trim() ? p : "chat";
  } catch {
    return "chat";
  }
}

/**
 * After minting a session in Chat, store it so VideoCallPage can reuse the same token
 * instead of calling videoCallSession again on mount (avoids duplicate mints + quota noise).
 */
export function storePendingVideoCallSession(session: VideoCallSessionResponse): void {
  try {
    const payload: StoredPendingSession = {
      ...session,
      storedAt: Date.now(),
    };
    sessionStorage.setItem(PENDING_SESSION_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * If a pending session exists for this meeting id and is fresh, return it and clear storage.
 * Otherwise return null.
 */
export function consumePendingVideoCallSession(
  meetingId: string
): VideoCallSessionResponse | null {
  try {
    const raw = sessionStorage.getItem(PENDING_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredPendingSession;
    sessionStorage.removeItem(PENDING_SESSION_KEY);
    if (
      !data?.meetingId ||
      !data?.token ||
      !data?.participantId ||
      data.meetingId !== meetingId
    ) {
      return null;
    }
    if (Date.now() - (data.storedAt || 0) > PENDING_SESSION_MAX_AGE_MS) {
      return null;
    }
    return {
      meetingId: data.meetingId,
      token: data.token,
      participantId: data.participantId,
    };
  } catch {
    return null;
  }
}
