import type { Page } from '@playwright/test';

// Mock API responses for endpoints that depend on the Models worker.
export async function mockModelExecutions(page: Page) {
  const baseUrl = 'http://localhost:3000';
  const executionId = '018f1d8a-54d7-7d63-a1ee-5e9a6adca701';

  // Model endpoints (ask, summarize, translate, extract-entities, etc.)
  await page.route(`${baseUrl}/model/**`, async (route) => {
    const url = route.request().url();

    if (url.includes('/model/ask')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ executionId }),
      });
    } else {
      // summarize, translate, extract-entities, key-points, keywords
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
  });

  // Dataset analysis (calls models internally)
  await page.route(`${baseUrl}/datasets/*/analyze-schema`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ fields: [] }),
    });
  });

  await page.route(`${baseUrl}/datasets/*/stats`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ result: {} }),
    });
  });
}
