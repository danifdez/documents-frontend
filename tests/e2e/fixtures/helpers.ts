import type { Page } from '@playwright/test';

/**
 * Navigate to a hash route within the Electron app.
 * The app uses createWebHashHistory(), so URLs are like file://...index.html#/path
 */
export async function navigateTo(window: Page, hashPath: string) {
  const currentUrl = window.url();
  const base = currentUrl.split('#')[0];
  await window.goto(`${base}#${hashPath}`);
  await window.waitForLoadState('domcontentloaded');
}

/**
 * Confirm the backend is reachable before running tests.
 * Uses a direct fetch (not the app's axios) to avoid hitting the
 * /auth/status rate limit. The app initialises serverReachable = true
 * by default, so as long as the backend is up before the first real
 * request, the interceptor won't block anything.
 */
export async function waitForOnline(page: Page) {
  await page.waitForFunction(
    async () => {
      try {
        const baseUrl = localStorage.getItem('_lastApiBaseUrl') || 'http://localhost:3000';
        const res = await fetch(`${baseUrl}/auth/status`, { signal: AbortSignal.timeout(3000) });
        return res.ok;
      } catch {
        return false;
      }
    },
    undefined,
    { timeout: 16_000, polling: 2_000 },
  );
}
