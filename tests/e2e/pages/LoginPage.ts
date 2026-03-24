import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  get logo() { return this.page.getByText('Documents'); }
  get usernameInput() { return this.page.getByPlaceholder('Enter your username'); }
  get passwordInput() { return this.page.getByPlaceholder('Enter your password'); }
  get signInButton() { return this.page.locator('button:has-text("Sign in")'); }
  get errorMessage() { return this.page.locator('.text-red-500'); }

  async goto() {
    await this.navigateTo('/login');
  }

  async expectVisible() {
    await expect(this.page).toHaveURL(/#\/login/);
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.signInButton).toBeVisible();
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }
}
