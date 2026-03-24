import type { Page } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}

  async navigateTo(hashPath: string) {
    const currentUrl = this.page.url();
    const base = currentUrl.split('#')[0];
    await this.page.goto(`${base}#${hashPath}`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  breadcrumb(name: string) {
    return this.page.locator(`a:has-text("${name}")`);
  }

  async clickBreadcrumb(name: string) {
    await this.breadcrumb(name).click();
  }
}
