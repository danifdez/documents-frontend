import type { Page } from '@playwright/test';

// Mock API responses for endpoints that depend on the models (Python) service.
// Prevents E2E tests from waiting for ML executions.
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

  // Execution polling - return completed immediately
  await page.route(`${baseUrl}/executions/*`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          executionId,
          taskType: 'mock',
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
