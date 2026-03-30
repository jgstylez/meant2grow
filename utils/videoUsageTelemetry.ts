/**
 * Video call usage and HMR cleanup for VideoSDK.
 * - Dev: structured console lines you can filter (e.g. `[video-usage]`).
 * - Prod: forwards to the same ingest as `safeIngest` (skipped in DEV by that helper).
 */

import { safeIngest } from "./analyticsIngest";

const PREFIX = "[video-usage]";

export type VideoUsageEventName =
  | "video_session_mint"
  | "video_meeting_joined"
  | "video_meeting_left"
  | "video_hmr_dispose_leave"
  | "video_sdk_error";

export type VideoUsagePayload = {
  event: VideoUsageEventName;
  meetingId: string;
  participantId?: string;
  /** Where the event originated (e.g. api, meeting_shell, hmr). */
  source?: string;
  extra?: Record<string, unknown>;
};

let hmrLeave: (() => void) | null = null;
/** Set on each mount so telemetry and HMR dispose always have a room id even if React tears down first. */
let activeMeetingForHmr: string | null = null;
let hmrRegisteredMeetingId: string | null = null;

/** Register the meeting `leave()` handler so Vite HMR can run it before the module is replaced. */
export function registerVideoMeetingHmrLeave(fn: () => void, meetingId: string): void {
  hmrLeave = fn;
  hmrRegisteredMeetingId = meetingId;
}

export function clearVideoMeetingHmrLeave(): void {
  hmrLeave = null;
  hmrRegisteredMeetingId = null;
}

export function setVideoTelemetryActiveMeetingId(meetingId: string | null): void {
  activeMeetingForHmr = meetingId;
}

function runHmrLeave(): void {
  const meetingId = hmrRegisteredMeetingId ?? activeMeetingForHmr ?? "unknown";
  try {
    hmrLeave?.();
  } catch {
    /* ignore */
  }
  logVideoUsageEvent("video_hmr_dispose_leave", {
    meetingId,
    source: "vite_hmr",
    extra: { note: "vite import.meta.hot.dispose before module replace" },
  });
}

export function logVideoUsageEvent(
  event: VideoUsageEventName,
  payload: Omit<VideoUsagePayload, "event"> & { meetingId?: string }
): void {
  const meetingId = payload.meetingId ?? activeMeetingForHmr ?? "unknown";
  const body: VideoUsagePayload = {
    event,
    meetingId,
    participantId: payload.participantId,
    source: payload.source,
    extra: payload.extra,
  };

  if (import.meta.env.DEV) {
    console.info(PREFIX, JSON.stringify({ ...body, t: Date.now() }));
    return;
  }

  safeIngest({
    type: "video_usage",
    ...body,
    t: Date.now(),
  });
}

export function installVideoMeetingHmrDispose(): void {
  if (!import.meta.hot) return;
  import.meta.hot.dispose(() => {
    runHmrLeave();
  });
}
