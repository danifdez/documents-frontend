import { test, expect } from './fixtures/electron-app';
import { TaskPanel } from './pages';

test.describe('Tasks', () => {
  test('open task panel and see empty state', async ({ window }) => {
    const tasks = new TaskPanel(window);

    await tasks.open();
    await tasks.expectVisible();
  });

  test('create a task', async ({ window }) => {
    const tasks = new TaskPanel(window);

    await tasks.open();
    await tasks.addTask('Buy groceries');
  });

  test('create multiple tasks', async ({ window }) => {
    const tasks = new TaskPanel(window);

    await tasks.open();
    await tasks.addTask('Task One');
    await tasks.addTask('Task Two');
    await tasks.addTask('Task Three');

    await expect(tasks.taskItem('Task One')).toBeVisible();
    await expect(tasks.taskItem('Task Two')).toBeVisible();
    await expect(tasks.taskItem('Task Three')).toBeVisible();
  });

  test('complete a task', async ({ window }) => {
    const tasks = new TaskPanel(window);

    await tasks.open();
    await tasks.addTask('Finish report');
    await tasks.completeTask('Finish report');
    await tasks.expectCompleted(1);
    await tasks.expandCompleted();
    await expect(tasks.completedItem('Finish report')).toBeVisible();
  });

  test('close task panel', async ({ window }) => {
    const tasks = new TaskPanel(window);

    await tasks.open();
    await tasks.close();
  });
});
