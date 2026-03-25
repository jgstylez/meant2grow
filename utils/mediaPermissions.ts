/**
 * Request camera + microphone so the browser permission prompt runs before the VideoSDK join.
 * Stops tracks immediately; granted permission persists for later getUserMedia from the SDK.
 */
export async function requestMeetingMediaAccess(): Promise<{
  video: boolean;
  audio: boolean;
  deniedReason?: string;
}> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return {
      video: false,
      audio: false,
      deniedReason: "This browser does not support camera or microphone access.",
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    stream.getTracks().forEach((t) => t.stop());
    return { video: true, audio: true };
  } catch (err: unknown) {
    const name = err && typeof err === "object" && "name" in err ? String((err as DOMException).name) : "";
    let video = false;
    let audio = false;

    try {
      const v = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      v.getTracks().forEach((t) => t.stop());
      video = true;
    } catch {
      // ignore
    }

    try {
      const a = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      a.getTracks().forEach((t) => t.stop());
      audio = true;
    } catch {
      // ignore
    }

    const deniedReason =
      name === "NotAllowedError" || name === "PermissionDeniedError"
        ? "Camera or microphone access was blocked. You can allow them in your browser settings and use the buttons in the call to try again."
        : "Could not access camera or microphone. Check device settings and try again.";

    return { video, audio, deniedReason: video || audio ? undefined : deniedReason };
  }
}

export function displayNameInitials(name: string, maxLetters = 2): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return parts[0].slice(0, maxLetters).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
