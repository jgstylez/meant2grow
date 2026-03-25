import * as crypto from "crypto";

const VIDEOSDK_ROOMS_URL = "https://api.videosdk.live/v2/rooms";

function base64UrlEncodeJson(obj: object): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

/** HS256 JWT for VideoSDK v2 (API key + secret from VideoSDK dashboard). */
export function signVideoSdkJwt(params: {
  apiKey: string;
  secret: string;
  permissions: string[];
  version: number;
  roomId?: string;
  participantId?: string;
  roles?: string[];
  ttlSeconds: number;
}): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    apikey: params.apiKey,
    permissions: params.permissions,
    version: params.version,
    exp: now + params.ttlSeconds,
    iat: now,
  };
  if (params.roomId) payload.roomId = params.roomId;
  if (params.participantId) payload.participantId = params.participantId;
  if (params.roles?.length) payload.roles = params.roles;

  const data = `${base64UrlEncodeJson(header)}.${base64UrlEncodeJson(payload)}`;
  const sig = crypto.createHmac("sha256", params.secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export async function videosdkCreateRoom(apiKey: string, secret: string): Promise<string> {
  const managementToken = signVideoSdkJwt({
    apiKey,
    secret,
    permissions: ["allow_join"],
    version: 2,
    roles: ["crawler"],
    ttlSeconds: 120,
  });

  const res = await fetch(VIDEOSDK_ROOMS_URL, {
    method: "POST",
    headers: {
      Authorization: managementToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      autoCloseConfig: {
        type: "session-ends",
        duration: 180,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`VideoSDK create room ${res.status}: ${body}`);
  }

  const json = (await res.json()) as { roomId?: string; id?: string };
  const roomId = json.roomId || json.id;
  if (!roomId || typeof roomId !== "string") {
    throw new Error("VideoSDK create room: missing roomId in response");
  }
  return roomId;
}

export function mintParticipantToken(
  apiKey: string,
  secret: string,
  roomId: string,
  participantId: string,
  ttlSeconds: number
): string {
  return signVideoSdkJwt({
    apiKey,
    secret,
    permissions: ["allow_join"],
    version: 2,
    roomId,
    participantId,
    roles: ["rtc"],
    ttlSeconds,
  });
}
