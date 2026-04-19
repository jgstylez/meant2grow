import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResetPassword from "./ResetPassword";

const confirmPasswordResetMock = vi.fn();

vi.mock("firebase/auth", async (importOriginal) => {
  const mod = await importOriginal<typeof import("firebase/auth")>();
  return {
    ...mod,
    confirmPasswordReset: (...args: unknown[]) =>
      confirmPasswordResetMock(...args),
  };
});

vi.mock("../services/firebase", () => ({
  auth: {},
}));

vi.mock("../services/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe("Reset password — Firebase Auth (confirmPasswordReset)", () => {
  beforeEach(() => {
    confirmPasswordResetMock.mockReset();
    confirmPasswordResetMock.mockResolvedValue(undefined);
    window.history.replaceState(
      {},
      "",
      "/?oobCode=test-oob-code&mode=resetPassword",
    );
  });

  it("calls confirmPasswordReset with oobCode from the email link", async () => {
    const user = userEvent.setup();
    render(<ResetPassword onNavigate={vi.fn()} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Reset Password/i })).toBeInTheDocument();
    });

    const pwd = "Newpass1";
    const fields = screen.getAllByPlaceholderText(/••••••••/);
    await user.type(fields[0], pwd);
    await user.type(fields[1], pwd);
    await user.click(screen.getByRole("button", { name: /^Reset Password$/i }));

    await waitFor(() => {
      expect(confirmPasswordResetMock).toHaveBeenCalledWith(
        expect.anything(),
        "test-oob-code",
        pwd,
      );
    });
  });
});
