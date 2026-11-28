import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CalendarPage extends BasePage {
  get newEventButton() { return this.page.getByRole('button', { name: 'New Event', exact: true }); }
  get todayButton() { return this.page.getByRole('button', { name: 'Today', exact: true }); }

  get eventModal() { return this.page.getByRole('dialog', { name: 'New Event', exact: true }); }
  get editEventModal() { return this.page.getByRole('dialog', { name: 'Edit Event', exact: true }); }
  get titleInput() { return this.editEventModal.getByPlaceholder('Event title'); }

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
    await this.eventModal.getByPlaceholder('Event title').fill(title);
    if (opts?.description) {
      await this.eventModal.getByPlaceholder('Optional description').fill(opts.description);
    }
    if (opts?.allDay) {
      const start = this.eventModal.getByLabel('Start', { exact: true });
      const localDay = (await start.inputValue()).split('T')[0];
      await this.eventModal.getByRole('checkbox', { name: 'All day', exact: true }).check();
      await start.fill(opts.startDate ?? localDay);
    }
    await this.eventModal.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(this.eventModal).toBeHidden({ timeout: 15_000 });
    await expect(this.eventCard(title)).toBeVisible();
  }

  async clickEvent(title: string) {
    await this.eventCard(title).click();
    await expect(this.editEventModal).toBeVisible();
  }

  async updateEvent(newTitle: string) {
    await this.titleInput.fill(newTitle);
    await this.editEventModal.getByRole('button', { name: 'Update', exact: true }).click();
    await expect(this.editEventModal).toBeHidden({ timeout: 15_000 });
    await expect(this.eventCard(newTitle)).toBeVisible();
  }

  eventCard(title: string) {
    return this.page.getByRole('region', { name: 'Month calendar', exact: true })
      .getByRole('button', { name: title, exact: true });
  }
}
