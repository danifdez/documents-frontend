import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { markRaw } from 'vue';
import Toolbar from '@/components/contents/Toolbar.vue';
import MarkExtension from '@/components/editor/extensions/MarkExtension';

const { api, alert } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }, alert: vi.fn(),
}));
vi.mock('@/services/api', () => ({ default: api }));

let editor: Editor | undefined;
const text = '<p>Report inventory entries</p>';
const tagged = { from: 8, to: 17 };

async function openToolbar(id = '17') {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/resource/:id', component: Toolbar }] });
  await router.push('/resource/' + id);
  editor = markRaw(new Editor({ extensions: [StarterKit, MarkExtension], content: text }));
  const view = render(Toolbar, { props: { editor }, global: { plugins: [router, createPinia()] } });
  await Promise.resolve();
  await Promise.resolve();
  return { view, editor };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('alert', alert);
  api.get.mockResolvedValue({ data: [] });
  api.post.mockResolvedValue({ data: { id: 'm-17' } });
  api.patch.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({ data: {} });
});

afterEach(() => {
  editor?.destroy();
  editor = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('resource toolbar with an editable document', () => {
  it('creates a mark with its selected passage, then toggles that specific mark off', async () => {
    const { view, editor } = await openToolbar();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/marks/resource/17'));
    await fireEvent.keyDown(document.body, { key: 'h', ctrlKey: true });
    expect(alert).toHaveBeenCalledWith('Please select some text to highlight');
    editor.commands.setTextSelection(tagged);
    await fireEvent.keyDown(document.body, { key: 'h', ctrlKey: true });
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/marks', {
      resource: 17, content: 'inventory', type: 'highlight', prefix: 'Report ', suffix: ' entries', position: 7,
    });
    await waitFor(() => expect(editor.getHTML()).toContain('data-mark-id="m-17"'));
    expect(view.emitted('add-mark')).toEqual([[{ markId: 'm-17', text: 'inventory', ...tagged, type: 'highlight' }]]);
    editor.commands.setTextSelection(10);
    await fireEvent.keyDown(document.body, { key: 'h', ctrlKey: true });
    await waitFor(() => expect(view.emitted('remove-mark')).toEqual([['m-17']]));
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/marks/m-17');
    expect(editor.getHTML()).not.toContain('data-mark-id');
  });

  it('rejects an unsaved resource and reports mark creation failure for a saved one', async () => {
    const unsaved = await openToolbar('new');
    unsaved.editor.commands.setTextSelection(tagged);
    await fireEvent.keyDown(document.body, { key: 'h', ctrlKey: true });
    expect(alert).toHaveBeenCalledExactlyOnceWith('Resource must be saved before adding marks');
    expect(api.post).not.toHaveBeenCalled();
    unsaved.view.unmount();
    unsaved.editor.destroy();

    const saved = await openToolbar();
    api.post.mockRejectedValueOnce(new Error('Save failed'));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/marks/resource/17'));
    saved.editor.commands.setTextSelection(tagged);
    await fireEvent.keyDown(document.body, { key: 'h', ctrlKey: true });
    await waitFor(() => expect(alert).toHaveBeenLastCalledWith('Failed to create mark. Please try again.'));
    expect(saved.editor.getHTML()).not.toContain('data-mark-id');
  });

  it('restores a stored mark, saves edits to its contents and detaches editor listeners on teardown', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    api.get.mockResolvedValue({ data: [
      { id: 'm-1', type: 'idea', content: 'inventory' },
      { id: 'm-2', type: 'review', content: 'absent' },
    ] });
    vi.useFakeTimers();
    const { view, editor } = await openToolbar();
    await vi.advanceTimersByTimeAsync(500);
    expect(editor.getHTML()).toContain('data-mark-id="m-1"');
    expect(warn).toHaveBeenCalledWith('Mark content not found in document: absent');
    const off = vi.spyOn(editor, 'off');
    editor.commands.insertContentAt({ from: 9, to: 11 }, 'XX');
    await vi.advanceTimersByTimeAsync(0);
    expect(api.patch).toHaveBeenCalledWith('/marks/m-1', { content: expect.stringContaining('XX') });
    view.unmount();
    expect(off).toHaveBeenCalledWith('selectionUpdate', expect.any(Function));
    expect(off).toHaveBeenCalledWith('update', expect.any(Function));
    expect(screen.queryByRole('button', { name: /Highlight/ })).toBeNull();
  });
});
