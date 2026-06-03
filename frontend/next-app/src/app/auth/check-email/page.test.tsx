/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CheckEmailPage from "./page";

const mockResponse = (data: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(data),
  }) as unknown as Response;

const mockSearchParams = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

describe("CheckEmailPage", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockSearchParams.delete("email");
    global.fetch = jest.fn().mockResolvedValue(mockResponse({ detail: "ok" })) as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("renders the email address from search params", () => {
    mockSearchParams.set("email", "user@example.com");
    render(<CheckEmailPage />);
    expect(screen.getByText(/user@example\.com/i)).toBeInTheDocument();
  });

  it("renders a fallback message when email param is missing", () => {
    render(<CheckEmailPage />);
    expect(screen.getByText(/check your email/i)).toBeInTheDocument();
  });

  it("resend button POSTs to /registration/resend-email/ with the email", async () => {
    mockSearchParams.set("email", "user@example.com");

    render(<CheckEmailPage />);
    fireEvent.click(screen.getByRole("button", { name: /resend/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/django/dj-rest-auth/registration/resend-email/"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "user@example.com" }),
        })
      );
    });
  });

  it("shows a success message after a successful resend", async () => {
    mockSearchParams.set("email", "user@example.com");

    render(<CheckEmailPage />);
    fireEvent.click(screen.getByRole("button", { name: /resend/i }));

    await waitFor(() => {
      expect(screen.getByText(/sent/i)).toBeInTheDocument();
    });
  });
});
