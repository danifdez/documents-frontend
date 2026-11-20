import { fireEvent, render, screen } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import EventModal from '@/components/calendar/EventModal.vue';
import type { CalendarEvent } from '@/types/CalendarEvent';

const project = { id: 7, name: 'Collections' };
const base: CalendarEvent = {
  id: 17, title: 'Review the exhibit', description: null, allDay: true, color: '#3b82f6',
  startDate: '2026-06-08T00:00:00.000Z', endDate: null, recurrenceRule: null, alarm: null,
};
const button = (name: string) => screen.getByRole('button', { name });
const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;

async function openEvent(event?: CalendarEvent) {
  const submit = vi.fn();
  const unmark = vi.fn();
  const remove = vi.fn();
  const changed = vi.fn();
  const view = render(EventModal, { props: {
    modelValue: false, event, projects: [project], defaultProjectId: 7, defaultDate: new Date(2026, 5, 8, 10),
    onSubmit: submit, onUnmarkOccurrence: unmark, onDelete: remove, 'onUpdate:modelValue': changed,
  } });
  await view.rerender({ modelValue: true });
  return { submit, unmark, remove, changed };
}

describe('calendar event editor', () => {
  it('creates a custom recurrence with selected weekdays, count, and reminder', async () => {
    const { submit } = await openEvent();
    expect((screen.getByRole('combobox', { name: 'Project' }) as HTMLSelectElement).value).toBe('7');
    await fireEvent.update(field('Title *'), '  Archive review  ');
    await fireEvent.update(field('Description'), '  Bring gloves  ');
    await fireEvent.update(field('Repeats'), 'custom');
    await fireEvent.update(field('Frequency'), 'WEEKLY');
    await fireEvent.update(field('Interval'), '2');
    await fireEvent.click(button('Mon'));
    await fireEvent.click(button('Tue'));
    await fireEvent.click(button('Fri'));
    await fireEvent.click(button('Tue'));
    await fireEvent.click(screen.getByRole('radio', { name: /After/ }));
    await fireEvent.update(screen.getByRole('radio', { name: /After/ }).parentElement!.querySelector('input[type="number"]')!, '5');
    expect(screen.getByText(/on MO,FR, 5 times/)).toBeTruthy();
    await fireEvent.click(button('Custom'));
    await fireEvent.update(field('Reminder minutes before the event'), '10080');
    await fireEvent.click(screen.getByRole('checkbox', { name: 'I want to mark it as done' }));
    await fireEvent.click(button('Create'));
    expect(submit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      title: 'Archive review', description: 'Bring gloves', projectId: 7, recurrenceRule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,FR;COUNT=5',
      alarm: { offsetMinutes: -10080 }, trackCompletion: true, startDate: new Date(2026, 5, 8, 10).toISOString(),
    }));
  });

  it.each([
    ['FREQ=DAILY', 'daily', -10],
    ['FREQ=WEEKLY;BYDAY=MO', 'weekly', -60],
    ['FREQ=MONTHLY;INTERVAL=2;UNTIL=20261201T235959Z', 'custom', 0],
    ['FREQ=DAILY;BYHOUR=9', 'readonly', -17],
  ] as const)('round-trips the saved recurrence %s and its reminder', async (rule, preset, offsetMinutes) => {
    const { submit } = await openEvent({ ...base, recurrenceRule: rule, alarm: { offsetMinutes } });
    expect((screen.getByRole('combobox', { name: 'Repeats' }) as HTMLSelectElement).value).toBe(preset);
    if (preset === 'readonly') {
      const raw = screen.getByRole('textbox', { name: 'Recurrence rule' }) as HTMLTextAreaElement;
      expect(raw.value).toBe(rule);
      expect(raw.readOnly).toBe(true);
    }
    if (preset === 'custom') expect(screen.getByText(/until 2026-12-01/)).toBeTruthy();
    await fireEvent.click(button('Update'));
    expect(submit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      id: 17, allDay: true, recurrenceRule: rule, alarm: { offsetMinutes }, projectId: null,
    }));
  });

  it('gives a completed occurrence an undo action and cancels without submitting', async () => {
    const { submit, unmark, remove, changed } = await openEvent({
      ...base, trackCompletion: true, completed: true, occurrenceStart: base.startDate,
    });
    await fireEvent.click(button('Mark as not done'));
    expect(unmark).toHaveBeenCalledTimes(1);
    await fireEvent.click(button('Delete'));
    expect(remove).toHaveBeenCalledTimes(1);
    await fireEvent.click(button('Cancel'));
    expect(changed).toHaveBeenLastCalledWith(false);
    expect(submit).not.toHaveBeenCalled();
  });
});
