/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";

import { Header } from "./Header";

jest.mock("next/navigation", () => ({
  usePathname: () => "/sessions",
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

jest.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "dark",
    setTheme: jest.fn(),
  }),
}));

const mockResponse = (data: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(data),
  }) as unknown as Response;

describe("Header", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("keeps Admin hidden for non-admin users", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse({
        id: 1,
        username: "player",
        name: null,
        email: "player@example.com",
        is_staff: false,
        is_superuser: false,
      })
    ) as typeof fetch;

    render(<Header />);

    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/django/current-user");
    });

    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("shows Admin for staff users after current-user loads", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse({
        id: 2,
        username: "admin",
        name: null,
        email: "admin@example.com",
        is_staff: true,
        is_superuser: false,
      })
    ) as typeof fetch;

    render(<Header />);

    expect(await screen.findByRole("link", { name: "Admin" })).toHaveAttribute(
      "href",
      "/admin"
    );
  });
});
