import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export class TaskPanel {
  constructor(private page: Page) {}

  get header() { return this.page.locator('h2:has-text("Tasks")'); }
  get newTaskInput() { return this.page.getByPlaceholder('Add a task...'); }
  // The close X button contains path "M6 18L18 6M6 6l12 12" (X icon)
  get closeButton() { return this.page.locator('button:has(path[d="M6 18L18 6M6 6l12 12"])').first(); }

  async open() {
    const tasksButton = this.page.locator('nav button:has(path[d*="M9 5H7"])');
    await tasksButton.click();
    await expect(this.header).toBeVisible({ timeout: 10_000 });
  }

  async expectVisible() {
    await expect(this.header).toBeVisible();
    await expect(this.newTaskInput).toBeVisible();
  }

  async addTask(title: string) {
    await this.newTaskInput.fill(title);
    await this.newTaskInput.press('Enter');
    await expect(this.taskItem(title)).toBeVisible({ timeout: 10_000 });
    await expect(this.newTaskInput).toHaveValue('');
  }

  async completeTask(title: string) {
    const taskRow = this.taskItem(title).locator('..');
    await taskRow.locator('button').first().click();
  }

  async expectCompleted(count: number) {
    await expect(this.page.getByText(`Completed (${count})`)).toBeVisible({ timeout: 10_000 });
  }

  async expandCompleted() {
    await this.page.getByRole('button', { name: /Completed \(\d+\)/ }).click();
  }

  completedItem(title: string) {
    return this.page.locator('.line-through', { hasText: title });
  }

  taskItem(title: string) {
    return this.page.locator(`input[value="${title}"]`);
  }

  async close() {
    await this.closeButton.click();
    await expect(this.header).toBeHidden({ timeout: 5_000 });
  }
}
