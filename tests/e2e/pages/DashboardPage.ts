import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  get heading() { return this.page.locator('h1:has-text("Projects")'); }
  get newProjectButton() { return this.page.locator('button:has-text("New Project")'); }
  get importResourceButton() { return this.page.locator('button:has-text("Import Resource")'); }

  // New Project modal
  get projectModal() { return this.page.locator('h3:has-text("New Project")'); }
  get projectNameInput() { return this.page.getByPlaceholder('Enter project name'); }
  get projectDescriptionInput() { return this.page.getByPlaceholder('Enter project description'); }
  get createProjectButton() { return this.page.locator('button:has-text("Create Project")'); }

  async expectVisible() {
    await expect(this.heading).toBeVisible();
    await expect(this.newProjectButton).toBeVisible();
  }

  async createProject(name: string, description?: string) {
    await this.newProjectButton.click();
    await expect(this.projectModal).toBeVisible();
    await expect(this.projectNameInput).toBeVisible();
    await this.projectNameInput.fill(name);
    if (description) {
      await this.projectDescriptionInput.fill(description);
    }
    await this.createProjectButton.click();
    await expect(this.projectModal).toBeHidden({ timeout: 30_000 });
    await expect(this.page).toHaveURL(/\/project\/\d+/, { timeout: 15_000 });
  }

  projectCard(name: string) {
    return this.page.getByText(name);
  }
}
