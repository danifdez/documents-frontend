import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class NotesPage extends BasePage {
  get heading() { return this.page.locator('h1', { hasText: 'Notes' }); }
  get newNoteButton() { return this.page.locator('button:has-text("New Note")'); }

  async goto() {
    await this.navigateTo('/notes');
  }

  async expectVisible() {
    await expect(this.page).toHaveURL(/#\/notes/);
    await expect(this.heading).toBeVisible();
    await expect(this.newNoteButton).toBeVisible();
  }

  async createNote() {
    await this.newNoteButton.click();
    await expect(this.page).toHaveURL(/#\/notes\/.+/, { timeout: 30_000 });
  }
}
