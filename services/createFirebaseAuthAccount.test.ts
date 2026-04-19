import { describe, it, expect, vi, beforeEach } from "vitest";

const createUserWithEmailAndPasswordMock = vi.fn();

vi.mock("firebase/auth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("firebase/auth")>();
  return {
    ...mod,
    createUserWithEmailAndPassword: (...args: unknown[]) =>
      createUserWithEmailAndPasswordMock(...args),
  };
});

const setDocMock = vi.fn().mockResolvedValue(undefined);
const getDocMock = vi.fn();
const deleteDocMock = vi.fn().mockResolvedValue(undefined);

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({ path: "users/mock" })),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  deleteDoc: (...args: unknown[]) => deleteDocMock(...args),
  Timestamp: {
    now: () => ({ seconds: 0, nanoseconds: 0 }),
  },
}));

vi.mock("./firebase", () => ({
  auth: {
    currentUser: { uid: "auth-uid-new" },
  },
  db: {},
}));

const updateUserMock = vi.fn().mockResolvedValue(undefined);
const getUserMock = vi.fn().mockResolvedValue(null);

vi.mock("./database", () => ({
  getUser: (...args: unknown[]) => getUserMock(...args),
  updateUser: (...args: unknown[]) => updateUserMock(...args),
}));

import { createFirebaseAuthAccount } from "./firebaseAuth";

describe("createFirebaseAuthAccount (Firebase Auth signup)", () => {
  beforeEach(() => {
    createUserWithEmailAndPasswordMock.mockReset();
    createUserWithEmailAndPasswordMock.mockResolvedValue({
      user: { uid: "auth-uid-new" },
    });
    setDocMock.mockClear();
    getDocMock.mockReset();
    getDocMock.mockResolvedValue({
      exists: () => true,
    });
    deleteDocMock.mockClear();
    updateUserMock.mockClear();
  });

  it("creates Firebase Auth user with createUserWithEmailAndPassword and returns uid", async () => {
    const uid = await createFirebaseAuthAccount(
      "new@example.com",
      "SecurePass1",
      "legacy-profile-id",
      {
        name: "New User",
        email: "new@example.com",
        role: "MENTOR",
        organizationId: "org-1",
        bio: "",
        skills: [],
        avatar: "",
        title: "",
        company: "Co",
      },
    );

    expect(uid).toBe("auth-uid-new");
    expect(createUserWithEmailAndPasswordMock).toHaveBeenCalledWith(
      expect.anything(),
      "new@example.com",
      "SecurePass1",
    );
    expect(setDocMock).toHaveBeenCalled();
    expect(updateUserMock).toHaveBeenCalledWith("legacy-profile-id", {
      firebaseAuthUid: "auth-uid-new",
    });
  });

  it("returns null when canonical Firestore doc is missing after signup", async () => {
    getDocMock.mockResolvedValue({
      exists: () => false,
    });

    const uid = await createFirebaseAuthAccount(
      "x@example.com",
      "SecurePass1",
      "legacy-id",
      {
        name: "X",
        email: "x@example.com",
        role: "MENTOR",
        organizationId: "org-1",
        bio: "",
        skills: [],
        avatar: "",
        title: "",
        company: "",
      },
    );

    expect(uid).toBeNull();
  });
});
