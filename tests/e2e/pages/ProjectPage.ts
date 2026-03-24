import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProjectPage extends BasePage {
  get threadButton() { return this.page.locator('button:has-text("Thread")'); }
  get documentButton() { return this.page.locator('button:has-text("Document")'); }
  get canvasButton() { return this.page.locator('button:has-text("Canvas")'); }
  get noteButton() { return this.page.locator('button:has-text("Note")'); }
  get timelineButton() { return this.page.locator('button:has-text("Timeline")'); }
  get importButton() { return this.page.locator('button:has-text("Import")'); }

  // Thread creation modal
  get threadNameInput() { return this.page.getByPlaceholder('Enter thread name'); }
  get threadDescriptionInput() { return this.page.getByPlaceholder('Enter thread description'); }
  get createThreadButton() { return this.page.locator('button:has-text("Create Thread")'); }

  async expectVisible() {
    await expect(this.page).toHaveURL(/\/project\/\d+/, { timeout: 15_000 });
  }

  async expectActionButtons() {
    await expect(this.threadButton).toBeVisible();
    await expect(this.documentButton).toBeVisible();
    await expect(this.canvasButton).toBeVisible();
    await expect(this.noteButton).toBeVisible();
    await expect(this.timelineButton).toBeVisible();
    await expect(this.importButton).toBeVisible();
  }

  async createThread(name: string, description?: string) {
    await this.threadButton.click();
    await this.threadNameInput.fill(name);
    if (description) {
      await this.threadDescriptionInput.fill(description);
    }
    await this.createThreadButton.click();
    await expect(this.page.getByText(name)).toBeVisible({ timeout: 10_000 });
  }

  async openThread(name: string) {
    await this.page.getByText(name).click();
    await expect(this.page).toHaveURL(/\/thread\/\d+/, { timeout: 15_000 });
  }

  async createCanvas() {
    await this.canvasButton.click();
    await expect(this.page).toHaveURL(/\/canvas\//, { timeout: 15_000 });
  }

  async createTimeline() {
    await this.timelineButton.click();
    await expect(this.page).toHaveURL(/\/timeline\//, { timeout: 15_000 });
  }

  async createDocument() {
    await this.documentButton.click();
    await expect(this.page).toHaveURL(/\/document\//, { timeout: 15_000 });
  }

  async goToDashboard() {
    await this.clickBreadcrumb('Dashboard');
    await expect(this.page).toHaveURL(/#\/$/, { timeout: 10_000 });
  }

  projectName(name: string) {
    return this.page.getByText(name);
  }
}
