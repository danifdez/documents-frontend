import { test, expect } from './fixtures/electron-app';
import { SettingsPage } from './pages';

test.describe('Settings', () => {
  test('settings page loads with all sections', async ({ window }) => {
    const settings = new SettingsPage(window);

    await settings.goto();
    await settings.expectVisible();
    await settings.expectAllSections();
  });

  test('change default browser URL', async ({ window }) => {
    const settings = new SettingsPage(window);

    await settings.goto();
    await settings.defaultBrowserUrlInput.fill('https://example.com');
    await settings.defaultBrowserUrlInput.blur();

    // Value should persist
    await expect(settings.defaultBrowserUrlInput).toHaveValue('https://example.com');
  });

  test('theme buttons are visible and clickable', async ({ window }) => {
    const settings = new SettingsPage(window);

    await settings.goto();
    await expect(settings.themeButton('Light')).toBeVisible();
    await expect(settings.themeButton('Dark')).toBeVisible();
    await expect(settings.themeButton('System')).toBeVisible();

    // Click dark theme
    await settings.themeButton('Dark').click();
  });
});
