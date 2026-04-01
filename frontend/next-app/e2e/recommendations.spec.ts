import { test, expect } from '@playwright/test';
import { setFakeAuth, mockRecommendationsAPI } from './helpers';

test.describe('Recommendations Page', () => {
  test.beforeEach(async ({ page }) => {
    await setFakeAuth(page);
  });

  test('should display recommendations form', async ({ page }) => {
    await page.goto('/recommendations');

    await expect(page.getByRole('heading', { name: /decide what matters/i })).toBeVisible();
    await expect(page.getByLabel(/instrument/i)).toBeVisible();
    await expect(page.getByLabel(/skill level/i)).toBeVisible();
    await expect(page.getByLabel(/what do you want from this session/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /get recommendation/i })).toBeVisible();
  });

  test('should display goal presets', async ({ page }) => {
    await page.goto('/recommendations');

    await expect(page.getByText('Tighten rhythm and timing')).toBeVisible();
    await expect(page.getByText('Memorize a song section')).toBeVisible();
    await expect(page.getByText('Clean up chord changes')).toBeVisible();
    await expect(page.getByText('Improve improvisation ideas')).toBeVisible();
  });

  test('should fill goals input when clicking a preset', async ({ page }) => {
    await page.goto('/recommendations');

    await page.getByText('Tighten rhythm and timing').click();

    const goalsInput = page.getByLabel(/what do you want from this session/i);
    await expect(goalsInput).toHaveValue('Tighten rhythm and timing');
  });

  test('should submit form and display recommendation', async ({ page }) => {
    await mockRecommendationsAPI(page);

    await page.goto('/recommendations');

    await page.getByLabel(/instrument/i).selectOption('guitar');
    await page.getByLabel(/skill level/i).selectOption('intermediate');
    await page.getByLabel(/what do you want from this session/i).fill('Improve chord transitions');
    await page.getByRole('button', { name: /get recommendation/i }).click();

    await expect(page.getByText(/your practice recommendation/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/chromatic warm-ups/i)).toBeVisible();
  });

  test('should show "Take This Into Practice Session" button after recommendation', async ({ page }) => {
    await mockRecommendationsAPI(page);

    await page.goto('/recommendations');

    await page.getByLabel(/instrument/i).selectOption('guitar');
    await page.getByLabel(/skill level/i).selectOption('beginner');
    await page.getByLabel(/what do you want from this session/i).fill('Learn basic chords');
    await page.getByRole('button', { name: /get recommendation/i }).click();

    await expect(page.getByRole('button', { name: /take this into practice session/i })).toBeVisible({ timeout: 10000 });
  });

  test('should show character count for goals input', async ({ page }) => {
    await page.goto('/recommendations');

    const goalsInput = page.getByLabel(/what do you want from this session/i);
    await goalsInput.fill('Test goal');

    await expect(page.getByText('9/240')).toBeVisible();
  });

  test('should show loading state during recommendation generation', async ({ page }) => {
    // Slow down the API response
    await page.route('**/api/v1/recommendations/', async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ recommendation: 'Test', cached: false }),
      });
    });

    await page.goto('/recommendations');

    await page.getByLabel(/instrument/i).selectOption('drums');
    await page.getByLabel(/skill level/i).selectOption('advanced');
    await page.getByLabel(/what do you want from this session/i).fill('Speed up fills');
    await page.getByRole('button', { name: /get recommendation/i }).click();

    await expect(page.getByText(/generating/i)).toBeVisible();
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('token');
    });

    await page.goto('/recommendations');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
