import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    {
      name: "practice_auth_token",
      value: "e2e-token",
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
});

test("lists sessions and opens the workbench", async ({ page }) => {
  await page.goto("/sessions");

  await expect(page.getByRole("heading", { name: "Your practice workbench" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Sunday Shed/i })).toBeVisible();

  await page.getByRole("link", { name: /Sunday Shed/i }).click();
  await expect(page).toHaveURL(/\/sessions\/1$/);
  await expect(page.locator('input[value="Sunday Shed"]')).toBeVisible();
  await expect(
    page.locator("[data-track-select-button]", { hasText: "Pocket study" })
  ).toBeVisible();
  await expect(page.getByText("Practice tools")).toBeVisible();
});

test("validates and creates a session", async ({ page }) => {
  await page.goto("/sessions");

  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByText("Give the session a name first.")).toBeVisible();

  await page.getByLabel("New session").fill("New Shed");
  await page.getByRole("button", { name: "Create" }).click();

  await expect(page).toHaveURL(/\/sessions\/2$/);
  await expect(page.locator('input[value="New Shed"]')).toBeVisible();
  await expect(page.getByText("Empty session")).toBeVisible();
});

test("keeps the session page usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/sessions/1");

  await expect(page.locator('input[value="Sunday Shed"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Metronome" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tuner" })).toBeVisible();
});
