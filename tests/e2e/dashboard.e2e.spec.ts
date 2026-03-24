import { test, expect } from './fixtures/electron-app';
import { DashboardPage, Sidebar, NotesPage } from './pages';

test.describe('Dashboard', () => {
  test('app launches and shows the dashboard', async ({ window }) => {
    const dashboard = new DashboardPage(window);

    await expect(window).toHaveURL(/#\/$/);
    await dashboard.expectVisible();
    await expect(dashboard.importResourceButton).toBeVisible();
  });

  test('navigate to notes via sidebar', async ({ window }) => {
    const sidebar = new Sidebar(window);
    const notes = new NotesPage(window);

    await sidebar.goToNotes();
    await notes.expectVisible();
  });
});
