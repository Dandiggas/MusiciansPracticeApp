/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RegisterPage from "./RegisterPage";

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

describe("RegisterPage", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockPush.mockReset();
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse({ detail: "Verification e-mail sent." })
    ) as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  const fillValidForm = () => {
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: "newuser" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "new@example.com" },
    });
    const passwordInputs = screen.getAllByLabelText(/password/i);
    fireEvent.change(passwordInputs[0], {
      target: { value: "StrongPass123!" },
    });
    fireEvent.change(passwordInputs[1], {
      target: { value: "StrongPass123!" },
    });
  };

  it("posts registration through the local Django proxy", async () => {
    render(<RegisterPage />);
    fillValidForm();

    fireEvent.click(screen.getByRole("button", { name: /create.*account/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/django/dj-rest-auth/registration/",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            username: "newuser",
            email: "new@example.com",
            password1: "StrongPass123!",
            password2: "StrongPass123!",
          }),
        })
      );
    });
  });

  it("on successful registration, redirects to /auth/check-email with the email", async () => {
    render(<RegisterPage />);
    fillValidForm();

    fireEvent.click(screen.getByRole("button", { name: /create.*account/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("/auth/check-email?email=new%40example.com")
      );
    });
  });

  it("shows a visible server error instead of silently failing", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse({ email: ["Enter a valid email address."] }, 400)
    ) as typeof fetch;

    render(<RegisterPage />);
    fillValidForm();

    fireEvent.click(screen.getByRole("button", { name: /create.*account/i }));

    await waitFor(() => {
      expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();
    });
  });
});
