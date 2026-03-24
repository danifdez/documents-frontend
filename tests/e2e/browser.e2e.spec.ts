import { test } from './fixtures/electron-app';
import { BrowserPage } from './pages';

test.describe('Browser', () => {
  test('browser page loads with navbar and controls', async ({ window }) => {
    const browser = new BrowserPage(window);

    await browser.goto();
    await browser.expectVisible();
  });

  test('url bar shows default URL', async ({ window }) => {
    const browser = new BrowserPage(window);

    await browser.goto();
    await browser.expectUrl('https://github.com/electron/electron');
  });

  test('type a URL in the address bar', async ({ window }) => {
    const browser = new BrowserPage(window);

    await browser.goto();
    await browser.setUrl('https://example.com');
    await browser.expectUrl('https://example.com');
  });
});
