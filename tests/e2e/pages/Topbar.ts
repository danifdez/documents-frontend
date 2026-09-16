import { expect, type Page } from '@playwright/test';

export class Topbar {
  readonly header;

  constructor(page: Page) {
    this.header = page.locator('header.app-topbar');
  }

  get projectsLink() { return this.header.getByRole('link', { name: 'Projects', exact: true }); }
  get calendarLink() { return this.header.getByRole('link', { name: 'Calendar', exact: true }); }
  get knowledgeButton() { return this.header.getByRole('button', { name: 'Knowledge', exact: true }); }
  get noteButton() { return this.header.getByRole('button', { name: 'Note', exact: true }); }

  async expectVisible() {
    await expect(this.header).toBeVisible();
    await expect(this.projectsLink).toBeVisible();
    await expect(this.calendarLink).toBeVisible();
  }

  async openKnowledge() {
    await this.knowledgeButton.click();
  }

  async goToKnowledgeItem(label: string) {
    await this.openKnowledge();
    await this.header.getByRole('menuitem', { name: new RegExp(label) }).click();
  }

  async openNotes() {
    await this.noteButton.click();
  }
}
