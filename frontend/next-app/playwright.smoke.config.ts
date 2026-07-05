import { defineConfig, devices } from '@playwright/test';

// Smoke config: runs against a REAL stack (no mock server), local or prod.
//   Local: npm run smoke              (expects app on :3000 + Django up)
//   Prod:  BASE_URL=https://<railway-app> SMOKE_USER=... SMOKE_PASS=... npm run smoke
export default defineConfig({
  testDir: './e2e',
  testMatch: 'smoke.spec.ts',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
