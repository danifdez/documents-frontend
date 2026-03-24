import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class BrowserPage extends BasePage {
  get urlInput() { return this.page.getByPlaceholder('Enter URL...'); }
  get goButton() { return this.page.locator('button:has-text("Go")'); }
  get extractButton() { return this.page.locator('button:has-text("Extract")'); }

  async goto() {
    await this.navigateTo('/browser');
  }

  async expectVisible() {
    await expect(this.page).toHaveURL(/#\/browser/);
    await expect(this.urlInput).toBeVisible();
    await expect(this.goButton).toBeVisible();
    await expect(this.extractButton).toBeVisible();
  }

  async setUrl(url: string) {
    await this.urlInput.fill(url);
  }

  async expectUrl(url: string) {
    await expect(this.urlInput).toHaveValue(url);
  }
}
