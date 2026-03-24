import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class BibliographyPage extends BasePage {
  get heading() { return this.page.locator('h1:has-text("Bibliography")'); }
  get addButton() { return this.page.locator('button:has-text("Añadir")'); }
  get searchInput() { return this.page.getByPlaceholder('Buscar...'); }
  get emptyState() { return this.page.getByText('No hay entradas bibliográficas.'); }

  async goto() {
    await this.navigateTo('/bibliography');
  }

  async expectVisible() {
    await expect(this.page).toHaveURL(/#\/bibliography/);
    await expect(this.heading).toBeVisible();
    await expect(this.addButton).toBeVisible();
  }

  entryRow(title: string) {
    return this.page.getByText(title);
  }
}
