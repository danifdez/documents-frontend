import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class UserManagementPage extends BasePage {
  get heading() { return this.page.locator('h1:has-text("User Management")'); }
  get createUserButton() { return this.page.locator('button:has-text("Create User")'); }

  // Table headers
  get usernameHeader() { return this.page.locator('th:has-text("Username")'); }
  get roleHeader() { return this.page.locator('th:has-text("Role")'); }

  // Create/Edit modal
  get modal() { return this.page.locator('h2:has-text("Create User")'); }
  get editModal() { return this.page.locator('h2:has-text("Edit User")'); }

  async goto() {
    await this.navigateTo('/admin/users');
  }

  async expectVisible() {
    await expect(this.page).toHaveURL(/#\/admin\/users/);
    await expect(this.heading).toBeVisible();
    await expect(this.createUserButton).toBeVisible();
  }

  async expectTable() {
    await expect(this.usernameHeader).toBeVisible();
    await expect(this.roleHeader).toBeVisible();
  }

  async openCreateModal() {
    await this.createUserButton.click();
    await expect(this.modal).toBeVisible();
  }

  userRow(username: string) {
    return this.page.locator('td', { hasText: username });
  }
}
