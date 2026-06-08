import { defineConfig, devices } from '@playwright/test';

const mockDjangoUrl = 'http://127.0.0.1:8010';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'node e2e/mock-django-server.mjs',
      url: mockDjangoUrl,
      reuseExistingServer: false,
    },
    {
      command: `DJANGO_API_URL=${mockDjangoUrl}/api/v1 npm run dev`,
      url: 'http://localhost:3000',
      reuseExistingServer: false,
    },
  ],
});
