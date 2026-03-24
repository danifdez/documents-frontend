import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CalendarPage extends BasePage {
  get newEventButton() { return this.page.locator('button:has-text("New Event")'); }
  get todayButton() { return this.page.locator('button:has-text("Today")'); }

  // Event modal
  get eventModal() { return this.page.locator('h3:has-text("New Event")'); }
  get editEventModal() { return this.page.locator('h3:has-text("Edit Event")'); }
  get titleInput() { return this.page.getByPlaceholder('Event title'); }
  get descriptionInput() { return this.page.getByPlaceholder('Optional description'); }
  get allDayCheckbox() { return this.page.locator('input[type="checkbox"]'); }
  get startDateInput() { return this.page.locator('input[type="date"], input[type="datetime-local"]').first(); }
  get createButton() { return this.page.locator('button:has-text("Create")'); }
  get updateButton() { return this.page.locator('button:has-text("Update")'); }

  async goto() {
    await this.navigateTo('/calendar');
  }

  async expectVisible() {
    await expect(this.page).toHaveURL(/#\/calendar/);
    await expect(this.newEventButton).toBeVisible();
    await expect(this.todayButton).toBeVisible();
  }

  async openNewEventModal() {
    await this.newEventButton.click();
    await expect(this.eventModal).toBeVisible();
  }

  async createEvent(title: string, opts?: { description?: string; allDay?: boolean; startDate?: string }) {
    await this.openNewEventModal();
    await this.titleInput.fill(title);
    if (opts?.description) {
      await this.descriptionInput.fill(opts.description);
    }
    if (opts?.allDay) {
      await this.allDayCheckbox.check();
      // Checking all-day changes input type and clears the value — must re-fill
      const today = new Date().toISOString().split('T')[0];
      await this.startDateInput.fill(opts.startDate || today);
    }
    await this.createButton.click();
    await expect(this.eventModal).toBeHidden({ timeout: 15_000 });
    await expect(this.page.getByText(title)).toBeVisible({ timeout: 10_000 });
  }

  async clickEvent(title: string) {
    await this.page.getByText(title).click();
    await expect(this.editEventModal).toBeVisible();
  }

  async updateEvent(newTitle: string) {
    await this.titleInput.fill(newTitle);
    await this.updateButton.click();
    await expect(this.editEventModal).toBeHidden({ timeout: 15_000 });
    await expect(this.page.getByText(newTitle)).toBeVisible({ timeout: 10_000 });
  }

  eventCard(title: string) {
    return this.page.getByText(title);
  }
}
