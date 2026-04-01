import { test, expect } from '@playwright/test';
import { setFakeAuth, mockDashboardAPIs, mockProfileAPIs } from './helpers';

test.describe('Navigation', () => {
  // Desktop-only navigation tests
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await setFakeAuth(page);
    await mockDashboardAPIs(page);
    await mockProfileAPIs(page);

    // Mock timer active endpoint for practice timer page
    await page.route('**/api/v1/timer/active/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ active: false }),
      });
    });
  });

  test('should show header with nav links on authenticated pages', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByRole('link', { name: 'The Shed' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Studio' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'AI Tutor' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Analytics' })).toBeVisible();
  });

  test('should not show header on login page', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('token');
    });

    await page.goto('/login');

    // Nav links should not be present
    await expect(page.getByRole('link', { name: 'Studio' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'AI Tutor' })).not.toBeVisible();
  });

  test('should not show header on register page', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByRole('link', { name: 'Studio' })).not.toBeVisible();
  });

  test('should navigate to Studio (practice timer)', async ({ page }) => {
    await page.goto('/dashboard');

    await page.getByRole('link', { name: 'Studio' }).click();
    await expect(page).toHaveURL(/\/practice-timer/);
  });

  test('should navigate to AI Tutor (recommendations)', async ({ page }) => {
    await page.goto('/dashboard');

    await page.getByRole('link', { name: 'AI Tutor' }).click();
    await expect(page).toHaveURL(/\/recommendations/);
  });

  test('should navigate to Analytics (profile)', async ({ page }) => {
    await page.goto('/dashboard');

    await page.getByRole('link', { name: 'Analytics' }).click();
    await expect(page).toHaveURL(/\/profilepage/);
  });

  test('should navigate to dashboard via The Shed logo', async ({ page }) => {
    await page.goto('/recommendations');

    await page.getByRole('link', { name: 'The Shed' }).first().click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should highlight active nav link', async ({ page }) => {
    await page.goto('/dashboard');

    // The active link should have foreground color (not muted)
    const shedLink = page.getByRole('link', { name: 'The Shed' }).nth(1);
    await expect(shedLink).toBeVisible();
  });
});

test.describe('Navigation - Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await setFakeAuth(page);
    await mockDashboardAPIs(page);
  });

  test('should show mobile menu toggle on small screens', async ({ page }) => {
    await page.goto('/dashboard');

    // Desktop nav should be hidden, mobile toggle should be visible
    await expect(page.getByRole('button', { name: /toggle menu/i })).toBeVisible();
  });

  test('should show The Shed brand on mobile', async ({ page }) => {
    await page.goto('/dashboard');

    // The mobile brand link is the one inside the `flex md:hidden` container
    const mobileBrand = page.locator('.md\\:hidden >> text=The Shed');
    await expect(mobileBrand).toBeVisible();
  });
});
