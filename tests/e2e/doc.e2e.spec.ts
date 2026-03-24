import { test } from './fixtures/electron-app';
import { DashboardPage, ProjectPage, ThreadPage, DocumentPage } from './pages';

test.describe('Document Editor', () => {
  test('create project, thread, and document with content', async ({ window }) => {
    const dashboard = new DashboardPage(window);
    const project = new ProjectPage(window);
    const thread = new ThreadPage(window);
    const doc = new DocumentPage(window);

    await dashboard.createProject('Test Project');
    await project.createThread('Test Thread', 'Thread for testing');
    await project.openThread('Test Thread');
    await thread.createDocument();

    await doc.setName('Test Document');
    await doc.typeContent('Hello, this is a test.');
    await doc.expectName('Test Document');
    await doc.expectContent('Hello, this is a test.');
  });
});
