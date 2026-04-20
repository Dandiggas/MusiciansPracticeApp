/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios, { AxiosError } from "axios";
import LoginPage from "./LoginPage";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), prefetch: jest.fn() }),
}));

describe("LoginPage — unverified-account path", () => {
  beforeEach(() => {
    mockedAxios.post.mockReset();
    mockedAxios.isAxiosError.mockImplementation(
      (err): err is AxiosError => Boolean(err && (err as any).isAxiosError)
    );
    mockPush.mockReset();
    window.localStorage.clear();
  });

  const submitLogin = async () => {
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: "unverified@example.com" },
    });
    fireEvent.change(screen.getAllByLabelText(/password/i)[0], {
      target: { value: "anything" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign.*in|log.*in|open.*shed/i }));
  };

  it("on unverified-error response, shows an inline banner about verification", async () => {
    mockedAxios.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 400,
        data: { non_field_errors: ["E-mail is not verified."] },
      },
    });

    render(<LoginPage />);
    await submitLogin();

    await waitFor(() =>
      expect(screen.getByText(/email.*isn.t verified/i)).toBeInTheDocument()
    );
  });

  it("auto-fires a resend exactly once when unverified banner appears", async () => {
    // First call: login with 400 unverified.
    mockedAxios.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 400,
        data: { non_field_errors: ["E-mail is not verified."] },
      },
    });
    // Second call: auto-resend succeeds.
    mockedAxios.post.mockResolvedValueOnce({ data: { detail: "ok" } });

    render(<LoginPage />);
    await submitLogin();

    await waitFor(() => {
      const resendCalls = mockedAxios.post.mock.calls.filter((c) =>
        String(c[0]).includes("resend-email")
      );
      expect(resendCalls).toHaveLength(1);
      expect(resendCalls[0][1]).toEqual({ email: "unverified@example.com" });
    });

    // Second submission with the same unverified response must NOT re-fire
    // the auto-resend. Manual resend button still available (tested below).
    mockedAxios.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 400,
        data: { non_field_errors: ["E-mail is not verified."] },
      },
    });
    await submitLogin();

    await waitFor(() => {
      const resendCalls = mockedAxios.post.mock.calls.filter((c) =>
        String(c[0]).includes("resend-email")
      );
      expect(resendCalls).toHaveLength(1); // still 1, no double-fire
    });
  });

  it("manual resend button fires another /resend-email/ call on demand", async () => {
    mockedAxios.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 400,
        data: { non_field_errors: ["E-mail is not verified."] },
      },
    });
    mockedAxios.post.mockResolvedValueOnce({ data: { detail: "ok" } });

    render(<LoginPage />);
    await submitLogin();

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /resend/i })
      ).toBeInTheDocument()
    );

    mockedAxios.post.mockResolvedValueOnce({ data: { detail: "ok" } });
    fireEvent.click(screen.getByRole("button", { name: /resend/i }));

    await waitFor(() => {
      const resendCalls = mockedAxios.post.mock.calls.filter((c) =>
        String(c[0]).includes("resend-email")
      );
      expect(resendCalls.length).toBeGreaterThanOrEqual(2); // auto + manual
    });
  });
});
