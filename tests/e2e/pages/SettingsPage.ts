import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class SettingsPage extends BasePage {
  get heading() { return this.page.locator('h1', { hasText: 'Settings' }); }

  // Sections
  get editorAppearanceSection() { return this.page.locator('h2:has-text("Editor Appearance")'); }
  get themeSection() { return this.page.locator('h2:has-text("Theme")'); }
  get browserSection() { return this.page.locator('h2:has-text("Browser")'); }
  get languageSection() { return this.page.locator('h2:has-text("Language")'); }

  // Theme buttons
  themeButton(label: string) { return this.page.locator(`button:has-text("${label}")`); }

  // Browser default URL
  get defaultBrowserUrlInput() { return this.page.getByPlaceholder('https://example.com'); }

  async goto() {
    await this.navigateTo('/settings');
  }

  async expectVisible() {
    await expect(this.page).toHaveURL(/#\/settings/);
    await expect(this.heading).toBeVisible();
  }

  async expectAllSections() {
    await expect(this.editorAppearanceSection).toBeVisible();
    await expect(this.themeSection).toBeVisible();
    await expect(this.browserSection).toBeVisible();
    await expect(this.languageSection).toBeVisible();
  }
}
