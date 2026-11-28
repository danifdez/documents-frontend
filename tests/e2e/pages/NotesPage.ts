import { expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { Topbar } from './Topbar';

export class NotesPage extends BasePage {
  get heading() { return this.page.getByRole('heading', { name: 'Notes', exact: true, level: 2 }); }
  get newNoteButton() { return this.page.getByRole('button', { name: /^New Note\b/ }); }
  get titleInput() { return this.page.getByRole('textbox', { name: 'Note title', exact: true }); }
  get editor() { return this.page.locator('.notes-editor-pane .tiptap[contenteditable="true"]'); }

  async open() {
    await new Topbar(this.page).openNotes();
  }

  async expectVisible() {
    await expect(this.heading).toBeVisible();
    await expect(this.newNoteButton).toBeVisible();
  }

  async createNote() {
    await this.newNoteButton.click();
    await expect(this.titleInput).toHaveValue('Untitled Note');
    await expect(this.editor).toBeEditable();
  }
}
