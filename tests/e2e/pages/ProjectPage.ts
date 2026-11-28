import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProjectPage extends BasePage {
  get newMenuButton() {
    return this.page.getByRole('button', { name: 'New', exact: true })
      .and(this.page.locator('[aria-haspopup="menu"]'));
  }
  get newMenu() { return this.page.getByRole('menu', { name: 'New', exact: true }); }
  get importButton() { return this.page.getByRole('button', { name: 'Import', exact: true }); }

  private newMenuItem(name: string) {
    return this.newMenu.getByRole('menuitem', { name, exact: true });
  }

  private async selectNewItem(name: string) {
    await this.newMenuButton.click();
    await this.newMenuItem(name).click();
  }

  async expectVisible() {
    await expect(this.page).toHaveURL(/\/project\/\d+/, { timeout: 15_000 });
  }

  async expectActionButtons() {
    await expect(this.importButton).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Notes', exact: true })).toBeVisible();
    await this.newMenuButton.click();
    for (const name of ['Thread', 'Document', 'Canvas', 'Timeline']) {
      await expect(this.newMenuItem(name)).toBeVisible();
    }
    await this.page.keyboard.press('Escape');
    await expect(this.newMenu).toBeHidden();
  }

  async createThread(name: string, description?: string) {
    await this.selectNewItem('Thread');
    const dialog = this.page.getByRole('dialog', { name: 'Create New Thread' });
    await dialog.getByPlaceholder('Enter thread name').fill(name);
    if (description) {
      await dialog.getByPlaceholder('Enter thread description').fill(description);
    }
    await dialog.getByRole('button', { name: 'Create Thread', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(this.threadLink(name)).toBeVisible();
  }

  threadLink(name: string) {
    return this.page.locator('a[href^="#/thread/"]').filter({
      has: this.page.getByText(name, { exact: true }),
    });
  }

  async openThread(name: string) {
    await this.threadLink(name).click();
    await expect(this.page).toHaveURL(/\/thread\/\d+/, { timeout: 15_000 });
  }

  async createCanvas() {
    await this.selectNewItem('Canvas');
    await expect(this.page).toHaveURL(/\/canvas\//, { timeout: 15_000 });
  }

  async createTimeline() {
    await this.selectNewItem('Timeline');
    await expect(this.page).toHaveURL(/\/timeline\//, { timeout: 15_000 });
  }

  async createDocument() {
    await this.selectNewItem('Document');
    await expect(this.page).toHaveURL(/\/document\//, { timeout: 15_000 });
  }

  async goToDashboard() {
    await this.clickBreadcrumb('Dashboard');
    await expect(this.page).toHaveURL(/#\/$/, { timeout: 10_000 });
  }

  projectName(name: string) {
    return this.page.getByRole('heading', { name, exact: true, level: 1 });
  }
}
