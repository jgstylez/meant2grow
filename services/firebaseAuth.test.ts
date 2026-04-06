import { describe, expect, it } from "vitest";
import {
  AuthLinkFailureError,
  EmailAlreadyInUseOnSignupError,
  isAuthLinkFailureError,
  isEmailAlreadyInUseOnSignupError,
} from "./firebaseAuth";

describe("AuthLinkFailureError", () => {
  it("carries SOCIAL_SIGN_IN_REQUIRED code", () => {
    const err = new AuthLinkFailureError("Use Google sign-in");
    expect(err).toBeInstanceOf(Error);
    expect(err.authLinkCode).toBe("SOCIAL_SIGN_IN_REQUIRED");
    expect(isAuthLinkFailureError(err)).toBe(true);
  });

  it("isAuthLinkFailureError is false for other errors", () => {
    expect(isAuthLinkFailureError(new Error("other"))).toBe(false);
    expect(isAuthLinkFailureError(null)).toBe(false);
  });
});

describe("EmailAlreadyInUseOnSignupError", () => {
  it("is recognized by type guard", () => {
    const err = new EmailAlreadyInUseOnSignupError();
    expect(err).toBeInstanceOf(Error);
    expect(isEmailAlreadyInUseOnSignupError(err)).toBe(true);
  });

  it("isEmailAlreadyInUseOnSignupError is false for other errors", () => {
    expect(isEmailAlreadyInUseOnSignupError(new Error("x"))).toBe(false);
  });
});
