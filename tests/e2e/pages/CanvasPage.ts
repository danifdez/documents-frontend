import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CanvasPage extends BasePage {
  get nameInput() { return this.page.getByPlaceholder('Canvas name...'); }

  async expectVisible() {
    await expect(this.page).toHaveURL(/\/canvas\//, { timeout: 15_000 });
    await expect(this.nameInput).toBeVisible();
  }

  async expectToolbar() {
    for (const tool of [
      'Text', 'Process', 'Circle', 'Input / Output', 'Database', 'Preparation', 'Manual Op', 'Off-page Ref', 'Star',
      'Chart', 'Timeline', 'Entity Graph', 'Image', 'Document Reference', 'Resource Reference', 'Export as image',
    ]) {
      await expect(this.page.getByTitle(tool, { exact: true })).toBeVisible();
    }
  }

  async setName(name: string) {
    await this.nameInput.fill(name);
    await this.nameInput.blur();
    await expect(this.page).toHaveURL(/#\/canvas\/\d+$/);
  }

  async expectName(name: string) {
    await expect(this.nameInput).toHaveValue(name);
  }

  async goToProject(projectName: string) {
    await this.clickBreadcrumb(projectName);
    await expect(this.page).toHaveURL(/\/project\/\d+/, { timeout: 10_000 });
  }
}
