import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPassword from "./ForgotPassword";
import { findUserByEmail } from "../services/database";
import { Role, type User } from "../types";

vi.mock("../services/database", () => ({
  findUserByEmail: vi.fn(),
}));

vi.mock("../services/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../services/cloudFunctionsUrl", () => ({
  getCloudFunctionUrl: vi.fn(() => "https://example.test/forgotPassword"),
}));

const mockFindUserByEmail = vi.mocked(findUserByEmail);

/** RTL + jsdom can surface duplicate nodes for the same visible field; use the first match. */
function emailField() {
  return screen.getAllByPlaceholderText(/you@example.com/i)[0];
}

function sendResetButton() {
  return screen.getAllByRole("button", { name: /send reset link/i })[0];
}

const minimalUser: User = {
  id: "user-1",
  name: "Test User",
  email: "found@example.com",
  organizationId: "org-1",
  role: Role.MENTOR,
  title: "",
  company: "",
  bio: "",
  skills: [],
  avatar: "",
  createdAt: "",
};

describe("ForgotPassword", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    mockFindUserByEmail.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows validation error when email is empty", async () => {
    const { container } = render(<ForgotPassword onNavigate={vi.fn()} onBack={vi.fn()} />);
    const form = container.querySelector("form");
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(
        screen.getByText(/please enter your email address/i),
      ).toBeInTheDocument();
    });
    expect(mockFindUserByEmail).not.toHaveBeenCalled();
  });

  it("shows success without calling fetch when email is not registered", async () => {
    mockFindUserByEmail.mockResolvedValue(null);
    const user = userEvent.setup();
    render(<ForgotPassword onNavigate={vi.fn()} onBack={vi.fn()} />);

    await user.type(emailField(), "missing@example.com");
    await user.click(sendResetButton());

    await waitFor(() => {
      expect(screen.getAllByText(/check your email/i)[0]).toBeInTheDocument();
    });
    expect(mockFindUserByEmail).toHaveBeenCalledWith("missing@example.com");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls forgot-password function and shows success when user exists and API succeeds", async () => {
    mockFindUserByEmail.mockResolvedValue(minimalUser);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const user = userEvent.setup();
    render(<ForgotPassword onNavigate={vi.fn()} onBack={vi.fn()} />);

    await user.type(emailField(), "found@example.com");
    await user.click(sendResetButton());

    await waitFor(() => {
      expect(screen.getAllByText(/check your email/i)[0]).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/forgotPassword",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "found@example.com" }),
      }),
    );
  });

  it("shows API error when user exists but forgot-password returns non-OK", async () => {
    mockFindUserByEmail.mockResolvedValue(minimalUser);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Rate limited" }),
    });

    const user = userEvent.setup();
    render(<ForgotPassword onNavigate={vi.fn()} onBack={vi.fn()} />);

    await user.type(emailField(), "found@example.com");
    await user.click(sendResetButton());

    await waitFor(() => {
      expect(screen.getAllByText(/rate limited/i)[0]).toBeInTheDocument();
    });
  });

  it("shows success when lookup throws (does not reveal system errors)", async () => {
    mockFindUserByEmail.mockRejectedValue(new Error("Firestore unavailable"));

    const user = userEvent.setup();
    render(<ForgotPassword onNavigate={vi.fn()} onBack={vi.fn()} />);

    await user.type(emailField(), "any@example.com");
    await user.click(sendResetButton());

    await waitFor(() => {
      expect(screen.getAllByText(/check your email/i)[0]).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
