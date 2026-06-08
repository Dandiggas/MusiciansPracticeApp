/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AccountSettingsPanel } from "./AccountSettingsPanel";

const mockReplace = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    refresh: mockRefresh,
  }),
}));

const currentUser = {
  id: 7,
  username: "player",
  name: "",
  email: "player@example.com",
};

const mockResponse = (data: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(data),
  }) as unknown as Response;

describe("AccountSettingsPanel", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockReplace.mockReset();
    mockRefresh.mockReset();
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse({ detail: "New password has been saved." })
    ) as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  function fillForm() {
    fireEvent.change(screen.getByLabelText(/^current password$/i), {
      target: { value: "old-password-123" },
    });
    fireEvent.change(screen.getByLabelText(/^new password$/i), {
      target: { value: "new-password-123" },
    });
    fireEvent.change(screen.getByLabelText(/^confirm new password$/i), {
      target: { value: "new-password-123" },
    });
  }

  it("posts password changes through the Django proxy", async () => {
    render(<AccountSettingsPanel currentUser={currentUser} />);
    fillForm();

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/django/dj-rest-auth/password/change",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            old_password: "old-password-123",
            new_password1: "new-password-123",
            new_password2: "new-password-123",
          }),
        })
      );
    });
    expect(await screen.findByText(/password updated/i)).toBeInTheDocument();
  });

  it("shows backend errors", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse(
        { old_password: ["Your old password was entered incorrectly."] },
        400
      )
    ) as typeof fetch;

    render(<AccountSettingsPanel currentUser={currentUser} />);
    fillForm();

    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    expect(
      await screen.findByText(/old password was entered incorrectly/i)
    ).toBeInTheDocument();
  });

  it("lets users reveal and hide password fields", () => {
    render(<AccountSettingsPanel currentUser={currentUser} />);

    const currentPassword = screen.getByLabelText(/^current password$/i);
    expect(currentPassword).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: /^show current password$/i }));
    expect(currentPassword).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: /^hide current password$/i }));
    expect(currentPassword).toHaveAttribute("type", "password");
  });

  it("requires confirmation before deleting an account", async () => {
    render(<AccountSettingsPanel currentUser={currentUser} />);

    fireEvent.click(screen.getByRole("button", { name: /^delete account$/i }));

    expect(screen.getByText(/click again to permanently delete/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /^delete permanently$/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/django/account",
        expect.objectContaining({ method: "DELETE" })
      );
    });
    expect(mockReplace).toHaveBeenCalledWith("/login");
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("shows account delete errors", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse({ detail: "Could not delete account." }, 500)
    ) as typeof fetch;

    render(<AccountSettingsPanel currentUser={currentUser} />);

    fireEvent.click(screen.getByRole("button", { name: /^delete account$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^delete permanently$/i }));

    expect(await screen.findByText(/could not delete account/i)).toBeInTheDocument();
  });
});
