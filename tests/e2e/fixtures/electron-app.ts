import { test as base, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import * as path from 'path';
import { mockModelJobs } from './api-mocks';
import { waitForOnline } from './helpers';

const MAIN_ENTRY = path.join(__dirname, '..', '..', '..', '.vite', 'build', 'main.js');
const WORKSPACE_NAME = 'Test Workspace';
const WORKSPACE_URL = process.env.TEST_API_URL || 'http://localhost:3000';

type ElectronFixtures = {
  electronApp: ElectronApplication;
  window: Page;
};

async function setupWorkspaceIfNeeded(window: Page) {
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
  electronApp: async ({}, use) => {
    const app = await electron.launch({
      args: [MAIN_ENTRY, '--no-sandbox'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });
    await use(app);
    await app.close();
  },

  window: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow();

    await window.waitForURL(/index\.html/, { timeout: 30_000 }).catch(() => {});
    await window.waitForLoadState('domcontentloaded');

    await setupWorkspaceIfNeeded(window);

    // Mock model/job APIs to avoid waiting for ML processing
    await mockModelJobs(window).catch(() => {});

    // Confirm backend is reachable before running tests.
    // No reload needed — serverReachable defaults to true on app init.
    await waitForOnline(window);

    await use(window);
  },
});

export { expect } from '@playwright/test';
