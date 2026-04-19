import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPassword from "./ForgotPassword";
import { sendFirebasePasswordResetEmail } from "../services/firebaseAuth";

vi.mock("../services/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../services/firebaseAuth", () => ({
  sendFirebasePasswordResetEmail: vi.fn(),
}));

const mockSendFirebasePasswordResetEmail = vi.mocked(sendFirebasePasswordResetEmail);

/** RTL + jsdom can surface duplicate nodes for the same visible field; use the first match. */
function emailField() {
  return screen.getAllByPlaceholderText(/you@example.com/i)[0];
}

function sendResetButton() {
  return screen.getAllByRole("button", { name: /send reset link/i })[0];
}

describe("Forgot password — Firebase Auth (sendPasswordResetEmail)", () => {
  beforeEach(() => {
    mockSendFirebasePasswordResetEmail.mockReset();
    mockSendFirebasePasswordResetEmail.mockResolvedValue(undefined);
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
    expect(mockSendFirebasePasswordResetEmail).not.toHaveBeenCalled();
  });

  it("calls Firebase Auth sendPasswordResetEmail and shows success", async () => {
    const user = userEvent.setup();
    render(<ForgotPassword onNavigate={vi.fn()} onBack={vi.fn()} />);

    await user.type(emailField(), "missing@example.com");
    await user.click(sendResetButton());

    await waitFor(() => {
      expect(screen.getAllByText(/check your email/i)[0]).toBeInTheDocument();
    });
    expect(mockSendFirebasePasswordResetEmail).toHaveBeenCalledWith(
      "missing@example.com",
    );
  });

  it("normalizes email to lowercase before sending", async () => {
    const user = userEvent.setup();
    render(<ForgotPassword onNavigate={vi.fn()} onBack={vi.fn()} />);

    await user.type(emailField(), "Found@Example.COM");
    await user.click(sendResetButton());

    await waitFor(() => {
      expect(screen.getAllByText(/check your email/i)[0]).toBeInTheDocument();
    });

    expect(mockSendFirebasePasswordResetEmail).toHaveBeenCalledWith(
      "found@example.com",
    );
  });

  it("shows API error when Firebase rejects", async () => {
    mockSendFirebasePasswordResetEmail.mockRejectedValue({
      code: "auth/too-many-requests",
      message: "Throttled",
    });

    const user = userEvent.setup();
    render(<ForgotPassword onNavigate={vi.fn()} onBack={vi.fn()} />);

    await user.type(emailField(), "found@example.com");
    await user.click(sendResetButton());

    await waitFor(() => {
      expect(screen.getAllByText(/too many attempts/i)[0]).toBeInTheDocument();
    });
  });
});
