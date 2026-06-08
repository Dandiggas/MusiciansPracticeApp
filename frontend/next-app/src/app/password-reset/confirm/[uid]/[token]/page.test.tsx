/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import PasswordResetConfirmPage from "./page";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useParams: () => ({ uid: "abc", token: "token-123" }),
  useRouter: () => ({ push: mockPush }),
}));

const mockResponse = (data: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(data),
  }) as unknown as Response;

describe("PasswordResetConfirmPage", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockPush.mockReset();
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse({ detail: "Password has been reset with the new password." })
    ) as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("confirms a password reset", async () => {
    render(<PasswordResetConfirmPage />);

    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: "new-password-123" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "new-password-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save new password/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/django/dj-rest-auth/password/reset/confirm",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            uid: "abc",
            token: "token-123",
            new_password1: "new-password-123",
            new_password2: "new-password-123",
          }),
        })
      );
    });
    expect(await screen.findByText(/password updated/i)).toBeInTheDocument();
  });

  it("shows invalid-link errors", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse({ token: ["Invalid value"] }, 400)
    ) as typeof fetch;

    render(<PasswordResetConfirmPage />);

    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: "new-password-123" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "new-password-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save new password/i }));

    expect(await screen.findByText(/invalid value/i)).toBeInTheDocument();
  });
});
