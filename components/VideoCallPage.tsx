import React, { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { ArrowLeft, PhoneCall, Video } from "lucide-react";
import type { User } from "../types";
import {
  requestVideoCallSession,
  type VideoCallSessionResponse,
} from "../services/videoCallApi";
import { getErrorMessage } from "../utils/errors";
import {
  displayNameInitials,
  requestMeetingMediaAccess,
} from "../utils/mediaPermissions";

const VideoCallMeeting = lazy(() => import("./VideoCallMeeting"));

type VideoCallPageProps = {
  meetingId: string;
  currentUser: User;
  onErrorToast?: (message: string) => void;
  onNavigateBack: () => void;
};

/**
 * Full-screen video call route. Loads a fresh token for the room so the call
 * is not tied to chat component lifecycle (avoids disappearing UI on reconnect errors).
 */
const VideoCallPage: React.FC<VideoCallPageProps> = ({
  meetingId,
  currentUser,
  onErrorToast,
  onNavigateBack,
}) => {
  const [session, setSession] = useState<VideoCallSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [enteredRoom, setEnteredRoom] = useState(false);
  const [warmupLoading, setWarmupLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    setSession(null);
    requestVideoCallSession(meetingId)
      .then((s) => {
        if (!cancelled) setSession(s);
      })
      .catch((e: unknown) => {
        if (!cancelled) setFetchError(getErrorMessage(e) ?? "Could not join this call");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [meetingId, retryKey]);

  useEffect(() => {
    setEnteredRoom(false);
  }, [meetingId, retryKey]);

  const displayName = currentUser.name?.trim() || "Participant";
  const initials = displayNameInitials(displayName);

  const handleEnterWithMedia = useCallback(async () => {
    setWarmupLoading(true);
    try {
      const result = await requestMeetingMediaAccess();
      setEnteredRoom(true);
      if (result.deniedReason) {
        onErrorToast?.(result.deniedReason);
      } else if (!result.video || !result.audio) {
        onErrorToast?.(
          "Joined with partial access. Use the mic and camera buttons in the call to enable what’s missing."
        );
      }
    } finally {
      setWarmupLoading(false);
    }
  }, [onErrorToast]);

  const handleEnterWithoutWarmup = useCallback(() => {
    setEnteredRoom(true);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 text-white">
      <header className="flex-shrink-0 flex items-center justify-between gap-3 px-3 py-3 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
        <button
          type="button"
          onClick={onNavigateBack}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4 flex-shrink-0" aria-hidden />
          Messages
        </button>
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
            <PhoneCall className="w-4 h-4 text-white" aria-hidden />
          </div>
          <span className="font-semibold text-sm truncate">Video call</span>
        </div>
        <button
          type="button"
          onClick={onNavigateBack}
          className="flex-shrink-0 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-semibold min-h-[44px]"
        >
          End
        </button>
      </header>

      <div className="flex-1 min-h-0 flex flex-col">
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
            <div className="h-10 w-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400 text-center">Preparing your call…</p>
          </div>
        )}

        {!loading && fetchError && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 max-w-md mx-auto text-center">
            <p className="text-slate-300 text-sm">{fetchError}</p>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:justify-center">
              <button
                type="button"
                onClick={() => setRetryKey((k) => k + 1)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={onNavigateBack}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-sm"
              >
                Back to messages
              </button>
            </div>
          </div>
        )}

        {!loading && !fetchError && session && !enteredRoom && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 max-w-md mx-auto text-center">
            <div className="relative">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt=""
                  className="h-28 w-28 rounded-full object-cover border-4 border-slate-700 shadow-xl"
                />
              ) : (
                <div
                  className="h-28 w-28 rounded-full bg-emerald-700/90 flex items-center justify-center text-3xl font-bold text-white border-4 border-slate-700 shadow-xl"
                  aria-hidden
                >
                  {initials}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 border-2 border-slate-950 shadow-md">
                <Video className="h-5 w-5 text-white" aria-hidden />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Meeting room</h2>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                You’ll join as <span className="text-slate-200 font-medium">{displayName}</span>.
                When you continue, your browser may ask to use your camera and microphone. You can
                turn them on or off anytime in the call.
              </p>
            </div>
            <div className="flex flex-col w-full gap-2">
              <button
                type="button"
                disabled={warmupLoading}
                onClick={handleEnterWithMedia}
                className="w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 font-semibold text-sm min-h-[48px]"
              >
                {warmupLoading ? "Requesting access…" : "Enter meeting room"}
              </button>
              <button
                type="button"
                disabled={warmupLoading}
                onClick={handleEnterWithoutWarmup}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-medium text-sm text-slate-200 min-h-[48px]"
              >
                Join without camera or mic setup
              </button>
            </div>
          </div>
        )}

        {!loading && !fetchError && session && enteredRoom && (
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                Loading video…
              </div>
            }
          >
            <VideoCallMeeting
              key={`${session.meetingId}-${session.participantId}`}
              meetingId={session.meetingId}
              token={session.token}
              participantId={session.participantId}
              displayName={displayName}
              localAvatarUrl={currentUser.avatar}
              onLeave={onNavigateBack}
              onErrorToast={onErrorToast}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
};

export default VideoCallPage;
