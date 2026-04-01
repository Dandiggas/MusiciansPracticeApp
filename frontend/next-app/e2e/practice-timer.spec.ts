import { test, expect } from '@playwright/test';
import { setFakeAuth } from './helpers';

test.describe('Practice Timer E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setFakeAuth(page);

    // Mock no active session by default
    await page.route('**/api/v1/timer/active/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ active: false }),
      });
    });

    // Mock recent sessions
    await page.route('**/api/v1/', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, body: JSON.stringify([]) });
      } else {
        await route.continue();
      }
    });

    await page.goto('/practice-timer');
  });

  test('should display practice timer page with setup form', async ({ page }) => {
    await expect(page.getByText('New Session')).toBeVisible();
    await expect(page.getByText('00:00:00')).toBeVisible();
    await expect(page.getByText('Ready to start')).toBeVisible();
    await expect(page.getByLabel(/instrument/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /start session/i })).toBeVisible();
  });

  test('should show instrument dropdown with options', async ({ page }) => {
    const instrumentSelect = page.getByLabel(/instrument/i);
    await expect(instrumentSelect).toBeVisible();

    // Check the options exist
    await expect(instrumentSelect.locator('option')).toHaveCount(5); // empty + 4 instruments
  });

  test('should show validation error when starting without instrument', async ({ page }) => {
    await page.getByRole('button', { name: /start session/i }).click();

    await expect(page.getByText(/please enter an instrument/i)).toBeVisible();
  });

  test('complete practice session flow', async ({ page }) => {
    await page.route('**/api/v1/timer/start/', async (route) => {
      await route.fulfill({
        status: 201,
        body: JSON.stringify({
          session_id: 1,
          instrument: 'Guitar',
          description: 'E2E Test Session',
          started_at: new Date().toISOString(),
          in_progress: true,
          is_paused: false,
        }),
      });
    });

    // Fill in the form
    await page.getByLabel(/instrument/i).selectOption('Guitar');
    await page.locator('#description').fill('E2E Test Session');

    // Start the session
    await page.getByRole('button', { name: /start session/i }).click();

    // Verify session started - check for running state indicators
    await expect(page.getByText(/session active/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /pause/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /stop & save/i })).toBeVisible();

    // Wait and check timer is counting
    await page.waitForTimeout(2000);
    await expect(page.getByText(/00:00:0[2-9]/).first()).toBeVisible();
  });

  test('pause and resume functionality', async ({ page }) => {
    // Mock an active session
    await page.route('**/api/v1/timer/active/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          active: true,
          session: {
            session_id: 1,
            instrument: 'Piano',
            description: '',
            started_at: new Date().toISOString(),
            in_progress: true,
            is_paused: false,
          },
        }),
      });
    });

    await page.route('**/api/v1/timer/1/pause/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          session_id: 1,
          instrument: 'Piano',
          in_progress: true,
          is_paused: true,
          paused_at: new Date().toISOString(),
        }),
      });
    });

    await page.route('**/api/v1/timer/1/resume/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          session_id: 1,
          instrument: 'Piano',
          in_progress: true,
          is_paused: false,
          paused_at: null,
        }),
      });
    });

    await page.reload();

    // Verify session is active
    await expect(page.getByRole('button', { name: /pause/i })).toBeVisible({ timeout: 10000 });

    // Pause the session
    await page.getByRole('button', { name: /pause/i }).click();
    await expect(page.getByRole('button', { name: /resume/i })).toBeVisible();

    // Resume the session
    await page.getByRole('button', { name: /resume/i }).click();
    await expect(page.getByRole('button', { name: /pause/i })).toBeVisible();
  });

  test('stop session and redirect to dashboard', async ({ page }) => {
    await page.route('**/api/v1/timer/active/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          active: true,
          session: {
            session_id: 1,
            instrument: 'Drums',
            description: '',
            started_at: new Date().toISOString(),
            in_progress: true,
            is_paused: false,
          },
        }),
      });
    });

    await page.route('**/api/v1/timer/1/stop/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          session_id: 1,
          instrument: 'Drums',
          in_progress: false,
          duration: '00:05:30',
        }),
      });
    });

    // Mock dashboard APIs for redirect target
    await page.route('**/api/v1/stats/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          total_hours: 1, total_sessions: 1, week_hours: 0.1,
          current_streak: 1, favorite_instrument: 'Drums',
        }),
      });
    });

    await page.reload();

    await expect(page.getByRole('button', { name: /stop & save/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /stop & save/i }).click();

    // After stopping, should redirect (dashboard or profile)
    await page.waitForURL(/\/(dashboard|profilepage)/, { timeout: 10000 });
  });

  test('should display session setup fields', async ({ page }) => {
    await expect(page.getByLabel(/instrument/i)).toBeVisible();
    await expect(page.locator('#song-title')).toBeVisible();
    await expect(page.locator('#description')).toBeVisible();
    await expect(page.locator('#notes')).toBeVisible();
  });

  test('should show media source options', async ({ page }) => {
    await expect(page.getByRole('button', { name: /youtube/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /mp3 upload/i })).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();

    await expect(page.getByText('New Session')).toBeVisible();
    await expect(page.getByLabel(/instrument/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /start session/i })).toBeVisible();
  });
});
