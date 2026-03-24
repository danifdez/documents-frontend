import { test } from './fixtures/electron-app';
import { DashboardPage, ProjectPage, CanvasPage } from './pages';

test.describe('Canvas', () => {
  test('create a canvas from project page', async ({ window }) => {
    const dashboard = new DashboardPage(window);
    const project = new ProjectPage(window);
    const canvas = new CanvasPage(window);

    await dashboard.createProject('Canvas Project');
    await project.createCanvas();
    await canvas.expectVisible();
    await canvas.expectToolbar();
  });

  test('rename a canvas', async ({ window }) => {
    const dashboard = new DashboardPage(window);
    const project = new ProjectPage(window);
    const canvas = new CanvasPage(window);

    await dashboard.createProject('Rename Canvas Project');
    await project.createCanvas();
    await canvas.setName('My Research Canvas');
    await canvas.expectName('My Research Canvas');
  });

  test('canvas toolbar has all tools', async ({ window }) => {
    const dashboard = new DashboardPage(window);
    const project = new ProjectPage(window);
    const canvas = new CanvasPage(window);

    await dashboard.createProject('Toolbar Canvas Project');
    await project.createCanvas();
    await canvas.expectToolbar();
  });

  test('canvas breadcrumb navigation back to project', async ({ window }) => {
    const dashboard = new DashboardPage(window);
    const project = new ProjectPage(window);
    const canvas = new CanvasPage(window);

    await dashboard.createProject('Nav Canvas Project');
    await project.createCanvas();
    await canvas.goToProject('Nav Canvas Project');
  });
});
