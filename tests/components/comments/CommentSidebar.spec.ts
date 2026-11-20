import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CommentSidebar from '@/components/comments/CommentSidebar.vue';

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('@/services/api', () => ({ default: api }));

const first = { id: '9', content: 'Check the original annual report before publishing the revised figures', createdAt: '2026-01-01T12:00:00Z' };
const newer = { id: '10', content: 'Add the inventory number', createdAt: '2026-01-08T13:00:00Z' };
const rowFor = (text: string) => screen.getByText(text).closest<HTMLElement>('[id^="comment-"]')!;

beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockImplementation(async (url) => {
    if (url === '/comments/doc/7') return { data: structuredClone([newer, first]) };
    if (url === '/comments/resource/41') return { data: [] };
    throw new Error('Could not load comments');
  });
  api.patch.mockResolvedValue({ data: { ...first, content: 'Check the budget report' } });
  api.delete.mockResolvedValue({ data: {} });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('document and resource comment lists', () => {
  it('orders comments by creation date and highlights the selected comment temporarily', async () => {
    const onClick = vi.fn();
    const { container } = render(CommentSidebar, { props: { docId: '7', 'onComment-clicked': onClick } });
    await screen.findByText(first.content);
    expect([...container.querySelectorAll('[id^="comment-"]')].map(({ id }) => id)).toEqual(['comment-9', 'comment-10']);
    expect(api.get).toHaveBeenCalledExactlyOnceWith('/comments/doc/7');
    const olderRow = rowFor(first.content);
    const scroll = vi.spyOn(olderRow, 'scrollIntoView');
    vi.useFakeTimers();
    await fireEvent.click(olderRow);
    expect(onClick).toHaveBeenCalledWith(first.id);
    expect(olderRow.classList.contains('bg-amber-50')).toBe(true);
    await vi.advanceTimersByTimeAsync(100);
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    await vi.advanceTimersByTimeAsync(3000);
    expect(olderRow.classList.contains('bg-amber-50')).toBe(false);
  });

  it('loads the new entity after props change and renders empty and error responses', async () => {
    const view = render(CommentSidebar, { props: { docId: '7' } });
    expect(await screen.findByText(first.content)).toBeTruthy();
    await view.rerender({ docId: undefined, resourceId: '41' });
    expect(await screen.findByText('No comments yet')).toBeTruthy();
    expect(api.get).toHaveBeenLastCalledWith('/comments/resource/41');
    await view.rerender({ resourceId: '42' });
    expect(await screen.findByText('Error loading comments')).toBeTruthy();
    expect(api.get).toHaveBeenLastCalledWith('/comments/resource/42');
  });

  it('cancels editing without saving and updates an existing comment on confirmation', async () => {
    const updated = vi.fn();
    render(CommentSidebar, { props: { docId: '7', 'onComment-updated': updated } });
    await screen.findByText(first.content);
    await fireEvent.click(within(rowFor(first.content)).getByTitle('Edit'));
    expect((screen.getByRole('textbox', { name: 'Edit comment' }) as HTMLTextAreaElement).value).toBe(first.content);
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(api.patch).not.toHaveBeenCalled();

    await fireEvent.click(within(rowFor(first.content)).getByTitle('Edit'));
    await fireEvent.update(screen.getByRole('textbox', { name: 'Edit comment' }), 'Check the budget report');
    await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Check the budget report')).toBeTruthy();
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/comments/9', { content: 'Check the budget report' });
    expect(updated).toHaveBeenCalledWith({ ...first, content: 'Check the budget report' });
  });

  it('preserves the list on cancel or a delete failure and removes the confirmed entry after retry', async () => {
    const deleted = vi.fn();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(CommentSidebar, { props: { docId: '7', 'onComment-deleted': deleted } });
    await screen.findByText(first.content);
    const openDelete = () => fireEvent.click(within(rowFor(first.content)).getByTitle('Delete'));

    const confirm = () => within(screen.getByRole('heading', { name: 'Delete Comment' }).parentElement!.parentElement!).getByRole('button', { name: 'Delete' });
    await openDelete();
    expect(screen.getByText(/"Check the original annual repo\.\.\."/)).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(api.delete).not.toHaveBeenCalled();

    api.delete.mockRejectedValueOnce({ response: { data: { message: 'Already being updated' } } });
    await openDelete();
    await fireEvent.click(confirm());
    await waitFor(() => expect(log).toHaveBeenCalled());
    expect(screen.getByText(first.content)).toBeTruthy();
    expect(deleted).not.toHaveBeenCalled();

    await openDelete();
    await fireEvent.click(confirm());
    await waitFor(() => expect(deleted).toHaveBeenCalledExactlyOnceWith(first.id));
    expect(api.delete).toHaveBeenLastCalledWith('/comments/9');
    expect(screen.queryByText(first.content)).toBeNull();
    expect(screen.getByText(newer.content)).toBeTruthy();
  });
});
