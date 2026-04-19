import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Authentication from "./Authentication";
import { Role, type User } from "../types";

vi.mock("../services/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockEnsureFirebaseAuthAccount = vi.fn();
const mockCreateFirebaseAuthAccount = vi.fn();

vi.mock("../services/firebaseAuth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../services/firebaseAuth")>();
  return {
    ...mod,
    ensureFirebaseAuthAccount: (...args: unknown[]) =>
      mockEnsureFirebaseAuthAccount(...args),
    createFirebaseAuthAccount: (...args: unknown[]) =>
      mockCreateFirebaseAuthAccount(...args),
  };
});

vi.mock("../services/googleAuth", () => ({
  initializeGoogleAuth: vi.fn().mockResolvedValue(undefined),
  signInWithGoogle: vi.fn(),
}));

vi.mock("firebase/auth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("firebase/auth")>();
  return { ...mod, signOut: vi.fn().mockResolvedValue(undefined) };
});

vi.mock("../services/firebase", () => ({
  auth: { currentUser: null },
}));

const mockFindUserByEmail = vi.fn();
const mockCreateOrganization = vi.fn();
const mockCreateUser = vi.fn();
const mockUpdateOrganization = vi.fn();

vi.mock("../services/database", () => ({
  findUserByEmail: (...args: unknown[]) => mockFindUserByEmail(...args),
  createOrganization: (...args: unknown[]) => mockCreateOrganization(...args),
  createUser: (...args: unknown[]) => mockCreateUser(...args),
  updateOrganization: (...args: unknown[]) => mockUpdateOrganization(...args),
  getOrganizationByCode: vi.fn(),
  getInvitationByToken: vi.fn(),
  getInvitationByEmail: vi.fn(),
  updateInvitation: vi.fn(),
  getOrganization: vi.fn(),
}));

vi.mock("../utils/resolveCanonicalUserId", () => ({
  resolveCanonicalFirestoreUserId: vi
    .fn()
    .mockResolvedValue("canonical-session-id"),
}));

vi.mock("../services/totpService", () => ({
  verifyTotpLogin: vi.fn(),
}));

function emailInput() {
  return screen.getAllByPlaceholderText(/you@example.com/i)[0];
}

function passwordInput() {
  return screen.getAllByPlaceholderText(/••••••••/)[0];
}

describe("Authentication — Firebase Auth flows", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    vi.stubGlobal("google", {} as Record<string, unknown>);
    // mockReset() clears mockResolvedValue; use mockClear() to keep default implementations
    mockEnsureFirebaseAuthAccount.mockClear();
    mockCreateFirebaseAuthAccount.mockClear();
    mockFindUserByEmail.mockClear();
    mockCreateOrganization.mockClear();
    mockCreateUser.mockClear();
    mockUpdateOrganization.mockClear();
    mockEnsureFirebaseAuthAccount.mockResolvedValue("firebase-auth-uid");
    mockCreateFirebaseAuthAccount.mockResolvedValue("firebase-auth-uid");
    mockCreateOrganization.mockResolvedValue("org-new-id");
    mockCreateUser.mockResolvedValue("legacy-user-id");
    mockUpdateOrganization.mockResolvedValue(undefined);
  });

  it("login: finds Firestore user, calls ensureFirebaseAuthAccount, completes session", async () => {
    const loginUser: User = {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      organizationId: "org-1",
      role: Role.MENTOR,
      title: "",
      company: "",
      bio: "",
      skills: [],
      avatar: "",
      createdAt: "",
    };
    mockFindUserByEmail.mockResolvedValue(loginUser);

    const onLogin = vi.fn();
    const user = userEvent.setup();
    render(
      <Authentication
        onLogin={onLogin}
        onNavigate={vi.fn()}
        initialMode="login"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    });

    await user.type(emailInput(), "test@example.com");
    await user.type(passwordInput(), "password123");
    await user.click(screen.getByRole("button", { name: /^Sign In$/i }));

    await waitFor(() => {
      expect(mockEnsureFirebaseAuthAccount).toHaveBeenCalledWith(
        "test@example.com",
        "password123",
        "user-1",
      );
    });

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith(false, false);
    });
  });

  it("org signup: creates org + profile, calls createFirebaseAuthAccount, completes session", async () => {
    mockFindUserByEmail.mockResolvedValue(null);

    const onLogin = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Authentication
        onLogin={onLogin}
        onNavigate={vi.fn()}
        initialMode="org-signup"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Start Your Program/i)).toBeInTheDocument();
    });

    const form = container.querySelector("form");
    expect(form).toBeTruthy();
    // Labels are not wired with htmlFor; target inputs by placeholder / type
    const nameInput = form!.querySelector<HTMLInputElement>(
      'input[placeholder="John Doe"]',
    );
    const orgInput = form!.querySelector<HTMLInputElement>(
      'input[placeholder="My Company Inc."]',
    );
    const emailEl = form!.querySelector<HTMLInputElement>('input[type="email"]');
    const passEl = form!.querySelector<HTMLInputElement>(
      'input[type="password"]',
    );
    expect(nameInput && orgInput && emailEl && passEl).toBeTruthy();

    await user.type(nameInput!, "Admin Name");
    await user.type(orgInput!, "Acme Org");
    await user.type(emailEl!, "admin@acme.com");
    await user.type(passEl!, "SecurePass1");
    await user.click(
      screen.getByRole("button", { name: /Create Organization/i }),
    );

    await waitFor(() => {
      expect(mockCreateOrganization).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockCreateFirebaseAuthAccount).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith(true, false);
    });
  });
});
