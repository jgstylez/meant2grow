/**
 * TOTP (Google Authenticator) 2FA service
 * Calls Firebase Cloud Functions for setup, verification, and disable
 */
import { getCloudFunctionUrl } from "./cloudFunctionsUrl";

export async function setupTotp(idToken: string): Promise<{ secret: string; otpauthUri: string }> {
  const res = await fetch(getCloudFunctionUrl("setupTotp"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to setup two-factor authentication");
  return data;
}

export async function verifyTotpSetup(idToken: string, code: string): Promise<void> {
  const res = await fetch(getCloudFunctionUrl("verifyTotpSetup"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to enable two-factor authentication");
}

export async function verifyTotpLogin(code: string, idToken: string): Promise<void> {
  const res = await fetch(getCloudFunctionUrl("verifyTotpLogin"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, idToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Invalid verification code");
}

export async function disableTotp(idToken: string, code: string): Promise<void> {
  const res = await fetch(getCloudFunctionUrl("disableTotp"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to disable two-factor authentication");
}
