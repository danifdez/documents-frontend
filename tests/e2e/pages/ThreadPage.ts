import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ThreadPage extends BasePage {
  get newDocumentButton() { return this.page.locator('button:has-text("New Document")'); }
  get newCanvasButton() { return this.page.locator('button:has-text("New Canvas")'); }
  get emptyState() { return this.page.getByText('No documents or canvases found in this thread.'); }

  async expectVisible() {
    await expect(this.page).toHaveURL(/\/thread\/\d+/, { timeout: 15_000 });
  }

  async expectEmpty() {
    await expect(this.newDocumentButton).toBeVisible();
    await expect(this.newCanvasButton).toBeVisible();
    await expect(this.emptyState).toBeVisible();
  }

  async createDocument() {
    await this.newDocumentButton.click();
    await expect(this.page).toHaveURL(/\/document\//, { timeout: 15_000 });
  }

  async goToProject(projectName: string) {
    await this.clickBreadcrumb(projectName);
    await expect(this.page).toHaveURL(/\/project\/\d+/, { timeout: 10_000 });
  }
}
