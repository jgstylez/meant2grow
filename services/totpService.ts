/**
 * TOTP (Google Authenticator) 2FA service
 * Calls Firebase Cloud Functions for setup, verification, and disable
 */
const getFunctionsUrl = (): string => {
  const base = import.meta.env.VITE_FUNCTIONS_URL;
  if (base) return base.replace(/\/$/, "");
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "meant2grow-dev";
  return `https://us-central1-${projectId}.cloudfunctions.net`;
};

export async function setupTotp(idToken: string): Promise<{ secret: string; otpauthUri: string }> {
  const res = await fetch(`${getFunctionsUrl()}/setupTotp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to setup two-factor authentication");
  return data;
}

export async function verifyTotpSetup(idToken: string, code: string): Promise<void> {
  const res = await fetch(`${getFunctionsUrl()}/verifyTotpSetup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to enable two-factor authentication");
}

export async function verifyTotpLogin(code: string, idToken: string): Promise<void> {
  const res = await fetch(`${getFunctionsUrl()}/verifyTotpLogin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, idToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Invalid verification code");
}

export async function disableTotp(idToken: string, code: string): Promise<void> {
  const res = await fetch(`${getFunctionsUrl()}/disableTotp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to disable two-factor authentication");
}
