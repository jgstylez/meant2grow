import { describe, it, expect, vi, beforeEach } from "vitest";

const sendPasswordResetEmailMock = vi.fn();

vi.mock("firebase/auth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("firebase/auth")>();
  return {
    ...mod,
    sendPasswordResetEmail: (...args: unknown[]) =>
      sendPasswordResetEmailMock(...args),
  };
});

vi.mock("./firebase", () => ({
  auth: {},
  db: {},
}));

import {
  sendFirebasePasswordResetEmail,
  getPasswordResetContinueUrl,
} from "./firebaseAuth";

describe("getPasswordResetContinueUrl", () => {
  it("appends reset-password flag to the current origin (used in Firebase Auth email links)", () => {
    expect(getPasswordResetContinueUrl()).toBe(
      `${window.location.origin}/?reset-password=1`,
    );
  });
});

describe("sendFirebasePasswordResetEmail", () => {
  beforeEach(() => {
    sendPasswordResetEmailMock.mockReset();
    sendPasswordResetEmailMock.mockResolvedValue(undefined);
  });

  it("calls Firebase sendPasswordResetEmail with normalized email and action code settings", async () => {
    await sendFirebasePasswordResetEmail("User@Example.COM");

    expect(sendPasswordResetEmailMock).toHaveBeenCalledTimes(1);
    const [authArg, emailArg, settingsArg] = sendPasswordResetEmailMock.mock
      .calls[0] as [unknown, string, { url?: string; handleCodeInApp?: boolean }];

    expect(authArg).toBeDefined();
    expect(emailArg).toBe("user@example.com");
    expect(settingsArg?.handleCodeInApp).toBe(false);
    expect(settingsArg?.url).toMatch(/\?reset-password=1$/);
  });
});
