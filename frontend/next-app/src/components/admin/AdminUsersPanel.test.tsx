/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AdminUsersPanel } from "./AdminUsersPanel";
import { AdminUser } from "@/types/admin";


const mockResponse = (data: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(data),
  }) as unknown as Response;

const user = (overrides: Partial<AdminUser>): AdminUser => ({
  id: 2,
  username: "test-user",
  name: null,
  email: "test@example.com",
  is_active: true,
  is_staff: false,
  is_superuser: false,
  date_joined: "2026-06-08T10:20:00Z",
  last_login: null,
  verified_emails: [{ email: "test@example.com", verified: false }],
  ...overrides,
});

describe("AdminUsersPanel", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("deletes a selected user after confirmation", async () => {
    global.fetch = jest.fn().mockResolvedValue(mockResponse({}, 204)) as typeof fetch;

    render(
      <AdminUsersPanel
        currentUserId={1}
        initialUsers={[
          user({
            id: 1,
            username: "admin",
            email: "admin@example.com",
            is_staff: true,
            is_superuser: true,
            verified_emails: [{ email: "admin@example.com", verified: true }],
          }),
          user({ id: 2, username: "delete-me" }),
        ]}
      />
    );

    expect(screen.getAllByText("delete-me")[0]).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /delete/i })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /confirm/i })[0]);

    await waitFor(() =>
      expect(screen.queryByText("delete-me")).not.toBeInTheDocument()
    );
    expect(global.fetch).toHaveBeenCalledWith("/api/django/admin/users/2/", {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
    });
  });

  it("does not show a delete button for the current user", () => {
    render(
      <AdminUsersPanel
        currentUserId={1}
        initialUsers={[
          user({
            id: 1,
            username: "admin",
            email: "admin@example.com",
            is_staff: true,
            is_superuser: true,
          }),
        ]}
      />
    );

    expect(screen.getAllByText(/current account/i)[0]).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });
});
