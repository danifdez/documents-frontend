import { fireEvent, render, screen } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DayDetailPanel from '@/components/calendar/DayDetailPanel.vue';
import type { CalendarEvent } from '@/types/CalendarEvent';

const at = (day: number, hour = 0, minute = 0) => new Date(2026, 5, day, hour, minute);
const event = (id: number, title: string, overrides: Partial<CalendarEvent>): CalendarEvent => ({
  id, title, startDate: at(8, 8).toISOString(), endDate: null, description: null, color: '#5361dd',
  allDay: false, recurrenceRule: null, alarm: null, ...overrides,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(at(8, 10, 30));
});

afterEach(() => vi.useRealTimers());

describe('daily calendar layout', () => {
  it('uses occurrence times, selects a clicked event or hour, and updates the now marker only for today', async () => {
    const timed = event(4, 'Study room booking', { occurrenceStart: at(8, 9, 15).toISOString(), occurrenceEnd: at(8, 10).toISOString() });
    const completed = event(3, 'Inventory day', { allDay: true, trackCompletion: true, completed: true });
    const upcoming = event(5, 'Cataloguing', { occurrenceStart: at(9, 8).toISOString() });
    const select = vi.fn();
    const slot = vi.fn();
    const view = render(DayDetailPanel, { props: {
      date: at(8), events: [timed, completed, upcoming], onEventClick: select, onSlotClick: slot,
    } });
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.queryByText('Cataloguing')).toBeNull();
    expect(screen.getByText(/Inventory day/).classList.contains('line-through')).toBe(true);

    const entry = screen.getByText('Study room booking');
    const block = entry.parentElement!;
    expect(block.style.top).toBe('444px');
    expect(block.style.height).toBe('36px');
    await fireEvent.click(entry);
    expect(select).toHaveBeenCalledExactlyOnceWith(timed);
    expect(slot).not.toHaveBeenCalled();

    const noon = at(8, 12).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    await fireEvent.click(screen.getByText(noon));
    expect(slot).toHaveBeenCalledExactlyOnceWith(at(8, 12));

    const marker = () => view.container.querySelector<HTMLElement>('.pointer-events-none');
    expect(marker()?.style.top).toBe('504px');
    await vi.advanceTimersByTimeAsync(60000);
    expect(parseFloat(marker()!.style.top)).toBeCloseTo(504.8, 1);
    await view.rerender({ date: at(9) });
    expect(marker()).toBeNull();
    expect(screen.getByText('Cataloguing')).toBeTruthy();
    expect(screen.queryByText('Study room booking')).toBeNull();
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
