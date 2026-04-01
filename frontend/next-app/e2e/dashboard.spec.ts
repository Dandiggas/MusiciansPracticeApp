import { test, expect } from '@playwright/test';
import { setFakeAuth, mockDashboardAPIs } from './helpers';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setFakeAuth(page);
    await mockDashboardAPIs(page);
  });

  test('should display dashboard with welcome message', async ({ page }) => {
    await page.goto('/dashboard');

    // Should show the welcome heading
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should display all four instrument cards', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: 'Guitar' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bass' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Drums' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Keys' })).toBeVisible();
  });

  test('should display practice stats', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByText('42.5h')).toBeVisible();
    await expect(page.getByText(/day streak/i)).toBeVisible();
    await expect(page.getByText(/favorite/i)).toBeVisible();
  });

  test('should show weekly goal progress bar', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByText(/weekly goal/i)).toBeVisible();
    await expect(page.getByText('3.2h / 7h')).toBeVisible();
  });

  test('should navigate to practice timer when clicking instrument card', async ({ page }) => {
    await page.goto('/dashboard');

    // Mock the timer page APIs
    await page.route('**/api/v1/timer/active/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ active: false }),
      });
    });

    await page.getByRole('heading', { name: 'Guitar' }).click();
    await expect(page).toHaveURL(/\/practice-timer\?instrument=Guitar/);
  });

  test('should navigate to profile via View history link', async ({ page }) => {
    await page.goto('/dashboard');

    // Mock profile APIs
    await page.route('**/api/v1/current-user/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ username: 'testuser' }),
      });
    });
    await page.route('**/api/v1/', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, body: JSON.stringify([]) });
      } else {
        await route.continue();
      }
    });

    await page.getByText('View history').click();
    await expect(page).toHaveURL(/\/profilepage/);
  });

  test('should show active session banner when session is in progress', async ({ page }) => {
    // Override active session mock
    await page.route('**/api/v1/timer/active/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          active: true,
          session: {
            session_id: 1,
            instrument: 'Guitar',
            started_at: new Date().toISOString(),
            is_paused: false,
          },
        }),
      });
    });

    await page.goto('/dashboard');

    await expect(page.getByText(/session in progress/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /return to session/i })).toBeVisible();
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    // Clear auth by overriding the init script
    await page.addInitScript(() => {
      localStorage.removeItem('token');
    });

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('should show first-time user experience when no sessions', async ({ page }) => {
    // Override stats with zero sessions
    await page.route('**/api/v1/stats/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          total_hours: 0,
          total_sessions: 0,
          week_hours: 0,
          current_streak: 0,
          favorite_instrument: '',
        }),
      });
    });

    await page.goto('/dashboard');

    await expect(page.getByText(/welcome to the shed/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /your practice room/i })).toBeVisible();
  });
});
