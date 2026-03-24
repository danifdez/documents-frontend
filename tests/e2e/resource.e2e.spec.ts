import { test, expect } from './fixtures/electron-app';
import { DashboardPage, ProjectPage } from './pages';

test.describe('Resource', () => {
  test('import resource button is visible on dashboard', async ({ window }) => {
    const dashboard = new DashboardPage(window);

    await dashboard.expectVisible();
    await expect(dashboard.importResourceButton).toBeVisible();
  });

  test('import resource button is visible on project page', async ({ window }) => {
    const dashboard = new DashboardPage(window);
    const project = new ProjectPage(window);

    await dashboard.createProject('Resource Project');
    await expect(project.importButton).toBeVisible();
  });
});
