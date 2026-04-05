import { test, expect } from '@playwright/test';
import { setFakeAuth, mockDashboardAPIs } from './helpers';

const MOCK_SHEET_MUSIC = [
  {
    id: 1,
    title: 'All of Me - Lead Sheet',
    file: '/media/sheet_music/1/abc.pdf',
    file_size: 1240000,
    page_count: 8,
    file_hash: 'a'.repeat(64),
    last_page_viewed: 3,
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-04-05T14:00:00Z',
  },
  {
    id: 2,
    title: 'Autumn Leaves - Real Book',
    file: '/media/sheet_music/1/def.pdf',
    file_size: 340000,
    page_count: 2,
    file_hash: 'b'.repeat(64),
    last_page_viewed: 1,
    created_at: '2026-04-02T10:00:00Z',
    updated_at: '2026-04-04T14:00:00Z',
  },
];

/**
 * Mock sheet music API endpoints.
 */
async function mockSheetMusicAPIs(page: import('@playwright/test').Page) {
  // List
  await page.route('**/api/v1/sheet-music/', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(MOCK_SHEET_MUSIC),
      });
    } else if (route.request().method() === 'POST') {
      // Upload
      await route.fulfill({
        status: 201,
        body: JSON.stringify({
          id: 3,
          title: 'New Upload',
          file: '/media/sheet_music/1/ghi.pdf',
          file_size: 500000,
          page_count: 4,
          file_hash: 'c'.repeat(64),
          last_page_viewed: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Detail (GET, PATCH, DELETE)
  await page.route('**/api/v1/sheet-music/1/', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        body: JSON.stringify(MOCK_SHEET_MUSIC[0]),
      });
    } else if (route.request().method() === 'PATCH') {
      const body = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ ...MOCK_SHEET_MUSIC[0], ...body }),
      });
    } else if (route.request().method() === 'DELETE') {
      await route.fulfill({ status: 204, body: '' });
    } else {
      await route.continue();
    }
  });

  // File serve
  await page.route('**/api/v1/sheet-music/*/file/', async (route) => {
    // Return a minimal valid PDF (1-page blank)
    // PDF header + minimal structure
    const pdfContent = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF';
    await route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      body: Buffer.from(pdfContent),
    });
  });
}

test.describe('Sheet Music Library', () => {
  test.beforeEach(async ({ page }) => {
    await setFakeAuth(page);
    await mockSheetMusicAPIs(page);
  });

  test('should display library with uploaded sheets', async ({ page }) => {
    await page.goto('/sheet-music');

    // Header
    await expect(page.getByRole('heading', { name: /your library/i })).toBeVisible();

    // Storage bar
    await expect(page.getByText(/storage/i)).toBeVisible();

    // Sheet count
    await expect(page.getByText('2 sheets')).toBeVisible();

    // Sheet cards
    await expect(page.getByText('All of Me - Lead Sheet')).toBeVisible();
    await expect(page.getByText('Autumn Leaves - Real Book')).toBeVisible();

    // Page count and bookmark info
    await expect(page.getByText(/8 pages/)).toBeVisible();
    await expect(page.getByText(/bookmarked p\.3/i)).toBeVisible();
  });

  test('should filter sheets by search', async ({ page }) => {
    await page.goto('/sheet-music');

    const searchInput = page.getByPlaceholder(/search sheets/i);
    await searchInput.fill('autumn');

    await expect(page.getByText('Autumn Leaves - Real Book')).toBeVisible();
    await expect(page.getByText('All of Me - Lead Sheet')).not.toBeVisible();
  });

  test('should show empty state when no sheets', async ({ page }) => {
    // Override with empty response
    await page.route('**/api/v1/sheet-music/', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, body: JSON.stringify([]) });
      } else {
        await route.continue();
      }
    });

    await page.goto('/sheet-music');

    await expect(page.getByText(/no sheet music yet/i)).toBeVisible();
    await expect(page.getByText(/upload your first pdf/i)).toBeVisible();
  });

  test('should navigate to viewer when clicking a card', async ({ page }) => {
    await page.goto('/sheet-music');

    await page.getByText('All of Me - Lead Sheet').click();
    await page.waitForURL('**/sheet-music/1');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    // Clear auth
    await page.addInitScript(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
    });

    await page.goto('/sheet-music');
    await page.waitForURL('**/login');
  });
});

