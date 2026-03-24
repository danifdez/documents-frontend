import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class EntitiesPage extends BasePage {
  get heading() { return this.page.locator('h1', { hasText: 'Entities' }); }
  get newEntityButton() { return this.page.locator('button:has-text("New Entity")'); }
  get emptyState() { return this.page.getByText('No entities yet'); }
  get searchInput() { return this.page.getByPlaceholder('Search by name, alias, or type...'); }

  // Create modal
  get createModal() { return this.page.locator('h3:has-text("New Entity")'); }
  get nameInput() { return this.page.getByPlaceholder('Entity name'); }
  get typeSelect() { return this.page.locator('select'); }
  get descriptionInput() { return this.page.getByPlaceholder('Optional description'); }
  get createButton() { return this.page.locator('button:has-text("Create")'); }
  get cancelButton() { return this.page.locator('button:has-text("Cancel")'); }

  async goto() {
    await this.navigateTo('/entities');
  }

  async expectVisible() {
    await expect(this.page).toHaveURL(/#\/entities/);
    await expect(this.heading).toBeVisible();
    await expect(this.newEntityButton).toBeVisible();
  }

  async openCreateModal() {
    await this.newEntityButton.click();
    await expect(this.createModal).toBeVisible();
  }

  async selectFirstType() {
    const options = this.typeSelect.locator('option:not([disabled])');
    if (await options.count() > 0) {
      const value = await options.first().getAttribute('value');
      await this.typeSelect.selectOption(value!);
    }
  }

  async createEntity(name: string, opts?: { description?: string }) {
    await this.openCreateModal();
    await this.nameInput.fill(name);
    await this.selectFirstType();
    if (opts?.description) {
      await this.descriptionInput.fill(opts.description);
    }
    await this.createButton.click();
    await expect(this.createModal).toBeHidden({ timeout: 15_000 });
    await expect(this.entityRow(name)).toBeVisible({ timeout: 10_000 });
  }

  async search(term: string) {
    await this.searchInput.fill(term);
  }

  entityRow(name: string) {
    return this.page.getByText(name, { exact: true });
  }
}
