import { Page, expect } from '@playwright/test';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/**
 * Set a fake auth token in localStorage so the app treats the user as logged in.
 * For production tests, use loginWithCredentials instead.
 */
export async function setFakeAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'test-token-e2e');
    localStorage.setItem('userId', '1');
  });
}

/**
 * Log in via the UI with real credentials.
 * Used for production e2e tests where API mocking isn't possible.
 */
export async function loginViaUI(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/username/i).fill(username);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /open the shed/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

/**
 * Mock common dashboard API responses so pages load without a real backend.
 */
export async function mockDashboardAPIs(page: Page) {
  await page.route('**/api/v1/stats/', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        total_hours: 42.5,
        total_sessions: 85,
        week_hours: 3.2,
        current_streak: 5,
        favorite_instrument: 'Guitar',
      }),
    });
  });

  await page.route('**/api/v1/timer/active/', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ active: false }),
    });
  });
}

/**
 * Mock profile/session API responses.
 */
export async function mockProfileAPIs(page: Page) {
  await page.route('**/api/v1/current-user/', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({ username: 'testuser', email: 'test@example.com' }),
    });
  });

  await page.route('**/api/v1/', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            session_id: 1,
            display_id: 1,
            user: 1,
            instrument: 'Guitar',
            duration: '00:30:00',
            description: 'Scales practice',
            session_date: new Date().toISOString().split('T')[0],
          },
          {
            session_id: 2,
            display_id: 2,
            user: 1,
            instrument: 'Piano',
            duration: '00:45:00',
            description: 'Chord progressions',
            session_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          },
        ]),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Mock the recommendations API endpoint.
 */
export async function mockRecommendationsAPI(page: Page) {
  await page.route('**/api/v1/recommendations/', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        recommendation: 'Start with 5 minutes of chromatic warm-ups at 60 BPM, then work on the bridge section of your piece focusing on clean chord transitions.',
        cached: false,
      }),
    });
  });
}

/**
 * Mock the registration endpoint.
 */
export async function mockRegistrationAPI(page: Page) {
  await page.route('**/api/v1/dj-rest-auth/registration/', async (route) => {
    await route.fulfill({
      status: 201,
      body: JSON.stringify({ key: 'fake-registration-token-123' }),
    });
  });
}

/**
 * Mock the login endpoint.
 */
export async function mockLoginAPI(page: Page) {
  await page.route('**/api/v1/dj-rest-auth/login/', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.username === 'testuser' && body.password === 'TestPass123!') {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ key: 'fake-login-token-456', user: 1 }),
      });
    } else {
      await route.fulfill({
        status: 400,
        body: JSON.stringify({ non_field_errors: ['Unable to log in with provided credentials.'] }),
      });
    }
  });
}

/**
 * Check if we're running against production (no API mocking available).
 */
export function isProductionTest(): boolean {
  return process.env.TEST_ENV === 'production';
}
