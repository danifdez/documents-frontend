import { test, expect } from './fixtures/electron-app';
import { DashboardPage, ProjectPage, ThreadPage, DocumentPage } from './pages';

test.describe('Threads', () => {
  test('create a thread and navigate into it', async ({ window }) => {
    const dashboard = new DashboardPage(window);
    const project = new ProjectPage(window);
    const thread = new ThreadPage(window);

    await dashboard.createProject('Thread Test Project');
    await project.createThread('Research Thread', 'Gather research documents');
    await project.openThread('Research Thread');
    await thread.expectEmpty();
  });

  test('create a document inside a thread', async ({ window }) => {
    const dashboard = new DashboardPage(window);
    const project = new ProjectPage(window);
    const thread = new ThreadPage(window);
    const doc = new DocumentPage(window);

    await dashboard.createProject('Doc Thread Project');
    await project.createThread('Docs Thread');
    await project.openThread('Docs Thread');
    await thread.createDocument();
    await doc.expectVisible();
  });

  test('thread breadcrumb navigation', async ({ window }) => {
    const dashboard = new DashboardPage(window);
    const project = new ProjectPage(window);
    const thread = new ThreadPage(window);

    await dashboard.createProject('Breadcrumb Project');
    await project.createThread('Breadcrumb Thread');
    await project.openThread('Breadcrumb Thread');

    await expect(thread.breadcrumb('Dashboard')).toBeVisible();
    await expect(thread.breadcrumb('Breadcrumb Project')).toBeVisible();
    await expect(window.getByRole('heading', { name: 'Breadcrumb Thread', exact: true, level: 1 })).toBeVisible();

    await thread.goToProject('Breadcrumb Project');
    await expect(project.threadLink('Breadcrumb Thread')).toBeVisible();
  });

  test('create multiple threads in a project', async ({ window }) => {
    const dashboard = new DashboardPage(window);
    const project = new ProjectPage(window);

    await dashboard.createProject('Multi Thread Project');
    await project.createThread('Thread Alpha');
    await project.createThread('Thread Beta');
    await project.createThread('Thread Gamma');

    await expect(project.threadLink('Thread Alpha')).toBeVisible();
    await expect(project.threadLink('Thread Beta')).toBeVisible();
    await expect(project.threadLink('Thread Gamma')).toBeVisible();
  });
});
