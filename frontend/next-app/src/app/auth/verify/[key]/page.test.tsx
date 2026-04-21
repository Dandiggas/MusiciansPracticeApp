/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import axios, { AxiosError } from "axios";
import VerifyPage from "./page";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ key: "test-key-123" }),
}));

// Map-backed localStorage for round-trip assertions (jest.setup.ts stubs don't persist).
const installRealLocalStorage = () => {
  const store = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    },
    configurable: true,
    writable: true,
  });
};

describe("VerifyPage", () => {
  beforeEach(() => {
    mockedAxios.post.mockReset();
    mockedAxios.isAxiosError.mockImplementation(
      (err): err is AxiosError => Boolean(err && (err as any).isAxiosError)
    );
    mockPush.mockReset();
    installRealLocalStorage();
  });

  it("on 200 success, stores token + userId and redirects to /dashboard", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { key: "tok-abc", user: 42 },
    });
    render(<VerifyPage />);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
    expect(window.localStorage.getItem("token")).toBe("tok-abc");
    expect(window.localStorage.getItem("userId")).toBe("42");
  });

  it("on 410 expired, renders expired state with resend affordance", async () => {
    mockedAxios.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 410, data: { detail: "expired_key" } },
    });
    render(<VerifyPage />);

    await waitFor(() =>
      expect(screen.getByText(/link has expired/i)).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /send.*new.*link/i })).toBeInTheDocument();
  });

  it("on 404 invalid, renders invalid state with resend form", async () => {
    mockedAxios.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404, data: { detail: "invalid_key" } },
    });
    render(<VerifyPage />);

    await waitFor(() =>
      expect(screen.getByText(/isn.t valid/i)).toBeInTheDocument()
    );
  });

  it("on 409 already-verified, renders login link", async () => {
    mockedAxios.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409, data: { detail: "already_verified" } },
    });
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
    mockedAxios.post.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 410, data: { detail: "expired_key" } },
    });
    mockedAxios.post.mockResolvedValueOnce({ data: { detail: "ok" } });

    render(<VerifyPage />);

    await waitFor(() =>
      expect(screen.getByText(/link has expired/i)).toBeInTheDocument()
    );

    const input = screen.getByLabelText(/email/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "user@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send.*new.*link/i }));

    await waitFor(() => {
      const calls = mockedAxios.post.mock.calls;
      const resendCall = calls.find((c) =>
        String(c[0]).includes("resend-email")
      );
      expect(resendCall).toBeDefined();
      expect(resendCall?.[1]).toEqual({ email: "user@example.com" });
    });
  });
});
