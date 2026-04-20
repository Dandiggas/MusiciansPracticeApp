/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import CheckEmailPage from "./page";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockSearchParams = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

describe("CheckEmailPage", () => {
  beforeEach(() => {
    mockedAxios.post.mockReset();
    mockSearchParams.delete("email");
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
    mockedAxios.post.mockResolvedValueOnce({ data: { detail: "ok" } });

    render(<CheckEmailPage />);
    fireEvent.click(screen.getByRole("button", { name: /resend/i }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/dj-rest-auth/registration/resend-email/"),
        { email: "user@example.com" }
      );
    });
  });

  it("shows a success message after a successful resend", async () => {
    mockSearchParams.set("email", "user@example.com");
    mockedAxios.post.mockResolvedValueOnce({ data: { detail: "ok" } });

    render(<CheckEmailPage />);
    fireEvent.click(screen.getByRole("button", { name: /resend/i }));

    await waitFor(() => {
      expect(screen.getByText(/sent/i)).toBeInTheDocument();
    });
  });
});
