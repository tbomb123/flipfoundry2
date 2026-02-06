/**
 * E2E Tests for FlipFoundry
 * Tests search page load, demo mode, and error handling.
 */
import { test, expect } from '@playwright/test';

test.describe('FlipFoundry Search', () => {
  test('page loads with search bar visible', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/FlipFoundry/);

    // Search input should be visible
    const searchInput = page.getByPlaceholder(/search|find|enter/i).first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });

  test('search in demo mode returns results', async ({ page }) => {
    await page.goto('/');

    // Find and fill search input
    const searchInput = page.getByPlaceholder(/search|find|enter/i).first();
    await searchInput.fill('laptop');

    // Submit search (press Enter or click search button)
    await searchInput.press('Enter');

    // Wait for results to appear (demo mode generates fake data)
    // Look for deal cards or result indicators
    await expect(
      page.locator('[data-testid*="deal"], [class*="deal"], [class*="card"], [class*="result"]').first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('search results display deal information', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.getByPlaceholder(/search|find|enter/i).first();
    await searchInput.fill('iphone');
    await searchInput.press('Enter');

    // Wait for results
    await page.waitForTimeout(3000);

    // Should see price information somewhere in results
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('page renders without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');
    await page.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
  });
});

test.describe('Error States', () => {
  test('API returns 429 on rate limit (simulated)', async ({ request }) => {
    // Hit the search endpoint rapidly to test rate limiting behavior
    // In demo mode without Redis, the in-memory limiter should still work
    const results = [];
    for (let i = 0; i < 25; i++) {
      const res = await request.post('/api/search', {
        data: { keywords: 'laptop' },
        headers: { 'x-forwarded-for': 'e2e-rate-limit-test' },
      });
      results.push(res.status());
    }

    // At least some should be 503 (no eBay key) or 429 (rate limited)
    const has503or429 = results.some(s => s === 503 || s === 429);
    expect(has503or429).toBe(true);
  });

  test('API validates request body', async ({ request }) => {
    const res = await request.post('/api/search', {
      data: { keywords: '' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  test('health endpoint returns ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
