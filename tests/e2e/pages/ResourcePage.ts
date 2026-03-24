import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ResourcePage extends BasePage {
  get resourceName() { return this.page.locator('h1'); }
  get loadingText() { return this.page.getByText('Loading resource details...'); }

  async expectVisible() {
    await expect(this.page).toHaveURL(/#\/resource\/\d+/);
  }

  async expectLoaded() {
    await expect(this.loadingText).toBeHidden({ timeout: 15_000 });
    await expect(this.resourceName).toBeVisible();
  }
}
