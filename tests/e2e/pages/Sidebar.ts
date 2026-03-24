import type { Page } from '@playwright/test';

export class Sidebar {
  private nav;

  constructor(private page: Page) {
    this.nav = page.locator('nav');
  }

  get notesLink() { return this.nav.locator('a[href="#/notes"]'); }
  get entitiesLink() { return this.nav.locator('a[href="#/entities"]'); }
  get datasetsLink() { return this.nav.locator('a[href="#/datasets"]'); }
  get knowledgeBaseLink() { return this.nav.locator('a[href="#/knowledge-base"]'); }
  get calendarLink() { return this.nav.locator('a[href="#/calendar"]'); }
  get settingsLink() { return this.page.locator('a[href="#/settings"]'); }
  get tasksButton() { return this.nav.locator('button:has-text("Tasks")'); }

  async goToNotes() { await this.notesLink.click(); }
  async goToEntities() { await this.entitiesLink.click(); }
  async goToCalendar() { await this.calendarLink.click(); }
  async goToKnowledgeBase() { await this.knowledgeBaseLink.click(); }
  async openTasks() { await this.tasksButton.click(); }
}
