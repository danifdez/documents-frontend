import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DatasetsPage extends BasePage {
  get heading() { return this.page.locator('h1:has-text("Datasets")'); }
  get newDatasetButton() { return this.page.locator('button:has-text("New Dataset")'); }
  get importFileButton() { return this.page.locator('button:has-text("Import File")'); }
  get searchInput() { return this.page.getByPlaceholder('Search...'); }
  get emptyState() { return this.page.getByText('No datasets yet'); }

  // Create modal
  get createModal() { return this.page.locator('h3:has-text("New Dataset")'); }
  get nameInput() { return this.page.getByPlaceholder('e.g. Casas, Coches...'); }
  get descriptionInput() { return this.page.getByPlaceholder('Optional description'); }
  get createButton() { return this.page.locator('button:has-text("Create")'); }
  get cancelButton() { return this.page.locator('button:has-text("Cancel")'); }

  async goto() {
    await this.navigateTo('/datasets');
  }

  async expectVisible() {
    await expect(this.page).toHaveURL(/#\/datasets/);
    await expect(this.heading).toBeVisible();
    await expect(this.newDatasetButton).toBeVisible();
  }

  async openCreateModal() {
    await this.newDatasetButton.click();
    await expect(this.createModal).toBeVisible();
  }

  datasetRow(name: string) {
    return this.page.getByText(name, { exact: true });
  }
}
