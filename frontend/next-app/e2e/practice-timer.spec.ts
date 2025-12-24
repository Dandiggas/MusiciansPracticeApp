import { test, expect } from '@playwright/test';

test.describe('Practice Timer E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock localStorage with a test token
    await page.addInitScript(() => {
      localStorage.setItem('token', 'test-token-e2e');
    });

    // Navigate to practice timer page
    await page.goto('/practice-timer');
  });

  test('should display practice timer page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Practice Timer' })).toBeVisible();
    await expect(page.getByText('Start New Session')).toBeVisible();
    await expect(page.getByText('00:00:00')).toBeVisible();
  });

  test('should show validation error when starting without instrument', async ({ page }) => {
    // Click start button without entering instrument
    await page.getByRole('button', { name: /start practice/i }).click();

    // Should show error message
    await expect(page.getByText(/please enter an instrument/i)).toBeVisible();
  });

  test('complete practice session flow', async ({ page, context }) => {
    // Mock the API responses
    await page.route('**/api/v1/timer/active/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ active: false }),
      });
    });

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
    await page.getByLabel(/instrument/i).fill('Guitar');
    await page.getByLabel(/description/i).fill('E2E Test Session');

    // Start the session
    await page.getByRole('button', { name: /start practice/i }).click();

    // Verify session started
    await expect(page.getByText('Session in Progress')).toBeVisible();
    await expect(page.getByRole('button', { name: /pause/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /stop & save/i })).toBeVisible();

    // Wait a moment and check timer is counting
    await page.waitForTimeout(2000);
    const timerText = await page.locator('text=/00:00:0[2-9]/').textContent();
    expect(timerText).toMatch(/00:00:0[2-9]/);
  });

  test('pause and resume functionality', async ({ page }) => {
    // Mock API for active session
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

    // Mock pause endpoint
    await page.route('**/api/v1/timer/1/pause/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          session_id: 1,
          instrument: 'Piano',
          description: '',
          started_at: new Date().toISOString(),
          in_progress: true,
          is_paused: true,
          paused_at: new Date().toISOString(),
        }),
      });
    });

    // Mock resume endpoint
    await page.route('**/api/v1/timer/1/resume/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          session_id: 1,
          instrument: 'Piano',
          description: '',
          started_at: new Date().toISOString(),
          in_progress: true,
          is_paused: false,
          paused_at: null,
        }),
      });
    });

    // Reload to pick up active session
    await page.reload();

    // Verify session is active
    await expect(page.getByText('Session in Progress')).toBeVisible();

    // Pause the session
    await page.getByRole('button', { name: /pause/i }).click();

    // Verify paused state
    await expect(page.getByText('Session Paused')).toBeVisible();
    await expect(page.getByRole('button', { name: /resume/i })).toBeVisible();

    // Resume the session
    await page.getByRole('button', { name: /resume/i }).click();

    // Verify resumed state
    await expect(page.getByText('Session in Progress')).toBeVisible();
    await expect(page.getByRole('button', { name: /pause/i })).toBeVisible();
  });

  test('stop session and redirect to profile', async ({ page }) => {
    // Mock active session
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

    // Mock stop endpoint
    await page.route('**/api/v1/timer/1/stop/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          session_id: 1,
          instrument: 'Drums',
          description: '',
          started_at: new Date().toISOString(),
          in_progress: false,
          duration: '00:05:30',
        }),
      });
    });

    // Reload to pick up active session
    await page.reload();

    // Stop the session
    await page.getByRole('button', { name: /stop & save/i }).click();

    // Verify redirect to profile page
    await expect(page).toHaveURL('/profilepage');
  });

  test('timer display formatting', async ({ page }) => {
    // Mock a session that started a while ago
    const oneHourAgo = new Date(Date.now() - 3665000).toISOString(); // 1h 1m 5s ago

    await page.route('**/api/v1/timer/active/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          active: true,
          session: {
            session_id: 1,
            instrument: 'Violin',
            description: '',
            started_at: oneHourAgo,
            in_progress: true,
            is_paused: false,
          },
        }),
      });
    });

    await page.reload();

    // Check that time displays with hours, minutes, seconds
    await expect(page.locator('text=/01:01:0[5-9]/')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.route('**/api/v1/timer/active/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ active: false }),
      });
    });

    await page.reload();

    // Verify page is still usable on mobile
    await expect(page.getByRole('heading', { name: 'Practice Timer' })).toBeVisible();
    await expect(page.getByLabel(/instrument/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /start practice/i })).toBeVisible();
  });
});
