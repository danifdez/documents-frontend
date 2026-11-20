import { fireEvent, screen, within } from '@testing-library/vue';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TableOfContents from '@/components/editor/TableOfContents.vue';
import { useReadingPointsController } from '@/components/readingPoints/useReadingPointsController';
import type { ReadingPoint } from '@/services/readingPoints/useReadingPoints';

const { api } = vi.hoisted(() => ({ api: { get: vi.fn() } }));
vi.mock('@/services/api', () => ({ default: api }));

const html = '<h1>Introduction!</h1><p>Sources checked</p><h2>Primary records</h2><h2></h2><h3>Appendix</h3>';
const reading: ReadingPoint = {
  id: 30, kind: 'reading', label: null, fragmentId: null, exact: null, prefix: null, suffix: null,
  position: 0, ratio: 0.5,
};
const bookmark: ReadingPoint = { ...reading, id: 31, kind: 'section', label: 'Provenance', exact: 'Sources checked', position: 18 };
const button = (name: string | RegExp) => screen.getByRole('button', { name });
let scroller: HTMLElement;
let view: VueWrapper<InstanceType<typeof TableOfContents>> | undefined;
let editor: Editor | undefined;

function createEditor(content = html) {
  const target = document.createElement('div');
  scroller.append(target);
  editor = new Editor({ extensions: [StarterKit], element: target, content });
  return editor;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  api.get.mockResolvedValue({ data: [reading, bookmark] });
  scroller = document.createElement('section');
  scroller.className = 'editor-content';
  scroller.style.overflowY = 'auto';
  document.body.append(scroller);
});

afterEach(async () => {
  await vi.runOnlyPendingTimersAsync();
  view?.unmount();
  editor?.destroy();
  view = undefined;
  editor = undefined;
  scroller.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('editor table of contents', () => {
  it('extracts headings and indentation and refreshes them when the editor changes', async () => {
    const documentEditor = createEditor();
    view = mount(TableOfContents, { props: { editor: documentEditor }, attachTo: document.body });
    await vi.advanceTimersByTimeAsync(350);
    expect(within(screen.getByRole('navigation')).getAllByRole('button').map((entry) => entry.textContent?.trim())).toEqual([
      'Introduction!', 'Primary records', 'Appendix',
    ]);
    expect(button('Introduction!').style.paddingLeft).toBe('16px');
    expect(button('Primary records').style.paddingLeft).toBe('28px');
    expect(button('Appendix').style.paddingLeft).toBe('40px');

    documentEditor.commands.setContent('<h2>Revised chapter</h2>');
    await vi.advanceTimersByTimeAsync(150);
    expect(button('Revised chapter')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Primary records' })).toBeNull();
  });

  it('emits the actual ProseMirror position and scrolls the heading into view as a fallback', async () => {
    const documentEditor = createEditor();
    view = mount(TableOfContents, { props: { editor: documentEditor }, attachTo: document.body });
    const scroll = vi.spyOn(scroller, 'scrollTo').mockImplementation(() => {});
    scroller.scrollTop = 90;
    vi.spyOn(scroller, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 80, 400, 300));
    const target = documentEditor.view.dom.querySelector('h2')!;
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 250, 300, 28));
    await vi.advanceTimersByTimeAsync(350);
    await fireEvent.scroll(scroller);
    await fireEvent.click(button('Primary records'));
    const position = documentEditor.state.doc.child(0).nodeSize + documentEditor.state.doc.child(1).nodeSize;
    expect(view.emitted('scrollTo')).toEqual([[position]]);
    await vi.advanceTimersByTimeAsync(310);
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ top: 240, behavior: 'smooth' });
  });

  it('interleaves bookmarks and reading progress and scrolls to the chosen point', async () => {
    const documentEditor = createEditor();
    const controller = useReadingPointsController(() => '3', 'doc');
    Object.defineProperties(scroller, {
      scrollHeight: { configurable: true, value: 1190 },
      clientHeight: { configurable: true, value: 390 },
    });
    const scroll = vi.spyOn(scroller, 'scrollTo').mockImplementation(() => {});
    view = mount(TableOfContents, {
      props: { editor: documentEditor, target: scroller, controller },
      attachTo: document.body,
    });
    await flushPromises();
    await vi.advanceTimersByTimeAsync(350);
    expect(api.get).toHaveBeenCalledWith('/reading-points/doc/3');
    const entries = within(screen.getByRole('navigation')).getAllByRole('button').map((entry) => entry.getAttribute('title'));
    expect(entries).toEqual(['Introduction!', 'Provenance', 'Primary records', 'Appendix', 'Marca de lectura']);
    await fireEvent.click(button(/Marca de lectura/));
    const margin = Math.min(160, Math.max(60, Math.round(window.innerHeight * 0.2)));
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ top: 400 - margin, behavior: 'smooth' });
  });

  it('shows the empty state and refreshes with no attached editor', async () => {
    view = mount(TableOfContents, { props: { editor: null }, attachTo: document.body });
    expect(screen.getByText('No headings found')).toBeTruthy();
    await fireEvent.click(screen.getByTitle('Refresh'));
    await nextTick();
    expect(screen.getByText('No headings found')).toBeTruthy();
    expect(api.get).not.toHaveBeenCalled();
  });
});
