import type { ElectronApplication, Page, Route } from '@playwright/test';
import { expect, test } from './fixtures/electron-app';

const NOW = '2026-08-26T12:00:00.000Z';

function isAppWindow(page: Page) {
  return page.url().includes('index.html');
}

async function waitForAppWindow(electronApp: ElectronApplication) {
  const existing = electronApp.windows().find(isAppWindow);
  if (existing) return existing;
  return electronApp.waitForEvent('window', {
    predicate: (page) => isAppWindow(page),
    timeout: 30_000,
  });
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function installQuickAssistantApi(page: Page) {
  await page.route('**/*', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname === '/auth/status') {
      return fulfillJson(route, { authEnabled: false, features: {} });
    }
    if (request.method() === 'GET' && pathname === '/assistants') {
      return fulfillJson(route, [{
        id: 1,
        name: 'Assistant',
        folderScope: null,
        icon: '◇',
        sub: 'Personal assistant',
        lastSeenAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      }]);
    }
    if (request.method() === 'GET' && pathname === '/agents') {
      return fulfillJson(route, [{
        id: 2,
        name: 'Research Agent',
        systemPrompt: 'Research the selected workspace.',
        folderScope: null,
        icon: '◆',
        sub: 'Research specialist',
        pinned: true,
        lastSeenAt: null,
        expiresAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      }]);
    }
    if (request.method() === 'GET' && pathname === '/assistants/1/messages') {
      return fulfillJson(route, { messages: [], hasMore: false });
    }
    if (request.method() === 'GET' && pathname === '/agents/2/messages') {
      return fulfillJson(route, { messages: [], hasMore: false });
    }
    if (
      request.method() === 'GET'
      && (pathname === '/assistants/1/indexed-files' || pathname === '/agents/2/indexed-files')
    ) {
      return fulfillJson(route, []);
    }

    if (/^https?:/.test(request.url())) {
      return fulfillJson(route, request.method() === 'GET' ? [] : {});
    }

    await route.continue();
  });
}

async function prepareWorkspace(page: Page) {
  await page.waitForLoadState('domcontentloaded');

  const connectToServer = page.getByRole('button', { name: /^Connect to server/ });
  if (await connectToServer.isVisible().catch(() => false)) {
    await connectToServer.click();
  }

  const workspaceModal = page.locator('h2:has-text("Add Workspace")');
  if (await workspaceModal.isVisible().catch(() => false)) {
    await page.fill('input#field-name', 'Quick Assistant E2E');
    await page.fill('input#field-server-url', 'http://localhost:3000');
    await page.click('button[type="submit"]:has-text("Add")');
    await workspaceModal.waitFor({ state: 'hidden', timeout: 15_000 });
  }

  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByTitle('Assistant (Ctrl+J)')).toBeVisible();
}

test('opens the floating assistant with the personal assistant and switches to an agent', async ({ electronApp }) => {
  // In dev/unpackaged runs DevTools opens automatically, so `firstWindow()`
  // can be the DevTools page. Target the renderer by URL.
  const main = await waitForAppWindow(electronApp);
  await installQuickAssistantApi(main);
  await prepareWorkspace(main);

  await main.evaluate(() => window.quickAssistant?.show());

  const quick = await electronApp.waitForEvent('window', { timeout: 30_000 });
  await quick.waitForURL(/#\/quick-assistant/, { timeout: 30_000 });
  await quick.waitForLoadState('domcontentloaded');
  await installQuickAssistantApi(quick);
  await quick.reload();
  await quick.waitForLoadState('domcontentloaded');

  expect(quick.url()).toContain('#/quick-assistant');
  await expect(quick.getByPlaceholder(/Message Assistant/)).toBeVisible();

  // The window is small: the app-wide body min-width must not clip its layout.
  const overflow = await quick.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

  // Default position: bottom-right of the display work area.
  const margins = await electronApp.evaluate(({ BrowserWindow, screen }) => {
    const win = BrowserWindow.getAllWindows().find(
      (candidate) => candidate.webContents.getURL().includes('quick-assistant'),
    );
    if (!win) return null;
    const bounds = win.getBounds();
    const { workArea } = screen.getDisplayMatching(bounds);
    return {
      right: workArea.x + workArea.width - (bounds.x + bounds.width),
      bottom: workArea.y + workArea.height - (bounds.y + bounds.height),
    };
  });
  expect(margins).not.toBeNull();
  expect(margins!.right).toBeGreaterThanOrEqual(0);
  expect(margins!.right).toBeLessThanOrEqual(40);
  expect(margins!.bottom).toBeGreaterThanOrEqual(0);
  expect(margins!.bottom).toBeLessThanOrEqual(40);

  await quick.getByRole('button', { name: /Assistant/ }).first().click();
  await expect(quick.getByText('Research Agent', { exact: true })).toBeVisible();
  await quick.getByText('Research Agent', { exact: true }).click();
  await expect(quick.getByPlaceholder(/Message Research Agent/)).toBeVisible();

  await quick.evaluate(() => window.quickAssistant?.hide());
  await expect.poll(() => electronApp.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows().find(
      (candidate) => candidate.webContents.getURL().includes('quick-assistant'),
    );
    return win ? win.isVisible() : false;
  })).toBe(false);
});
