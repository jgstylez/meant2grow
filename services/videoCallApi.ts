import { getCloudFunctionUrl, getDefaultCloudFunctionsBaseUrl } from "./cloudFunctionsUrl";
import { getFirebaseIdTokenForCloudFunctions } from "./googleAuth";

export interface VideoCallSessionResponse {
  meetingId: string;
  token: string;
  participantId: string;
}

function parseFunctionsError(response: Response, raw: string): string {
  let data: Record<string, unknown> = {};
  try {
    if (raw) data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return raw.slice(0, 400) || `HTTP ${response.status}`;
  }
  const msg =
    (typeof data.message === "string" && data.message) ||
    (typeof data.error === "string" && data.error);
  if (msg) return msg;
  if (raw && raw.length < 400) return raw;
  return `Request failed (${response.status})`;
}

/**
 * Mint a VideoSDK room + token (new call) or join token for an existing room id.
 */
export async function requestVideoCallSession(
  meetingId?: string
): Promise<VideoCallSessionResponse> {
  const url = getCloudFunctionUrl("videoCallSession");
  const idToken = await getFirebaseIdTokenForCloudFunctions();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(meetingId ? { meetingId } : {}),
  });

  const raw = await response.text();

  let data: {
    error?: string;
    message?: string;
    meetingId?: string;
    token?: string;
    participantId?: string;
  } = {};

  try {
    if (raw) data = JSON.parse(raw) as typeof data;
  } catch {
    /* non-JSON e.g. proxy HTML */
  }

  if (!response.ok) {
    if (response.status === 404) {
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "meant2grow-dev";
      const base = getDefaultCloudFunctionsBaseUrl();
      throw new Error(
        `videoCallSession returned 404 — it is not deployed (or not at this URL) for project "${projectId}". ` +
          `Other functions on ${base} may work; this one does not. ` +
          `Fix: firebase use ${projectId} && firebase deploy --only functions:videoCallSession. ` +
          `Set secret VIDEO_SDK_SECRET and configure VIDEO_SDK_API_KEY for that project, then redeploy. ` +
          `Check Firebase Console → Build → Functions for "videoCallSession".`
      );
    }
    throw new Error(parseFunctionsError(response, raw));
  }

  if (!data.meetingId || !data.token || !data.participantId) {
    throw new Error(
      data.message ||
        data.error ||
        "Invalid response from video service (missing meetingId, token, or participantId)"
    );
  }

  return {
    meetingId: data.meetingId,
    token: data.token,
    participantId: data.participantId,
  };
}
