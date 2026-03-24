import { test, expect } from './fixtures/electron-app';
import { CalendarPage } from './pages';

test.describe('Calendar Events', () => {
  test('calendar page loads and shows controls', async ({ window }) => {
    const calendar = new CalendarPage(window);

    await calendar.goto();
    await calendar.expectVisible();
  });

  test('create a new event', async ({ window }) => {
    const calendar = new CalendarPage(window);

    await calendar.goto();
    await calendar.createEvent('Test Calendar Event', { description: 'This is a test event' });
  });

  test('create an all-day event', async ({ window }) => {
    const calendar = new CalendarPage(window);

    await calendar.goto();
    await calendar.createEvent('All Day Meeting', { allDay: true });
  });

  test('click event to edit it', async ({ window }) => {
    const calendar = new CalendarPage(window);

    await calendar.goto();
    await calendar.createEvent('Original Event');
    await calendar.clickEvent('Original Event');

    await expect(calendar.titleInput).toHaveValue('Original Event');
    await calendar.updateEvent('Updated Event');
  });
});
