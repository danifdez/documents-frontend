import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export class TaskPanel {
  constructor(private page: Page) {}

  get header() { return this.page.getByRole('heading', { name: 'Tasks', exact: true, level: 2 }); }
  get newTaskInput() { return this.page.getByRole('textbox', { name: 'New task title', exact: true }); }
  get pendingTitles() { return this.page.getByRole('textbox', { name: 'Task title', exact: true }); }
  get closeButton() { return this.page.getByRole('button', { name: 'Close tasks', exact: true }); }

  async open() {
    const tasksButton = this.page.getByTitle('Tasks (Ctrl+Shift+T)', { exact: true });
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
    await taskRow.getByRole('button', { name: 'Mark task as complete', exact: true }).click();
    await expect(this.taskItem(title)).toHaveCount(0);
  }

  async expectCompleted(count: number) {
    await expect(this.page.getByText(`Completed (${count})`)).toBeVisible({ timeout: 10_000 });
  }

  async expandCompleted() {
    await this.page.getByRole('button', { name: /Completed \(\d+\)/ }).click();
  }

  completedItem(title: string) {
    return this.page.locator('.line-through').and(this.page.getByText(title, { exact: true }));
  }

  taskItem(title: string) {
    return this.pendingTitles.and(this.page.locator(`input[value=${JSON.stringify(title)}]`));
  }

  async close() {
    await this.closeButton.click();
    await expect(this.header).toBeHidden({ timeout: 5_000 });
  }
}
