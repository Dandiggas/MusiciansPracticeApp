import { test, expect } from '@playwright/test';
import { mockLoginAPI, mockRegistrationAPI, mockDashboardAPIs } from './helpers';

test.describe('Registration', () => {
  test('should display registration form', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByText(/join the shed/i)).toBeVisible();
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.locator('#password1')).toBeVisible();
    await expect(page.locator('#password2')).toBeVisible();
    await expect(page.getByRole('button', { name: /register/i })).toBeVisible();
  });

  test('should show validation error for mismatched passwords', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel(/username/i).fill('testuser');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.locator('#password1').fill('TestPass123!');
    await page.getByLabel(/confirm password/i).fill('DifferentPass!');
    await page.getByRole('button', { name: /register/i }).click();

    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test('should show validation error for short password', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel(/username/i).fill('testuser');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.locator('#password1').fill('short');
    await page.getByLabel(/confirm password/i).fill('short');
    await page.getByRole('button', { name: /register/i }).click();

    await expect(page.getByText(/password must be at least 6 characters/i)).toBeVisible();
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel(/username/i).fill('testuser');
    await page.getByLabel(/email/i).fill('not-an-email');
    await page.locator('#password1').fill('TestPass123!');
    await page.getByLabel(/confirm password/i).fill('TestPass123!');
    await page.getByRole('button', { name: /register/i }).click();

    await expect(page.getByText(/email is not valid/i)).toBeVisible();
  });

  test('should register successfully and redirect to login', async ({ page }) => {
    await mockRegistrationAPI(page);

    await page.goto('/register');

    await page.getByLabel(/username/i).fill('newuser');
    await page.getByLabel(/email/i).fill('new@example.com');
    await page.locator('#password1').fill('TestPass123!');
    await page.getByLabel(/confirm password/i).fill('TestPass123!');
    await page.getByRole('button', { name: /register/i }).click();

    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('should have link to sign in page', async ({ page }) => {
    await page.goto('/register');

    const signInLink = page.getByRole('link', { name: /sign in/i });
    await expect(signInLink).toBeVisible();
    await signInLink.click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Login', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText(/return to the shed/i)).toBeVisible();
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /open the shed/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await mockLoginAPI(page);

    await page.goto('/login');

    await page.getByLabel(/username/i).fill('wronguser');
    await page.getByLabel(/password/i).fill('wrongpass');
    await page.getByRole('button', { name: /open the shed/i }).click();

    await expect(page.getByText(/invalid username or password/i)).toBeVisible({ timeout: 10000 });
  });

  test('should login successfully and redirect to dashboard', async ({ page }) => {
    await mockLoginAPI(page);
    await mockDashboardAPIs(page);

    await page.goto('/login');

    await page.getByLabel(/username/i).fill('testuser');
    await page.getByLabel(/password/i).fill('TestPass123!');
    await page.getByRole('button', { name: /open the shed/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should have link to create account', async ({ page }) => {
    await page.goto('/login');

    const createAccountLink = page.getByRole('link', { name: /create account/i });
    await expect(createAccountLink).toBeVisible();
    await createAccountLink.click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('should redirect to dashboard if already logged in', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'existing-token');
    });
    await mockDashboardAPIs(page);

    await page.goto('/login');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });
});
