import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class TimelinePage extends BasePage {
  get nameInput() { return this.page.getByPlaceholder('Timeline name...'); }
  get addEventButton() { return this.page.locator('button:has-text("Add event")'); }
  get noEventsText() { return this.page.getByText('No events yet'); }

  // Event modal
  get addEventModal() { return this.page.locator('h3:has-text("Add Event")'); }
  get editEventModal() { return this.page.locator('h3:has-text("Edit Event")'); }
  get eventTitleInput() { return this.page.getByPlaceholder('Event title'); }
  get eventDescriptionInput() { return this.page.getByPlaceholder('Optional description'); }
  get eventDateInput() { return this.page.locator('input[type="date"]').first(); }
  get addButton() { return this.page.getByRole('button', { name: 'Add', exact: true }); }
  get saveButton() { return this.page.locator('button:has-text("Save")'); }

  async expectVisible() {
    await expect(this.page).toHaveURL(/\/timeline\//, { timeout: 15_000 });
    await expect(this.nameInput).toBeVisible();
  }

  async setName(name: string) {
    await this.nameInput.fill(name);
    await this.nameInput.blur();
    // Wait for save (URL changes from /timeline/new to /timeline/:id)
    await expect(this.page).toHaveURL(/\/timeline\/\d+/, { timeout: 15_000 });
  }

  async addEvent(title: string, date: string, opts?: { description?: string }) {
    await this.addEventButton.click();
    await expect(this.addEventModal).toBeVisible();
    await this.eventTitleInput.fill(title);
    await this.eventDateInput.fill(date);
    if (opts?.description) {
      await this.eventDescriptionInput.fill(opts.description);
    }
    await this.addButton.click();
    await expect(this.addEventModal).toBeHidden({ timeout: 10_000 });
    await expect(this.page.getByText(title)).toBeVisible();
  }

  async clickEvent(title: string) {
    await this.page.getByText(title).click();
    await expect(this.editEventModal).toBeVisible();
  }

  async updateEvent(newTitle: string) {
    await this.eventTitleInput.fill(newTitle);
    await this.saveButton.click();
    await expect(this.editEventModal).toBeHidden({ timeout: 10_000 });
    await expect(this.page.getByText(newTitle)).toBeVisible();
  }

  eventCount(n: number) {
    const label = n === 1 ? '1 event' : `${n} events`;
    return this.page.getByText(label);
  }

  async goToProject(projectName: string) {
    await this.clickBreadcrumb(projectName);
    await expect(this.page).toHaveURL(/\/project\/\d+/, { timeout: 10_000 });
  }
}
