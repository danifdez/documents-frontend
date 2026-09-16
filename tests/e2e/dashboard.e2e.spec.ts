import { test, expect } from './fixtures/electron-app';
import { DashboardPage, Topbar } from './pages';

test.describe('Dashboard', () => {
  test('app launches and shows the dashboard', async ({ window }) => {
    const dashboard = new DashboardPage(window);

    await expect(window).toHaveURL(/#\/$/);
    await dashboard.expectVisible();
    await expect(dashboard.importResourceButton).toBeVisible();
    await new Topbar(window).expectVisible();
    await expect(window.getByRole('button', { name: /Search everything/ })).toHaveCount(0);
  });

  test('open notes from the top navigation', async ({ window }) => {
    const topbar = new Topbar(window);

    await topbar.openNotes();
    await expect(window.getByRole('heading', { name: 'Notes', exact: true })).toBeVisible();
  });

  test('navigate to datasets through the knowledge menu', async ({ window }) => {
    const topbar = new Topbar(window);

    await topbar.openKnowledge();
    await expect(topbar.header.getByRole('menu')).toBeVisible();
    await window.keyboard.press('Escape');
    await expect(topbar.header.getByRole('menu')).toBeHidden();

    await topbar.goToKnowledgeItem('Datasets');
    await expect(window).toHaveURL(/#\/datasets/);
    await expect(window.getByRole('heading', { name: 'Datasets' })).toBeVisible();
  });
});
