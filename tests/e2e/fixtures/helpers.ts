import type { Page } from '@playwright/test';

export const TEST_API_URL = process.env.TEST_API_URL || 'http://localhost:3000';

/**
 * Confirm the backend is reachable before running tests.
 * Uses a direct fetch (not the app's axios) to avoid hitting the
 * /auth/status rate limit. The app initialises serverReachable = true
 * by default, so as long as the backend is up before the first real
 * request, the interceptor won't block anything.
 */
export async function waitForOnline(page: Page) {
  await page.waitForFunction(
    async (defaultUrl) => {
      try {
        const baseUrl = localStorage.getItem('_lastApiBaseUrl') || defaultUrl;
        const res = await fetch(`${baseUrl}/auth/status`, { signal: AbortSignal.timeout(3000) });
        return res.ok;
      } catch {
        return false;
      }
    },
    TEST_API_URL,
    { timeout: 16_000, polling: 2_000 },
  );
}
