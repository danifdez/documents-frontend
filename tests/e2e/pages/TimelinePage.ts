import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class TimelinePage extends BasePage {
  get nameInput() { return this.page.getByPlaceholder('Timeline name...'); }
  get addEventButton() { return this.page.getByRole('button', { name: 'Event', exact: true }); }
  get noEventsText() { return this.page.getByText('No events yet', { exact: true }); }

  get addEventModal() { return this.page.getByRole('dialog', { name: 'Add Event', exact: true }); }
  get eventTitleInput() { return this.page.getByRole('textbox', { name: 'Event title', exact: true }); }
  get eventDescriptionInput() { return this.page.getByRole('textbox', { name: 'Event description', exact: true }); }
  get savedIndicator() { return this.page.getByText('Saved', { exact: true }); }

  eventMarker(title: string) {
    return this.page.getByRole('button', { name: `Edit event: ${title}`, exact: true });
  }

  async expectVisible() {
    await expect(this.page).toHaveURL(/\/timeline\//, { timeout: 15_000 });
    await expect(this.nameInput).toBeVisible();
  }

  async setName(name: string) {
    await this.nameInput.fill(name);
    await this.nameInput.blur();
    await expect(this.page).toHaveURL(/#\/timeline\/\d+$/, { timeout: 15_000 });
  }

  async addEvent(title: string, date: string, opts?: { description?: string }) {
    await this.addEventButton.click();
    await expect(this.addEventModal).toBeVisible();
    await this.addEventModal.getByPlaceholder('Event title').fill(title);
    await this.addEventModal.getByLabel(/^Date\b/).fill(date);
    await this.addEventModal.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(this.addEventModal).toBeHidden();
    await expect(this.eventMarker(title)).toBeVisible();
    await expect(this.savedIndicator).toBeVisible();
    if (opts?.description) {
      await this.clickEvent(title);
      await this.eventDescriptionInput.fill(opts.description);
      await this.eventDescriptionInput.blur();
      await expect(this.savedIndicator).toBeVisible();
    }
  }

  async clickEvent(title: string) {
    await this.eventMarker(title).click();
    await expect(this.eventTitleInput).toHaveValue(title);
  }

  async updateEvent(newTitle: string) {
    await this.eventTitleInput.fill(newTitle);
    await this.eventTitleInput.blur();
    await expect(this.savedIndicator).toBeVisible();
    await this.page.reload();
    await expect(this.eventMarker(newTitle)).toBeVisible();
  }

  eventCount(n: number) {
    const label = n === 1 ? '1 event' : `${n} events`;
    return this.page.getByText(label, { exact: true });
  }

  async goToProject(projectName: string) {
    await this.clickBreadcrumb(projectName);
    await expect(this.page).toHaveURL(/\/project\/\d+/, { timeout: 10_000 });
  }
}
