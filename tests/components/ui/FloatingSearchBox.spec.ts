import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FloatingSearchBox from '@/components/ui/FloatingSearchBox.vue';

function pane(matches: number) {
  return { content: { value: { search: vi.fn().mockReturnValue(matches), scrollTo: vi.fn(), clearHighlights: vi.fn() } } };
}

const input = () => screen.getByRole('textbox', { name: 'Search content' });

afterEach(() => vi.useRealTimers());

describe('searching across visible pages', () => {
  it('focuses on open, debounces search and cycles matches across panes in both directions', async () => {
    const first = pane(2);
    const empty = pane(0);
    const last = pane(1);
    const view = render(FloatingSearchBox, { props: { modelValue: false, activeContents: [first, empty, last] } });
    expect(screen.queryByRole('textbox', { name: 'Search content' })).toBeNull();
    await view.rerender({ modelValue: true });
    await waitFor(() => expect(document.activeElement).toBe(input()));

    vi.useFakeTimers();
    await fireEvent.update(input(), 'inven');
    await vi.advanceTimersByTimeAsync(250);
    await fireEvent.update(input(), 'inventory');
    await vi.advanceTimersByTimeAsync(299);
    expect(first.content.value.search).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    for (const source of [first, empty, last]) expect(source.content.value.search).toHaveBeenCalledExactlyOnceWith('inventory');
    expect(first.content.value.scrollTo).toHaveBeenCalledExactlyOnceWith(0);
    expect(screen.getByText('1/3')).toBeTruthy();

    await fireEvent.keyDown(input(), { key: 'Enter' });
    expect(first.content.value.scrollTo).toHaveBeenLastCalledWith(1);
    expect(screen.getByText('2/3')).toBeTruthy();
    await fireEvent.click(screen.getByTitle('Next result (Enter)'));
    expect(last.content.value.scrollTo).toHaveBeenCalledExactlyOnceWith(0);
    expect(screen.getByText('3/3')).toBeTruthy();
    await fireEvent.keyDown(input(), { key: 'Enter' });
    expect(first.content.value.scrollTo).toHaveBeenLastCalledWith(0);
    await fireEvent.keyDown(input(), { key: 'Enter', shiftKey: true });
    expect(screen.getByText('3/3')).toBeTruthy();
    await fireEvent.click(screen.getByTitle('Previous result (Shift+Enter)'));
    expect(screen.getByText('2/3')).toBeTruthy();
    expect(empty.content.value.scrollTo).not.toHaveBeenCalled();
  });

  it('clears highlights for an empty query and cancels an in-flight debounce when closed', async () => {
    vi.useFakeTimers();
    const first = pane(1);
    const update = vi.fn();
    render(FloatingSearchBox, { props: {
      modelValue: true, activeContents: [first, { content: {} }], 'onUpdate:modelValue': update,
    } });
    await fireEvent.update(input(), 'obsolete');
    await fireEvent.update(input(), '  ');
    await vi.advanceTimersByTimeAsync(300);
    expect(first.content.value.search).not.toHaveBeenCalled();
    expect(first.content.value.clearHighlights).toHaveBeenCalledTimes(1);

    await fireEvent.update(input(), 'new request');
    await fireEvent.keyDown(input(), { key: 'Escape' });
    await vi.advanceTimersByTimeAsync(300);
    expect(first.content.value.search).not.toHaveBeenCalled();
    expect(first.content.value.clearHighlights).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledExactlyOnceWith(false);
    expect(screen.queryByRole('textbox', { name: 'Search content' })).toBeNull();
  });

  it('handles no matches and contents without scrolling support', async () => {
    vi.useFakeTimers();
    const search = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(1);
    render(FloatingSearchBox, { props: { modelValue: true, activeContents: [{ content: { value: { search } } }] } });
    await fireEvent.update(input(), 'missing');
    await fireEvent.keyDown(input(), { key: 'Enter' });
    await vi.advanceTimersByTimeAsync(300);
    expect(search).toHaveBeenCalledExactlyOnceWith('missing');
    expect(screen.queryByTitle('Next result (Enter)')).toBeNull();

    await fireEvent.update(input(), 'found');
    await vi.advanceTimersByTimeAsync(300);
    expect(screen.getByText('1/1')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Close search' }));
    expect(screen.queryByText('1/1')).toBeNull();
  });
});
