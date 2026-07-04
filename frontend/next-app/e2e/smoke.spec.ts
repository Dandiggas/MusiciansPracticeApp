import { expect, test } from "@playwright/test";

// End-to-end smoke against a REAL backend (issue #34).
// Exercises: login → create session → add track → save → delete session.
// Uses a pre-verified account (SMOKE_USER/SMOKE_PASS) so no email flow is needed.

const USER = process.env.SMOKE_USER || "demo";
const PASS = process.env.SMOKE_PASS || "Practice123!";
const SESSION_NAME = `smoke-${Date.now()}`;

test.describe.serial("prod smoke", () => {
  test("login → workbench → track → cleanup", async ({ page }) => {
    // Accept any confirm() dialogs (delete flows)
    page.on("dialog", (d) => d.accept());

    // 1. Login through the real form
    await page.goto("/login");
    await page.getByRole("textbox", { name: /username/i }).fill(USER);
    await page.getByRole("textbox", { name: /password/i }).fill(PASS);
    await page.getByRole("button", { name: /open the shed/i }).click();
    await page.waitForURL(/\/sessions/, { timeout: 20_000 });

    // 2. Create a session
    await page.getByPlaceholder(/kevin bond|session/i).fill(SESSION_NAME);
    await page.getByRole("button", { name: /^create$/i }).click();
    await page.waitForURL(/\/sessions\/\d+/, { timeout: 20_000 });
    await expect(page.locator(`input[value="${SESSION_NAME}"]`).first()).toBeVisible();

    // 3. Add a YouTube track
    await page.getByRole("button", { name: /add track/i }).click();
    await page.getByLabel(/track name|name/i).first().fill("Smoke test track");
    const urlField = page.getByLabel(/youtube/i).or(page.getByPlaceholder(/youtube/i));
    await urlField.first().fill("https://www.youtube.com/watch?v=Yl9rIWmvWmY");
    const addSubmit = page.getByRole("button", { name: /add track|save track|add$/i }).last();
    await addSubmit.click();
    await expect(page.getByText("Smoke test track").first()).toBeVisible({ timeout: 15_000 });

    // 4. Recorder zone mounts (no device assertions in headless)
    await expect(page.getByText(/recorded takes/i)).toBeVisible();

    // 5. Cleanup: delete the session, confirm it's gone
    await page.getByRole("button", { name: /delete session/i }).click();
    await page.waitForURL(/\/sessions$/, { timeout: 20_000 });
    await expect(page.getByText(SESSION_NAME)).toHaveCount(0);
  });
});
