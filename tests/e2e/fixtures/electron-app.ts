import { test as base, type ElectronApplication, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { mockModelExecutions } from './api-mocks';
import { waitForOnline } from './helpers';

const MAIN_ENTRY = path.join(__dirname, '..', '..', '..', '.vite', 'build', 'main.js');
const WORKSPACE_NAME = 'Test Workspace';
const WORKSPACE_URL = process.env.TEST_API_URL || 'http://localhost:3000';

type ElectronFixtures = {
  electronApp: ElectronApplication;
  window: Page;
};

async function setupWorkspaceIfNeeded(window: Page) {
  const connectToServer = window.getByRole('button', { name: /^Connect to server/ });
  if (await connectToServer.isVisible().catch(() => false)) {
    await connectToServer.click();
  }

  const modal = window.locator('h2:has-text("Add Workspace")');
  const isVisible = await modal.isVisible().catch(() => false);
  if (!isVisible) return;

  await window.fill('input#field-name', WORKSPACE_NAME);
  await window.fill('input#field-server-url', WORKSPACE_URL);
  await window.click('button[type="submit"]:has-text("Add")');
  await modal.waitFor({ state: 'hidden', timeout: 15_000 });

  // Reload so the app re-mounts with the workspace configured
  await window.reload();
  await window.waitForLoadState('domcontentloaded');
}

export const test = base.extend<ElectronFixtures>({
  electronApp: async ({ playwright }, use) => {
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'documents-frontend-e2e-'));
    let app: ElectronApplication | null = null;
    try {
      app = await playwright._electron.launch({
        args: [MAIN_ENTRY, '--no-sandbox'],
        env: {
          ...process.env,
          DOCUMENTS_TEST_USER_DATA_DIR: userDataDir,
          ELECTRON_RUN_AS_NODE: undefined,
          NODE_ENV: 'test',
        },
      });
      await use(app);
    } finally {
      await app?.close();
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  },

  window: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow();

    await window.waitForURL(/index\.html/, { timeout: 30_000 }).catch(() => {});
    await window.waitForLoadState('domcontentloaded');

    await setupWorkspaceIfNeeded(window);

    // Mock model execution APIs to avoid waiting for ML processing
    await mockModelExecutions(window).catch(() => {});

    // Confirm backend is reachable before running tests.
    // No reload needed — serverReachable defaults to true on app init.
    await waitForOnline(window);

    await use(window);
  },
});

export { expect } from '@playwright/test';
