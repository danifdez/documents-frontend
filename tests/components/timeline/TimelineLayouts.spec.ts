import { cleanup, fireEvent, render, screen, within } from '@testing-library/vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TimelineHorizontal from '@/components/timeline/TimelineHorizontal.vue';
import TimelineVertical from '@/components/timeline/TimelineVertical.vue';
import type { TimelineEpoch, TimelineEvent } from '@/types/timeline';

const epoch: TimelineEpoch = {
  id: 'initial', name: 'Early catalogue', startDate: '1910-01-01', endDate: '1910-01-31', color: '#3b82f6',
};
const events: TimelineEvent[] = [
  { id: 'one', title: 'Catalogue opens', description: 'First loan register', date: '1910-01-01', endDate: '1910-01-07', color: '#6366f1', docId: 24 },
  { id: 'two', title: 'First loan', date: '1910-01-13', color: '#275d34', resourceId: 21 },
  { id: 'three', title: 'New wing', date: '1920-01-01', color: '#a11462' },
  { id: 'four', title: 'Archive moves', date: '1920-01-13', color: '#e49f31' },
];
const defaults = {
  events,
  epochs: [epoch],
  showRuler: true,
  axisBreaks: true,
  showCards: true,
  showInlineMarks: true,
  highlightedEventId: null as string | null,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe.each([
  { name: 'horizontal', component: TimelineHorizontal, block: 'nearest', inline: 'center' },
  { name: 'vertical', component: TimelineVertical, block: 'center', inline: 'nearest' },
])('$name timeline layout', ({ component, block, inline }) => {
  it('renders a break between distant groups and preserves event details in cards', async () => {
    const view = render(component, { props: defaults });
    expect(screen.getAllByRole('img', { name: 'Timeline axis break' })).toHaveLength(1);
    expect(screen.getByText('First loan register')).toBeTruthy();
    expect(view.container.querySelectorAll('[data-event-id]')).toHaveLength(4);
    await fireEvent.click(screen.getByText('First loan register'));
    expect(view.emitted()['edit-event']).toEqual([[events[0]]]);
    await view.rerender({ axisBreaks: false, showCards: false, showInlineMarks: false, showRuler: false });
    expect(screen.queryByRole('img', { name: 'Timeline axis break' })).toBeNull();
    expect(screen.queryByText('First loan register')).toBeNull();
    await fireEvent.click(screen.getByText('New wing'));
    expect(view.emitted()['edit-event']).toEqual([[events[0]], [events[2]]]);
  });

  it('filters events by epoch and exposes its edit and removal actions', async () => {
    const view = render(component, { props: defaults });
    const header = screen.getAllByText(epoch.name).find((item) => item.parentElement?.querySelector('button[title="Edit"]'))!;
    const row = within(header.parentElement!);
    await fireEvent.click(row.getByTitle('Edit'));
    await fireEvent.click(row.getByTitle('Delete'));
    expect(view.emitted()['edit-epoch']).toEqual([[epoch]]);
    expect(view.emitted()['delete-epoch']).toEqual([[epoch]]);
    await fireEvent.click(header);
    expect(view.container.querySelectorAll('[data-event-id]')).toHaveLength(2);
    expect(screen.queryByText('New wing')).toBeNull();
    await fireEvent.click(header);
    expect(view.container.querySelectorAll('[data-event-id]')).toHaveLength(4);
  });

  it('scrolls to the highlighted marker and leaves other event positions available', async () => {
    const view = render(component, { props: defaults });
    const target = view.container.querySelector<HTMLElement>('[data-event-id="two"]')!;
    const scroll = vi.spyOn(target, 'scrollIntoView').mockImplementation(() => {});
    await view.rerender({ highlightedEventId: 'two' });
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ behavior: 'smooth', block, inline });
    expect(target.classList.contains('scale-150')).toBe(true);
    await view.rerender({ highlightedEventId: null });
    expect(scroll).toHaveBeenCalledOnce();
    expect(view.container.querySelector('[data-event-id="three"]')).toBeTruthy();
  });

  it('handles a single event of unknown duration and an empty timeline', async () => {
    const view = render(component, { props: { ...defaults, events: [events[1]], epochs: [] } });
    expect(screen.getByText('First loan')).toBeTruthy();
    expect(view.container.querySelectorAll('[data-event-id]')).toHaveLength(1);
    await view.rerender({ events: [] });
    expect(view.container.querySelectorAll('[data-event-id]')).toHaveLength(0);
    expect(screen.queryByText('First loan')).toBeNull();
  });
});

describe('horizontal timeline zoom', () => {
  it('changes label placement and restores the original scale with Reset', async () => {
    const view = render(TimelineHorizontal, { props: defaults });
    const positions = () => Array.from(view.container.querySelectorAll<HTMLElement>('[data-event-id]'), (marker) => marker.style.left);
    const before = positions();
    await fireEvent.click(screen.getByTitle('Zoom in'));
    expect(positions()).not.toEqual(before);
    await fireEvent.click(screen.getByTitle('Zoom out'));
    expect(positions()).toEqual(before);
    await fireEvent.click(screen.getByTitle('Zoom out'));
    await fireEvent.click(screen.getByTitle('Reset zoom'));
    expect(positions()).toEqual(before);
  });
});