test.describe('Sheet Music Viewer', () => {
  test.beforeEach(async ({ page }) => {
    await setFakeAuth(page);
    await mockSheetMusicAPIs(page);
  });

  test('should display viewer with controls', async ({ page }) => {
    await page.goto('/sheet-music/1');

    // Title (editable input in standalone mode)
    await expect(page.locator('input[value="All of Me - Lead Sheet"]')).toBeVisible();

    // Page nav — should show bookmarked page
    await expect(page.getByText('3 / 8')).toBeVisible();

    // Zoom
    await expect(page.getByText('100%')).toBeVisible();

    // Back button
    await expect(page.getByRole('button', { name: /back to library/i })).toBeVisible();

    // Delete button (standalone mode)
    await expect(page.getByRole('button', { name: /delete/i })).toBeVisible();
  });

  test('should navigate back to library', async ({ page }) => {
    await page.goto('/sheet-music/1');

    await page.getByRole('button', { name: /back to library/i }).click();
    await page.waitForURL('**/sheet-music');
  });
});

test.describe('Sheet Music in Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setFakeAuth(page);
    await mockDashboardAPIs(page);
  });

  test('should show Sheet Music link in header nav', async ({ page }) => {
    await page.goto('/dashboard');

    const navLink = page.getByRole('link', { name: /sheet music/i });
    await expect(navLink).toBeVisible();
  });

  test('should navigate to sheet music page from header', async ({ page }) => {
    await mockSheetMusicAPIs(page);
    await page.goto('/dashboard');

    await page.getByRole('link', { name: /sheet music/i }).click();
    await page.waitForURL('**/sheet-music');
  });
});

test.describe('Sheet Music in Session Setup', () => {
  test.beforeEach(async ({ page }) => {
    await setFakeAuth(page);
    await mockSheetMusicAPIs(page);

    // Mock timer endpoints for practice timer page
    await page.route('**/api/v1/timer/active/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ active: false }),
      });
    });

    await page.route('**/api/v1/', async (route) => {
      if (route.request().method() === 'GET' && route.request().url().endsWith('/api/v1/')) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([]),
        });
      } else {
        await route.continue();
      }
    });
  });

  test('should show Attach PDF button in session setup', async ({ page }) => {
    await page.goto('/practice-timer');

    await expect(page.getByRole('button', { name: /attach pdf/i })).toBeVisible();
  });

  test('should open sheet music picker modal', async ({ page }) => {
    await page.goto('/practice-timer');

    await page.getByRole('button', { name: /attach pdf/i }).click();

    // Modal should appear
    await expect(page.getByRole('heading', { name: /select sheet music/i })).toBeVisible();

    // Should show sheets from library
    await expect(page.getByText('All of Me - Lead Sheet')).toBeVisible();
    await expect(page.getByText('Autumn Leaves - Real Book')).toBeVisible();

    // Should have upload option
    await expect(page.getByRole('button', { name: /upload new pdf/i })).toBeVisible();
  });

  test('should attach sheet music from picker', async ({ page }) => {
    await page.goto('/practice-timer');

    // Open picker
    await page.getByRole('button', { name: /attach pdf/i }).click();

    // Select a sheet
    await page.getByText('All of Me - Lead Sheet').click();

    // Modal should close, sheet should be shown in setup form
    await expect(page.getByRole('heading', { name: /select sheet music/i })).not.toBeVisible();
    await expect(page.getByText('All of Me - Lead Sheet')).toBeVisible();

    // Detach button (✕) should be visible
    await expect(page.getByText('✕')).toBeVisible();
  });

  test('should detach sheet music', async ({ page }) => {
    await page.goto('/practice-timer');

    // Attach
    await page.getByRole('button', { name: /attach pdf/i }).click();
    await page.getByText('All of Me - Lead Sheet').click();

    // Detach
    await page.getByText('✕').click();

    // Should show Attach PDF button again
    await expect(page.getByRole('button', { name: /attach pdf/i })).toBeVisible();
  });
});
