/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import VerifyPage from "./page";

const mockResponse = (data: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(data),
  }) as unknown as Response;

const mockPush = jest.fn();
let mockKey = "test-key-123";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ key: mockKey }),
}));

describe("VerifyPage", () => {
  const originalFetch = global.fetch;
  let verifyResponses: Response[];
  let resendResponses: Response[];

  beforeEach(() => {
    verifyResponses = [];
    resendResponses = [];
    mockKey = "test-key-123";
    mockPush.mockReset();
    global.fetch = jest.fn((input) => {
      const url = String(input);
      if (url === "/api/auth/verify-and-login") {
        return Promise.resolve(
          verifyResponses.shift() ??
            mockResponse({ key: "tok-abc", user: 42 })
        );
      }
      if (url.includes("resend-email")) {
        return Promise.resolve(
          resendResponses.shift() ??
            mockResponse({ detail: "ok" })
        );
      }
      return Promise.resolve(mockResponse({}, 404));
    }) as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("on 200 success, redirects to /sessions", async () => {
    render(<VerifyPage />);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/sessions"));
  });

  it("trims whitespace before posting the verification key", async () => {
    mockKey = " test-key-123 ";

    render(<VerifyPage />);

    await waitFor(() => {
      const verifyCall = (global.fetch as jest.Mock).mock.calls.find(
        (call) => call[0] === "/api/auth/verify-and-login"
      );
      expect(verifyCall).toBeDefined();
      expect(JSON.parse(String(verifyCall?.[1].body))).toEqual({
        key: "test-key-123",
      });
    });
  });

  it("on 410 expired, renders expired state with resend affordance", async () => {
    verifyResponses.push(
      mockResponse({ detail: "expired_key" }, 410)
    );
    render(<VerifyPage />);

    await waitFor(() =>
      expect(screen.getByText(/link has expired/i)).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /send.*new.*link/i })).toBeInTheDocument();
  });

  it("on 404 invalid, renders invalid state with resend form", async () => {
    verifyResponses.push(
      mockResponse({ detail: "invalid_key" }, 404)
    );
    render(<VerifyPage />);

    await waitFor(() =>
      expect(screen.getByText(/isn.t valid/i)).toBeInTheDocument()
    );
  });

  it("on 409 already-verified, renders login link", async () => {
    verifyResponses.push(
      mockResponse({ detail: "already_verified" }, 409)
    );
    render(<VerifyPage />);

    await waitFor(() =>
      expect(screen.getByText(/already verified/i)).toBeInTheDocument()
    );
    expect(screen.getByRole("link", { name: /go to login/i })).toHaveAttribute(
      "href",
      "/login"
    );
  });

  it("expired state's resend form POSTs to /registration/resend-email/ with entered email", async () => {
    verifyResponses.push(
      mockResponse({ detail: "expired_key" }, 410)
    );
    resendResponses.push(mockResponse({ detail: "ok" }));

    render(<VerifyPage />);

    await waitFor(() =>
      expect(screen.getByText(/link has expired/i)).toBeInTheDocument()
    );

    const input = screen.getByLabelText(/email/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "user@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send.*new.*link/i }));

    await waitFor(() => {
      const resendCall = (global.fetch as jest.Mock).mock.calls.find((c) =>
        String(c[0]).includes("resend-email")
      );
      expect(resendCall).toBeDefined();
      expect(JSON.parse(String(resendCall?.[1].body))).toEqual({
        email: "user@example.com",
      });
    });
  });
});
