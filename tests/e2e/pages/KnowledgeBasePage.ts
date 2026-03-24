import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class KnowledgeBasePage extends BasePage {
  get heading() { return this.page.locator('h1', { hasText: 'Knowledge Base' }); }
  get newEntryButton() { return this.page.locator('button:has-text("Nueva entrada")'); }
  get emptyState() { return this.page.getByText('Sin entradas todavía'); }

  async goto() {
    await this.navigateTo('/knowledge-base');
  }

  async expectVisible() {
    await expect(this.page).toHaveURL(/#\/knowledge-base/);
    await expect(this.heading).toBeVisible();
    await expect(this.newEntryButton).toBeVisible();
  }

  async createEntry() {
    await this.newEntryButton.click();
    await expect(this.page).toHaveURL(/#\/knowledge-base\/\d+/, { timeout: 15_000 });
  }

  entryCard(title: string) {
    return this.page.getByText(title);
  }
}

export class KnowledgeEntryPage extends BasePage {
  get titleInput() { return this.page.getByPlaceholder('Título de la entrada'); }
  get summaryInput() { return this.page.getByPlaceholder('Resumen breve (opcional)'); }
  get savedIndicator() { return this.page.getByText('Guardado'); }
  get addTagButton() { return this.page.locator('button:has-text("Etiqueta")'); }
  get tagInput() { return this.page.getByPlaceholder('Nueva etiqueta'); }
  get backButton() { return this.page.locator('button:has(path[d="M15 19l-7-7 7-7"])'); }

  async expectVisible() {
    await expect(this.page).toHaveURL(/#\/knowledge-base\/\d+/);
    await expect(this.titleInput).toBeVisible();
  }

  async setTitle(title: string) {
    await this.titleInput.fill(title);
    await this.titleInput.blur();
  }

  async setSummary(summary: string) {
    await this.summaryInput.fill(summary);
    await this.summaryInput.blur();
  }

  async expectSaved() {
    await expect(this.savedIndicator).toBeVisible({ timeout: 10_000 });
  }

  async addTag(tag: string) {
    await this.addTagButton.click();
    await this.tagInput.fill(tag);
    await this.tagInput.press('Enter');
    await expect(this.page.getByText(tag)).toBeVisible();
  }

  async goBack() {
    await this.backButton.click();
    await expect(this.page).toHaveURL(/#\/knowledge-base$/, { timeout: 10_000 });
  }
}
