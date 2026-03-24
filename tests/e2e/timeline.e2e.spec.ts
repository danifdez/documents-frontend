import { test, expect } from './fixtures/electron-app';
import { DashboardPage, ProjectPage, TimelinePage } from './pages';

test.describe('Timeline', () => {
  test('create a timeline from project page', async ({ window }) => {
    const dashboard = new DashboardPage(window);
    const project = new ProjectPage(window);
    const timeline = new TimelinePage(window);

    await dashboard.createProject('Timeline Project');
    await project.createTimeline();
    await timeline.expectVisible();
    await expect(timeline.noEventsText).toBeVisible();
    await expect(timeline.addEventButton).toBeVisible();
  });

  test('name a timeline and add an event', async ({ window }) => {
    const dashboard = new DashboardPage(window);
    const project = new ProjectPage(window);
    const timeline = new TimelinePage(window);

    await dashboard.createProject('Event Timeline Project');
    await project.createTimeline();
    await timeline.setName('Historical Timeline');
    await timeline.addEvent('First Event', '2024-06-15', { description: 'Something important happened' });
    await expect(timeline.eventCount(1)).toBeVisible();
  });

  test('add multiple events to a timeline', async ({ window }) => {
    const dashboard = new DashboardPage(window);
    const project = new ProjectPage(window);
    const timeline = new TimelinePage(window);

    await dashboard.createProject('Multi Event Project');
    await project.createTimeline();
    await timeline.setName('Multi Event Timeline');
    await timeline.addEvent('Event Alpha', '2024-01-10');
    await timeline.addEvent('Event Beta', '2024-03-20');
    await expect(timeline.eventCount(2)).toBeVisible();
  });

  test('edit an existing event', async ({ window }) => {
    const dashboard = new DashboardPage(window);
    const project = new ProjectPage(window);
    const timeline = new TimelinePage(window);

    await dashboard.createProject('Edit Event Project');
    await project.createTimeline();
    await timeline.setName('Edit Event Timeline');
    await timeline.addEvent('Original Title', '2024-05-01');
    await timeline.clickEvent('Original Title');
    await timeline.updateEvent('Updated Title');
  });

  test('timeline breadcrumb navigation back to project', async ({ window }) => {
    const dashboard = new DashboardPage(window);
    const project = new ProjectPage(window);
    const timeline = new TimelinePage(window);

    await dashboard.createProject('Breadcrumb TL Project');
    await project.createTimeline();
    await timeline.setName('Breadcrumb Timeline');
    await timeline.goToProject('Breadcrumb TL Project');
  });
});
