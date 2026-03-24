import type { Page } from '@playwright/test';

// Mock API responses for endpoints that depend on the models (Python) service.
// Prevents E2E tests from waiting for ML processing jobs.
export async function mockModelJobs(page: Page) {
  const baseUrl = 'http://localhost:3000';

  // Model endpoints (ask, summarize, translate, extract-entities, etc.)
  await page.route(`${baseUrl}/model/**`, async (route) => {
    const url = route.request().url();

    if (url.includes('/model/ask')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ jobId: 999 }),
      });
    } else {
      // summarize, translate, extract-entities, key-points, keywords
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
  });

  // Job polling - return completed immediately
  await page.route(`${baseUrl}/jobs/*`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 999,
          type: 'mock',
          status: 'completed',
          result: {},
          createdAt: new Date().toISOString(),
        }),
      });
    } else {
      await route.continue();
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
