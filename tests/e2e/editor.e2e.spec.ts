import { test, expect, _electron as electron } from '@playwright/test'
import * as path from 'path';

const mainEntryPoint = path.join(__dirname, '..', '..', '.vite', 'build', 'main.js');

test('basic test', async () => {
  test.setTimeout(600000); // Increase timeout to 600 seconds
  const electronApp = await electron.launch({
    args: [mainEntryPoint, '--no-sandbox'],
  });

  const window = await electronApp.firstWindow()

  try {
    // Create a new Project
    await window.click('button:has-text("Add Project")');
    await window.fill('input[id="projectName"]', 'Test Project');
    await window.click('button[type="submit"]', { force: true });

    await expect(window).toHaveURL(/\/project\/\w+/);
    await expect(window.locator('text=Test Project')).toBeVisible();

    // Create a new Thread
    await window.click('button:has-text("Add New Thread")');
    await window.fill('input[id="threadName"]', 'Test Thread');
    await window.fill('textarea[id="threadDescription"]', 'Thread for testing');
    await window.click('button[type="submit"]:has-text("Create Thread")');

    await expect(window.locator('text=Test Thread')).toBeVisible();

    // Go into the thread and create a new document
    await window.click('text=Test Thread');

    await expect(window).toHaveURL(/\/thread\//);

    // Create a new document
    await window.click('button:has-text("Create New Document")');
    await expect(window).toHaveURL(/\/document\//);
    await window.fill('input[id="docName"]', 'Test Document');
    await window.click('[contenteditable="true"]');
    const testText = 'Hello, this is a test.';
    await window.type('[contenteditable="true"]', testText);

    await expect(window.locator('input[id="docName"]')).toHaveValue('Test Document');
    await expect(window.locator('[contenteditable="true"]')).toContainText('Hello, this is a test.');
  } catch (error) {
    await window.screenshot({ path: 'e2e-failure.png' });
    throw error;
  } finally {
    await electronApp.close()
  }
})