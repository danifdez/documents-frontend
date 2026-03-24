import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CanvasPage extends BasePage {
  get nameInput() { return this.page.getByPlaceholder('Canvas name...'); }
  get addTextButton() { return this.page.locator('button[title="Add Text"]'); }
  get addStickyButton() { return this.page.locator('button[title="Add Sticky Note"]'); }
  get addShapeButton() { return this.page.locator('button[title="Add Shape"]'); }
  get addImageButton() { return this.page.locator('button[title="Add Image"]'); }
  get addDocRefButton() { return this.page.locator('button[title="Add Document Reference"]'); }
  get addResourceRefButton() { return this.page.locator('button[title="Add Resource Reference"]'); }
  get exportButton() { return this.page.locator('button[title="Export as image"]'); }

  async expectVisible() {
    await expect(this.page).toHaveURL(/\/canvas\//, { timeout: 15_000 });
    await expect(this.nameInput).toBeVisible();
  }

  async expectToolbar() {
    await expect(this.addTextButton).toBeVisible();
    await expect(this.addStickyButton).toBeVisible();
    await expect(this.addShapeButton).toBeVisible();
    await expect(this.addImageButton).toBeVisible();
    await expect(this.addDocRefButton).toBeVisible();
    await expect(this.addResourceRefButton).toBeVisible();
    await expect(this.exportButton).toBeVisible();
  }

  async setName(name: string) {
    await this.nameInput.fill(name);
    await this.nameInput.blur();
  }

  async expectName(name: string) {
    await expect(this.nameInput).toHaveValue(name);
  }

  async goToProject(projectName: string) {
    await this.clickBreadcrumb(projectName);
    await expect(this.page).toHaveURL(/\/project\/\d+/, { timeout: 10_000 });
  }
}
