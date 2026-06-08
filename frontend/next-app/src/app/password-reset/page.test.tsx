/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import PasswordResetPage from "./page";

const mockResponse = (data: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(data),
  }) as unknown as Response;

describe("PasswordResetPage", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse({ detail: "Password reset e-mail has been sent." })
    ) as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("requests a password reset email", async () => {
    render(<PasswordResetPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "player@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/django/dj-rest-auth/password/reset/",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "player@example.com" }),
        })
      );
    });
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
  });

  it("shows backend errors", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse({ detail: "Email service unavailable." }, 400)
    ) as typeof fetch;

    render(<PasswordResetPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "player@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText(/email service unavailable/i)).toBeInTheDocument();
  });
});
