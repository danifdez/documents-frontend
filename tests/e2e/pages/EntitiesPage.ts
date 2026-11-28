import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class EntitiesPage extends BasePage {
  get heading() { return this.page.getByRole('heading', { name: 'Relationships', exact: true, level: 1 }); }
  get newEntityButton() { return this.page.getByRole('button', { name: 'New Entity', exact: true }); }
  get emptyState() { return this.page.getByText('No entities yet', { exact: true }); }
  get searchInput() { return this.page.getByRole('textbox', { name: 'Search entities', exact: true }); }

  // Create modal
  get createModal() { return this.page.getByRole('heading', { name: 'New Entity', exact: true, level: 3 }); }
  get nameInput() { return this.page.getByPlaceholder('Entity name'); }
  get typeSelect() { return this.page.getByRole('combobox', { name: 'Type *', exact: true }); }
  get descriptionInput() { return this.page.getByPlaceholder('Optional description'); }
  get createButton() { return this.page.getByRole('button', { name: 'Create', exact: true }); }
  get cancelButton() { return this.page.getByRole('button', { name: 'Cancel', exact: true }); }

  async goto() {
    await this.navigateTo('/relationships');
  }

  async expectVisible() {
    await expect(this.page).toHaveURL(/#\/relationships$/);
    await expect(this.heading).toBeVisible();
    await expect(this.newEntityButton).toBeVisible();
  }

  async openCreateModal() {
    await this.newEntityButton.click();
    await expect(this.createModal).toBeVisible();
  }

  async createEntity(name: string, type: string, description?: string) {
    await this.openCreateModal();
    await this.nameInput.fill(name);
    await this.typeSelect.selectOption({ label: type });
    if (description) {
      await this.descriptionInput.fill(description);
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
