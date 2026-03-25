import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MeetingProvider,
  useMeeting,
  VideoPlayer,
  AudioPlayer,
} from "@videosdk.live/react-sdk";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  PhoneOff,
  User,
} from "lucide-react";
import { displayNameInitials } from "../utils/mediaPermissions";

type VideoCallMeetingProps = {
  meetingId: string;
  token: string;
  participantId: string;
  displayName: string;
  /** Shown when local video is off */
  localAvatarUrl?: string;
  onLeave: () => void;
  onErrorToast?: (message: string) => void;
};

function ParticipantAvatarPlate({
  name,
  imageUrl,
  subtitle,
  highlight,
}: {
  name: string;
  imageUrl?: string;
  subtitle?: string;
  highlight?: boolean;
}) {
  const initials = displayNameInitials(name || "Participant");
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-slate-800 to-slate-900 ${
        highlight ? "ring-2 ring-emerald-500/90 ring-inset" : ""
      }`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover border-4 border-slate-600 shadow-xl"
        />
      ) : (
        <div
          className="h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-emerald-700/90 flex items-center justify-center text-3xl sm:text-4xl font-semibold text-white border-4 border-slate-600 shadow-xl"
          aria-hidden
        >
          {initials}
        </div>
      )}
      <div className="text-center px-4">
        <p className="text-sm font-semibold text-white truncate max-w-[90%] mx-auto">{name}</p>
        {subtitle ? (
          <p className="text-xs text-emerald-300/90 mt-1 font-medium">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

function MeetingShell({
  onLeave,
  onErrorToast,
  localAvatarUrl,
  localDisplayName,
}: {
  onLeave: () => void;
  onErrorToast?: (message: string) => void;
  localAvatarUrl?: string;
  localDisplayName: string;
}) {
  const hadSuccessfulJoinRef = useRef(false);
  const [toggleBusy, setToggleBusy] = useState<"mic" | "cam" | "share" | null>(null);

  const {
    leave,
    participants,
    localParticipant,
    toggleMic,
    toggleWebcam,
    toggleScreenShare,
    localMicOn,
    localWebcamOn,
    localScreenShareOn,
    presenterId,
    isMeetingJoined,
  } = useMeeting({
    onMeetingJoined: () => {
      hadSuccessfulJoinRef.current = true;
    },
    onMeetingLeft: () => {
      if (hadSuccessfulJoinRef.current) {
        onLeave();
      }
    },
    onError: ({ message, code }) => {
      const m = message || "Video call error";
      if (/permission|denied|NotAllowed|device/i.test(m) || code === "permission_denied") {
        onErrorToast?.(
          "Microphone or camera permission is required for that action. Check your browser settings."
        );
      } else {
        onErrorToast?.(m);
      }
    },
  });

  // VideoSDK can reject with AwaitQueueStoppedError when the room transport closes during
  // unmount; it is benign but pollutes the console as an unhandled rejection.
  useEffect(() => {
    const onUnhandledRejection = (ev: PromiseRejectionEvent) => {
      const reason = ev.reason;
      const name =
        reason && typeof reason === "object" && "name" in reason
          ? String((reason as { name?: string }).name)
          : "";
      const msg =
        reason && typeof reason === "object" && "message" in reason
          ? String((reason as { message?: string }).message)
          : String(reason ?? "");
      if (name === "AwaitQueueStoppedError" || /queue stopped/i.test(msg)) {
        ev.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", onUnhandledRejection);
  }, []);

  useEffect(() => {
    return () => {
      try {
        leave();
      } catch {
        /* ignore sync errors from teardown */
      }
    };
  }, [leave]);

  const handleLeave = useCallback(() => {
    leave();
  }, [leave]);

  const runToggle = useCallback(
    async (kind: "mic" | "cam" | "share", fn: () => void | Promise<void>) => {
      setToggleBusy(kind);
      try {
        if (kind === "mic" && !localMicOn && navigator.mediaDevices?.getUserMedia) {
          try {
            const s = await navigator.mediaDevices.getUserMedia({ audio: true });
            s.getTracks().forEach((t) => t.stop());
          } catch {
            onErrorToast?.(
              "Microphone access was denied. Allow the mic in your browser to speak in the call."
            );
            return;
          }
        }
        if (kind === "cam" && !localWebcamOn && navigator.mediaDevices?.getUserMedia) {
          try {
            const s = await navigator.mediaDevices.getUserMedia({ video: true });
            s.getTracks().forEach((t) => t.stop());
          } catch {
            onErrorToast?.(
              "Camera access was denied. Allow the camera in your browser to show video."
            );
            return;
          }
        }
        await Promise.resolve(fn());
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        onErrorToast?.(msg || "Could not update device");
      } finally {
        setToggleBusy(null);
      }
    },
    [localMicOn, localWebcamOn, onErrorToast]
  );

  const participantIds = useMemo(
    () => [...participants.keys()],
    [participants]
  );

  const gridClass =
    participantIds.length <= 1
      ? "grid-cols-1"
      : participantIds.length === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-2";

  const localId = localParticipant?.id;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-950 text-white">
      <div className={`flex-1 min-h-0 p-3 grid gap-3 ${gridClass} auto-rows-fr`}>
        {!isMeetingJoined ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-900/80 border border-slate-700/80 col-span-full min-h-[200px]">
            <div className="h-10 w-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-slate-300">Connecting…</p>
          </div>
        ) : (
          participantIds.map((id) => {
            const p = participants.get(id);
            const name = p?.displayName || "Participant";
            const isLocal = id === localId;
            const isPresenter = presenterId === id;
            const showShare = isPresenter;
            const showCamera = !showShare && Boolean(p?.webcamOn);

            return (
              <div
                key={id}
                className="relative min-h-[200px] rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-lg"
              >
                {showShare ? (
                  <VideoPlayer
                    participantId={id}
                    type="share"
                    className="absolute inset-0 w-full h-full z-[1]"
                    classNameVideo="w-full h-full object-contain bg-black"
                  />
                ) : showCamera ? (
                  <VideoPlayer
                    participantId={id}
                    type="video"
                    className="absolute inset-0 w-full h-full z-[1]"
                    classNameVideo="w-full h-full object-cover"
                  />
                ) : null}

                {!showShare && !showCamera ? (
                  <ParticipantAvatarPlate
                    name={name}
                    imageUrl={isLocal ? localAvatarUrl : undefined}
                    subtitle={isLocal ? "You're in the room" : "In the room · Camera off"}
                    highlight={isLocal}
                  />
                ) : null}

                <AudioPlayer participantId={id} type="audio" />

                <div className="absolute top-2 right-2 z-[2] flex gap-1.5 pointer-events-none">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm ${
                      p?.micOn
                        ? "bg-slate-900/70 text-emerald-300"
                        : "bg-red-900/80 text-white"
                    }`}
                    title={p?.micOn ? "Microphone on" : "Microphone off"}
                  >
                    {p?.micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </span>
                  {!showShare ? (
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm ${
                        p?.webcamOn
                          ? "bg-slate-900/70 text-emerald-300"
                          : "bg-slate-900/70 text-slate-400"
                      }`}
                      title={p?.webcamOn ? "Camera on" : "Camera off"}
                    >
                      {p?.webcamOn ? (
                        <Video className="h-4 w-4" />
                      ) : (
                        <VideoOff className="h-4 w-4" />
                      )}
                    </span>
                  ) : null}
                </div>

                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end pointer-events-none z-[2]">
                  <span className="text-xs font-medium px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm truncate max-w-[70%] flex items-center gap-1.5">
                    {isLocal ? (
                      <User className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" aria-hidden />
                    ) : null}
                    {name}
                    {isLocal ? (
                      <span className="text-[10px] uppercase tracking-wide text-emerald-400/90">
                        You
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isMeetingJoined ? (
        <div className="flex-shrink-0 border-t border-slate-800 bg-slate-900/95 backdrop-blur-md px-4 py-3">
          <p className="text-center text-[11px] text-slate-500 mb-2">
            Mic and camera can be turned on or off anytime
          </p>
          <div className="flex items-center justify-center gap-3 max-w-lg mx-auto">
            <button
              type="button"
              disabled={toggleBusy !== null}
              onClick={() => runToggle("mic", () => toggleMic())}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                localMicOn
                  ? "bg-slate-700 hover:bg-slate-600 text-white"
                  : "bg-red-600/90 hover:bg-red-500 text-white"
              }`}
              aria-label={localMicOn ? "Mute microphone" : "Unmute microphone"}
              aria-pressed={localMicOn}
            >
              {localMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
            <button
              type="button"
              disabled={toggleBusy !== null}
              onClick={() => runToggle("cam", () => toggleWebcam())}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                localWebcamOn
                  ? "bg-slate-700 hover:bg-slate-600 text-white"
                  : "bg-red-600/90 hover:bg-red-500 text-white"
              }`}
              aria-label={localWebcamOn ? "Turn camera off" : "Turn camera on"}
              aria-pressed={localWebcamOn}
            >
              {localWebcamOn ? (
                <Video className="h-5 w-5" />
              ) : (
                <VideoOff className="h-5 w-5" />
              )}
            </button>
            <button
              type="button"
              disabled={toggleBusy !== null}
              onClick={() => runToggle("share", () => toggleScreenShare())}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                localScreenShareOn
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-slate-700 hover:bg-slate-600 text-white"
              }`}
              aria-label={
                localScreenShareOn ? "Stop sharing screen" : "Share screen"
              }
            >
              <MonitorUp className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleLeave}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white ml-2"
              aria-label="Leave call"
            >
              <PhoneOff className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const VideoCallMeeting: React.FC<VideoCallMeetingProps> = ({
  meetingId,
  token,
  participantId,
  displayName,
  localAvatarUrl,
  onLeave,
  onErrorToast,
}) => {
  const config = useMemo(
    () => ({
      meetingId,
      name: displayName,
      participantId,
      micEnabled: false,
      webcamEnabled: false,
      maxResolution: "sd" as const,
      multiStream: false,
      debugMode: import.meta.env.DEV,
    }),
    [meetingId, displayName, participantId]
  );

  return (
    <MeetingProvider
      token={token}
      joinWithoutUserInteraction
      config={config}
    >
      <MeetingShell
        onLeave={onLeave}
        onErrorToast={onErrorToast}
        localAvatarUrl={localAvatarUrl}
        localDisplayName={displayName}
      />
    </MeetingProvider>
  );
};

export default VideoCallMeeting;
