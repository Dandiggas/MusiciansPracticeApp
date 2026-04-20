/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import RegisterPage from "./RegisterPage";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), prefetch: jest.fn() }),
}));

describe("RegisterPage", () => {
  beforeEach(() => {
    mockedAxios.post.mockReset();
    mockPush.mockReset();
  });

  it("on successful registration, redirects to /auth/check-email with the email", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { detail: "Verification e-mail sent." } });

    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: "newuser" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "new@example.com" } });
    const passwordInputs = screen.getAllByLabelText(/password/i);
    fireEvent.change(passwordInputs[0], { target: { value: "StrongPass123!" } });
    fireEvent.change(passwordInputs[1], { target: { value: "StrongPass123!" } });

    fireEvent.click(screen.getByRole("button", { name: /create.*account|sign.*up|register/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("/auth/check-email?email=new%40example.com")
      );
    });
  });
});
