import { describe, expect, it } from "vitest";
import {
  formatError,
  getErrorCode,
  getErrorMessage,
  isError,
  isFirebaseError,
  isFirestorePermissionDenied,
} from "./errors";

describe("isError", () => {
  it("returns true for Error instances", () => {
    expect(isError(new Error("x"))).toBe(true);
  });

  it("returns false for primitives and plain objects", () => {
    expect(isError("err")).toBe(false);
    expect(isError({ message: "x" })).toBe(false);
  });
});

describe("getErrorMessage", () => {
  it("reads message from Error and message-like objects", () => {
    expect(getErrorMessage(new Error("a"))).toBe("a");
    expect(getErrorMessage({ message: "b" })).toBe("b");
    expect(getErrorMessage("plain")).toBe("plain");
  });

  it("returns fallback for unknown shapes", () => {
    expect(getErrorMessage(null)).toBe("An unknown error occurred");
    expect(getErrorMessage(undefined)).toBe("An unknown error occurred");
  });
});

describe("getErrorCode", () => {
  it("returns string code when present", () => {
    expect(getErrorCode({ code: "permission-denied" })).toBe("permission-denied");
  });

  it("returns undefined when missing or not a string", () => {
    expect(getErrorCode(new Error("x"))).toBeUndefined();
    expect(getErrorCode({ code: 1 })).toBeUndefined();
  });
});

describe("isFirestorePermissionDenied", () => {
  it("detects permission-denied code", () => {
    expect(isFirestorePermissionDenied({ code: "permission-denied" })).toBe(true);
  });

  it("detects message substring from Firestore rules", () => {
    expect(
      isFirestorePermissionDenied(new Error("Missing or insufficient permissions.")),
    ).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isFirestorePermissionDenied(new Error("network"))).toBe(false);
  });
});

describe("formatError", () => {
  it("includes message, code, stack, and extra details", () => {
    const err = new Error("fail");
    err.name = "TestError";
    (err as Error & { custom?: string }).custom = "extra";

    const formatted = formatError(err);
    expect(formatted.message).toBe("fail");
    expect(formatted.stack).toBeDefined();
    expect(formatted.details?.custom).toBe("extra");
  });
});

describe("isFirebaseError", () => {
  it("returns true for auth/ and firestore/ prefixed codes", () => {
    const authErr = new Error("x");
    (authErr as unknown as { code: string }).code = "auth/wrong-password";
    expect(isFirebaseError(authErr)).toBe(true);

    const fsErr = new Error("y");
    (fsErr as unknown as { code: string }).code = "firestore/not-found";
    expect(isFirebaseError(fsErr)).toBe(true);
  });

  it("returns false for non-Error, missing code, or other prefixes", () => {
    expect(isFirebaseError(null)).toBe(false);
    expect(isFirebaseError({ code: "functions/internal" })).toBe(false);

    const plain = new Error("z");
    expect(isFirebaseError(plain)).toBe(false);
  });

  it("does not throw when given null or non-Error (regression)", () => {
    expect(() => isFirebaseError(null)).not.toThrow();
    expect(() => isFirebaseError(undefined)).not.toThrow();
  });
});
