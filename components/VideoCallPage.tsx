import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Mic,
  MicOff,
  PhoneCall,
  Video,
  VideoOff,
} from "lucide-react";
import type { User } from "../types";
import {
  requestVideoCallSession,
  type VideoCallSessionResponse,
} from "../services/videoCallApi";
import { getErrorMessage } from "../utils/errors";
import { displayNameInitials } from "../utils/mediaPermissions";
import { consumePendingVideoCallSession } from "../utils/videoCallNavigation";
import VideoCallMeeting from "./VideoCallMeeting";

type VideoCallPageProps = {
  meetingId: string;
  currentUser: User;
  onErrorToast?: (message: string) => void;
  onNavigateBack: () => void;
};

function LobbyMicLevel({ stream }: { stream: MediaStream | null }) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const track = stream?.getAudioTracks()[0];
    if (!track?.enabled) {
      setLevel(0);
      return;
    }

    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioContext();
    } catch {
      return;
    }
    const source = ctx.createMediaStreamSource(stream!);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.65;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const avg = sum / (data.length * 255);
      setLevel(avg);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      void ctx?.close();
    };
  }, [stream]);

  return (
    <div
      className="flex h-10 items-end justify-center gap-1"
      aria-hidden
      title="Microphone level"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-1.5 rounded-full bg-emerald-400/90 transition-[height] duration-75"
          style={{
            height: `${10 + level * (i + 1) * 14}px`,
            opacity: 0.35 + level * 0.65,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Full-screen video call route. Tokens are minted when the user enters the room (or reused
 * from a pending session after “Start call” in chat) to avoid duplicate VideoSDK sessions on
 * lobby mount, Strict Mode, or HMR.
 */
const VideoCallPage: React.FC<VideoCallPageProps> = ({
  meetingId,
  currentUser,
  onErrorToast,
  onNavigateBack,
}) => {
  const [session, setSession] = useState<VideoCallSessionResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [enteringRoom, setEnteringRoom] = useState(false);
  const [enteredRoom, setEnteredRoom] = useState(false);
  const [lobbyCamOn, setLobbyCamOn] = useState(false);
  const [lobbyMicOn, setLobbyMicOn] = useState(false);
  const [lobbyToggleBusy, setLobbyToggleBusy] = useState<"mic" | "cam" | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setEnteredRoom(false);
    setLobbyCamOn(false);
    setLobbyMicOn(false);
    setFetchError(null);
    setSession(consumePendingVideoCallSession(meetingId));
  }, [meetingId]);

  useEffect(() => {
    if (!lobbyCamOn && !lobbyMicOn) {
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((t) => t.stop());
        previewStreamRef.current = null;
      }
      setPreviewStream(null);
      setLobbyToggleBusy(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setLobbyToggleBusy(lobbyMicOn ? "mic" : "cam");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: lobbyCamOn,
          audio: lobbyMicOn,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (previewStreamRef.current) {
          previewStreamRef.current.getTracks().forEach((t) => t.stop());
        }
        previewStreamRef.current = stream;
        setPreviewStream(stream);
      } catch (err: unknown) {
        const name =
          err && typeof err === "object" && "name" in err
            ? String((err as DOMException).name)
            : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          onErrorToast?.(
            "Camera or microphone access was blocked. You can allow access in your browser settings and try again."
          );
        } else {
          onErrorToast?.(
            "Could not access your camera or microphone. Check device settings and try again."
          );
        }
        if (lobbyCamOn) setLobbyCamOn(false);
        if (lobbyMicOn) setLobbyMicOn(false);
      } finally {
        if (!cancelled) setLobbyToggleBusy(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lobbyCamOn, lobbyMicOn, onErrorToast]);

  useEffect(() => {
    const el = previewVideoRef.current;
    if (!el) return;
    el.srcObject = previewStream;
    if (previewStream?.getVideoTracks()[0]) {
      void el.play().catch(() => {
        /* autoplay policies; user gesture may be required on some browsers */
      });
    }
    return () => {
      el.srcObject = null;
    };
  }, [previewStream]);

  const runLobbyToggle = useCallback(
    async (kind: "mic" | "cam") => {
      if (lobbyToggleBusy) return;
      if (kind === "mic") setLobbyMicOn((v) => !v);
      else setLobbyCamOn((v) => !v);
    },
    [lobbyToggleBusy]
  );

  const handleEnterRoom = useCallback(async () => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
    }
    setPreviewStream(null);
    setLobbyCamOn(false);
    setLobbyMicOn(false);

    if (session) {
      setEnteredRoom(true);
      return;
    }

    setEnteringRoom(true);
    setFetchError(null);
    try {
      const s = await requestVideoCallSession(meetingId);
      setSession(s);
      setEnteredRoom(true);
    } catch (e: unknown) {
      setFetchError(getErrorMessage(e) ?? "Could not join this call");
    } finally {
      setEnteringRoom(false);
    }
  }, [meetingId, session]);

  const displayName = currentUser.name?.trim() || "Participant";
  const initials = displayNameInitials(displayName);
  const videoTrackOn = Boolean(previewStream?.getVideoTracks()[0]?.enabled);

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
        {!enteredRoom && fetchError && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 max-w-md mx-auto text-center">
            <p className="text-slate-300 text-sm">{fetchError}</p>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:justify-center">
              <button
                type="button"
                onClick={() => setFetchError(null)}
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

        {!enteredRoom && !fetchError && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 p-6 max-w-md mx-auto w-full">
            <div className="relative shrink-0">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover border-2 border-slate-700 shadow-md"
                />
              ) : (
                <div
                  className="h-16 w-16 rounded-full bg-emerald-700/90 flex items-center justify-center text-xl font-bold text-white border-2 border-slate-700 shadow-md"
                  aria-hidden
                >
                  {initials}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 border-2 border-slate-950 shadow-md">
                <Video className="h-4 w-4 text-white" aria-hidden />
              </div>
            </div>

            <div className="relative w-full max-w-xs aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-lg">
              {videoTrackOn ? (
                <video
                  ref={previewVideoRef}
                  muted
                  playsInline
                  autoPlay
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500">
                  <VideoOff className="h-10 w-10 opacity-80" aria-hidden />
                  <span className="text-xs font-medium">Camera off</span>
                </div>
              )}
              <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end pointer-events-none">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-black/50 text-slate-200">
                  Preview
                </span>
              </div>
            </div>

            {lobbyMicOn && previewStream ? (
              <div className="w-full max-w-xs">
                <p className="text-[11px] text-slate-500 text-center mb-1">Microphone</p>
                <LobbyMicLevel stream={previewStream} />
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 text-center min-h-[2.5rem] flex items-center justify-center">
                Turn the microphone on to test levels before you join.
              </p>
            )}

            <div>
              <h2 className="text-lg font-semibold text-white text-center">Meeting room</h2>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed text-center">
                You’ll join as <span className="text-slate-200 font-medium">{displayName}</span>.
                Use the controls below to preview your camera and microphone. In the call you can
                change them anytime.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={lobbyToggleBusy !== null}
                onClick={() => runLobbyToggle("mic")}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                  lobbyMicOn
                    ? "bg-slate-700 hover:bg-slate-600 text-white"
                    : "bg-red-600/90 hover:bg-red-500 text-white"
                }`}
                aria-label={lobbyMicOn ? "Mute microphone preview" : "Unmute microphone preview"}
                aria-pressed={lobbyMicOn}
              >
                {lobbyMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </button>
              <button
                type="button"
                disabled={lobbyToggleBusy !== null}
                onClick={() => runLobbyToggle("cam")}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                  lobbyCamOn
                    ? "bg-slate-700 hover:bg-slate-600 text-white"
                    : "bg-red-600/90 hover:bg-red-500 text-white"
                }`}
                aria-label={lobbyCamOn ? "Turn camera preview off" : "Turn camera preview on"}
                aria-pressed={lobbyCamOn}
              >
                {lobbyCamOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </button>
            </div>

            <button
              type="button"
              disabled={lobbyToggleBusy !== null || enteringRoom}
              onClick={() => void handleEnterRoom()}
              className="w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 font-semibold text-sm min-h-[48px]"
            >
              {enteringRoom ? "Joining…" : "Enter meeting room"}
            </button>
          </div>
        )}

        {!fetchError && session && enteredRoom && (
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
        )}
      </div>
    </div>
  );
};

export default VideoCallPage;
