/** Hidden suffix on chat messages that carry an in-app video call id. */
const MARKER_RE = /\n\[M2G_V:([a-zA-Z0-9_-]+)\]\s*$/;

export function parseVideoCallMessage(text: string): {
  displayText: string;
  meetingId?: string;
} {
  const m = text.match(MARKER_RE);
  if (!m) return { displayText: text };
  return {
    displayText: text.replace(MARKER_RE, "").trimEnd(),
    meetingId: m[1],
  };
}

export function formatVideoCallChatMessage(
  userVisibleLine: string,
  meetingId: string
): string {
  return `${userVisibleLine}\n\n[M2G_V:${meetingId}]`;
}
