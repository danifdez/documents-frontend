import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import Calendar from '@/pages/Calendar.vue';
import type { CalendarEvent } from '@/types/CalendarEvent';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/services/api', () => ({ default: api }));

const today = new Date(2026, 0, 11, 12);
const project = { id: 13, name: 'Archives' };
const event: CalendarEvent = {
  id: 31, title: 'Inventory review', description: 'Annual check',
  startDate: '2026-01-11T00:00:00.000Z', endDate: null, allDay: true, color: '#3b82f6',
  recurrenceRule: 'FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=11', alarm: { offsetMinutes: -60 }, project,
};
const button = (name: string) => screen.getByRole('button', { name });
const textBox = () => screen.getByPlaceholderText('Event title');
const submit = (name: 'Create' | 'Update') => fireEvent.submit((button(name) as HTMLButtonElement).form!);
const rangeCalls = () => api.get.mock.calls.filter(([url]) => url === '/calendar-events/range');

async function openCalendar(path = '/project/13/calendar', initial = [event]) {
  const events = [...initial];
  api.get.mockImplementation(async (url) => {
    if (url === '/projects') return { data: [project] };
    if (url === '/projects/13') return { data: project };
    if (url === '/calendar-events/range') return { data: [...events] };
    if (url === '/calendar-events/31') return { data: event };
    throw new Error(`Unexpected GET ${url}`);
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>Projects</div>' } },
      { path: '/project/:id', component: { template: '<div>Project</div>' } },
      { path: '/project/:id/calendar', component: Calendar },
      { path: '/calendar', component: Calendar },
    ],
  });
  await router.push(path);
  render(Calendar, { global: { plugins: [router] } });
  await waitFor(() => expect(rangeCalls()).toHaveLength(1));
  return { router, events };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.setSystemTime(today);
});

afterEach(() => vi.useRealTimers());

describe('project calendar', () => {
  it('sends the project id and local timezone and shows the selected week', async () => {
    await openCalendar();
    expect(screen.getByRole('link', { name: 'Archives' }).getAttribute('href')).toBe('/project/13');
    expect(rangeCalls()).toEqual([['/calendar-events/range', { params: {
      projectId: '13', tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      start: new Date(2025, 11, 25).toISOString(), end: new Date(2026, 2, 7).toISOString(),
    } }]]);
    const week = new Date(2026, 0, 5).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      + ' – ' + today.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    await fireEvent.click(button('Week'));
    expect(screen.getByRole('heading', { name: week })).toBeTruthy();

    await fireEvent.click(button('Month'));
    const month = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    expect(screen.getByRole('heading', { name: month })).toBeTruthy();
    await fireEvent.click(button('Today'));
    expect(rangeCalls()).toHaveLength(2);
  });

  it('creates a recurring all-day event in its project with the selected weekdays and alarm', async () => {
    await openCalendar();
    api.post.mockResolvedValue({ data: { id: 32 } });
    await fireEvent.click(button('New Event'));
    await fireEvent.update(textBox(), '  Review accessions  ');
    await fireEvent.click(screen.getByRole('checkbox', { name: 'All day' }));
    await fireEvent.update(screen.getByLabelText('Start'), '2026-01-12');
    await fireEvent.update(screen.getByLabelText('End'), '2026-01-13');
    await fireEvent.update(screen.getByRole('combobox', { name: 'Repeats' }), 'custom');
    await fireEvent.update(screen.getByRole('combobox', { name: 'Frequency' }), 'WEEKLY');
    await fireEvent.update(screen.getByRole('spinbutton', { name: 'Interval' }), '2');
    await fireEvent.click(button('Mon'));
    await fireEvent.click(button('Thu'));
    await fireEvent.click(button('Mon'));
    const after = screen.getByRole('radio', { name: /After/ });
    await fireEvent.click(after);
    await fireEvent.update(within(after.closest('label')!).getByRole('spinbutton'), '4');
    await fireEvent.click(button('Custom'));
    await fireEvent.update(screen.getByRole('spinbutton', { name: 'Reminder minutes before the event' }), '35');
    await fireEvent.click(screen.getByRole('checkbox', { name: 'I want to mark it as done' }));
    await submit('Create');

    expect(api.post).toHaveBeenCalledWith('/calendar-events', {
      title: 'Review accessions', description: null, startDate: '2026-01-12T00:00:00.000Z',
      endDate: '2026-01-13T00:00:00.000Z', allDay: true, color: '#3b82f6',
      recurrenceRule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=TH;COUNT=4', alarm: { offsetMinutes: -35 },
      trackCompletion: true, projectId: 13,
    });
    await waitFor(() => expect(rangeCalls()).toHaveLength(2));
  });

  it('opens an event from the route and preserves unsupported recurrence rules when editing its title', async () => {
    await openCalendar('/calendar?eventId=31');
    const title = await screen.findByPlaceholderText('Event title');
    const recurrence = screen.getByRole('textbox', { name: 'Recurrence rule' }) as HTMLTextAreaElement;
    expect(recurrence.readOnly).toBe(true);
    expect(recurrence.value).toBe(event.recurrenceRule);
    expect(api.get).toHaveBeenCalledWith('/calendar-events/31');
    api.patch.mockResolvedValue({ data: event });
    await fireEvent.update(title, 'Review and audit');
    await submit('Update');

    expect(api.patch).toHaveBeenCalledWith('/calendar-events/31', {
      title: 'Review and audit', description: event.description, startDate: event.startDate,
      endDate: null, allDay: true, color: event.color, recurrenceRule: event.recurrenceRule,
      alarm: event.alarm, trackCompletion: false, projectId: 13,
    });
  });

  it('undoes completion only for the selected expanded occurrence', async () => {
    const occurrenceStart = new Date(2026, 0, 11, 10).toISOString();
    await openCalendar('/calendar', [{
      ...event, trackCompletion: true, completed: true,
      occurrenceStart, occurrenceEnd: null, recurrenceRule: 'FREQ=DAILY',
    }]);
    const [tile] = await screen.findAllByText(event.title);
    await fireEvent.click(tile);
    api.delete.mockResolvedValue({ data: {} });
    await fireEvent.click(button('Mark as not done'));
    expect(api.delete).toHaveBeenCalledExactlyOnceWith(
      `/calendar-events/31/occurrences/${encodeURIComponent(occurrenceStart)}/complete`,
    );
    await waitFor(() => expect(screen.queryByPlaceholderText('Event title')).toBeNull());
    expect(rangeCalls()).toHaveLength(2);
  });

  it('deletes a calendar event only after confirming and refreshes the grid', async () => {
    const { router, events } = await openCalendar('/calendar?eventId=31');
    await screen.findByPlaceholderText('Event title');
    await fireEvent.click(button('Delete'));
    await fireEvent.click(button('Cancel'));
    expect(api.delete).not.toHaveBeenCalled();

    await router.push('/calendar');
    await router.push('/calendar?eventId=31');
    await screen.findByPlaceholderText('Event title');
    await fireEvent.click(button('Delete'));
    api.delete.mockImplementation(async () => { events.pop(); return { data: {} }; });
    await fireEvent.click(button('Delete'));
    await waitFor(() => expect(screen.queryAllByText(event.title)).toHaveLength(0));
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/calendar-events/31');
  });
});
