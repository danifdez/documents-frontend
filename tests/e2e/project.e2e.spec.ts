import { test, expect } from './fixtures/electron-app';
import { DashboardPage, ProjectPage } from './pages';

test.describe('Projects', () => {
  test('create a new project from dashboard', async ({ window }) => {
    const dashboard = new DashboardPage(window);
    const project = new ProjectPage(window);

    await dashboard.expectVisible();
    await dashboard.createProject('My Test Project', 'A project for testing');

    await expect(project.projectName('My Test Project')).toBeVisible();
    await expect(window.getByText('A project for testing')).toBeVisible();
  });

  test('project page shows action buttons', async ({ window }) => {
    const dashboard = new DashboardPage(window);
    const project = new ProjectPage(window);

    await dashboard.createProject('Action Buttons Project');
    await project.expectActionButtons();
  });

  test('create a thread inside a project', async ({ window }) => {
    const dashboard = new DashboardPage(window);
    const project = new ProjectPage(window);

    await dashboard.createProject('Thread Project');
    await project.createThread('My Thread', 'Thread description');
  });

  test('navigate back to dashboard from project', async ({ window }) => {
    const dashboard = new DashboardPage(window);
    const project = new ProjectPage(window);

    await dashboard.createProject('Nav Project');
    await project.goToDashboard();

    await dashboard.expectVisible();
    await expect(dashboard.projectCard('Nav Project')).toBeVisible();
  });
});
