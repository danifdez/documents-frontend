import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DocumentPage extends BasePage {
  get nameInput() { return this.page.getByPlaceholder('Document name...'); }
  get editor() { return this.page.locator('[contenteditable="true"]'); }

  async expectVisible() {
    await expect(this.page).toHaveURL(/\/document\//, { timeout: 15_000 });
    await expect(this.nameInput).toBeVisible();
    await expect(this.editor).toBeVisible();
  }

  async setName(name: string) {
    await this.nameInput.fill(name);
  }

  async typeContent(text: string) {
    await this.editor.click();
    await this.editor.pressSequentially(text);
  }

  async expectName(name: string) {
    await expect(this.nameInput).toHaveValue(name);
  }

  async expectContent(text: string) {
    await expect(this.editor).toContainText(text);
  }
}
