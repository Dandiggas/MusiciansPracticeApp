/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./LoginPage";

const mockResponse = (data: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(data),
  }) as unknown as Response;

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), prefetch: jest.fn() }),
}));

describe("LoginPage - unverified-account path", () => {
  const originalFetch = global.fetch;
  let loginResponses: Response[];
  let resendResponses: Response[];

  beforeEach(() => {
    loginResponses = [];
    resendResponses = [];
    mockPush.mockReset();
    window.localStorage.clear();
    global.fetch = jest.fn((input) => {
      const url = String(input);
      if (url === "/api/django/sessions") {
        return Promise.resolve(mockResponse({}, 401));
      }
      if (url === "/api/auth/login") {
        return Promise.resolve(
          loginResponses.shift() ?? mockResponse({}, 500)
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

  const unverifiedLoginResponse = () =>
    mockResponse({ non_field_errors: ["E-mail is not verified."] }, 400);

  const submitLogin = async () => {
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: "unverified@example.com" },
    });
    fireEvent.change(screen.getAllByLabelText(/password/i)[0], {
      target: { value: "anything" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /sign.*in|log.*in|open.*shed/i })
    );
  };

  it("on unverified-error response, shows an inline banner about verification", async () => {
    loginResponses.push(unverifiedLoginResponse());

    render(<LoginPage />);
    await submitLogin();

    await waitFor(() =>
      expect(screen.getByText(/email.*isn.t verified/i)).toBeInTheDocument()
    );
  });

  it("auto-fires a resend exactly once when unverified banner appears", async () => {
    loginResponses.push(unverifiedLoginResponse(), unverifiedLoginResponse());
    resendResponses.push(mockResponse({ detail: "ok" }));

    render(<LoginPage />);
    await submitLogin();

    await waitFor(() => {
      const resendCalls = (global.fetch as jest.Mock).mock.calls.filter((c) =>
        String(c[0]).includes("resend-email")
      );
      expect(resendCalls).toHaveLength(1);
      expect(JSON.parse(String(resendCalls[0][1].body))).toEqual({
        email: "unverified@example.com",
      });
    });

    await submitLogin();

    await waitFor(() => {
      const resendCalls = (global.fetch as jest.Mock).mock.calls.filter((c) =>
        String(c[0]).includes("resend-email")
      );
      expect(resendCalls).toHaveLength(1);
    });
  });

  it("manual resend button fires another /resend-email/ call on demand", async () => {
    loginResponses.push(unverifiedLoginResponse());
    resendResponses.push(mockResponse({ detail: "ok" }), mockResponse({ detail: "ok" }));

    render(<LoginPage />);
    await submitLogin();

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /resend/i })
      ).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: /resend/i }));

    await waitFor(() => {
      const resendCalls = (global.fetch as jest.Mock).mock.calls.filter((c) =>
        String(c[0]).includes("resend-email")
      );
      expect(resendCalls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
