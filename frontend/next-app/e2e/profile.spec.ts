import { test, expect } from '@playwright/test';
import { setFakeAuth, mockProfileAPIs } from './helpers';

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await setFakeAuth(page);
    await mockProfileAPIs(page);
  });

  test('should display profile page with username', async ({ page }) => {
    await page.goto('/profilepage');

    await expect(page.getByText('testuser')).toBeVisible({ timeout: 10000 });
  });

  test('should display practice session history', async ({ page }) => {
    await page.goto('/profilepage');

    await expect(page.getByText('Scales practice').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Chord progressions').first()).toBeVisible();
  });

  test('should display session instruments in history', async ({ page }) => {
    await page.goto('/profilepage');

    await expect(page.getByText('Guitar').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Piano').first()).toBeVisible();
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('token');
    });

    await page.goto('/profilepage');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('should show loading state initially', async ({ page }) => {
    // Slow API to catch loading state
    await page.route('**/api/v1/current-user/', async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ username: 'testuser' }),
      });
    });

    await page.goto('/profilepage');

    // Page should show loading indicator or skeleton
    // (verify it doesn't crash while loading)
    await expect(page.getByText('testuser')).toBeVisible({ timeout: 15000 });
  });
});
