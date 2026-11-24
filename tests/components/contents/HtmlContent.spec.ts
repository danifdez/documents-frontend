import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import HtmlContent from '@/components/contents/HtmlContent.vue';
import { useProjectStore } from '@/store/projectStore';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/services/api', () => ({ default: api }));

const initial = '<h2>Field notes</h2><h2>Field notes</h2><p>Read García’s report.</p><p>A. Garcia filed an update.</p>';
let wrapper: VueWrapper<InstanceType<typeof HtmlContent>> | undefined;
const contentRoot = () => wrapper!.get('.resource-detail').element as HTMLElement;
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const select = (host: Element, text: string) => {
  const node = host.firstChild!;
  const offset = node.textContent!.indexOf(text);
  expect(offset).toBeGreaterThanOrEqual(0);
  const range = document.createRange();
  range.setStart(node, offset);
  range.setEnd(node, offset + text.length);
  const selected = window.getSelection()!;
  selected.removeAllRanges();
  selected.addRange(range);
};
async function openContent(content = initial, overrides: { resourceId?: string; hasWorkspace?: boolean } = {}) {
  const pinia = createPinia();
  useProjectStore(pinia).setCurrentProject({
    id: 8, name: 'Archive', description: null, status: 'active', createdAt: '', updatedAt: '',
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/resource/:id', component: HtmlContent },
      { path: '/knowledge-base/:id', component: { template: '<p>Knowledge</p>' } },
    ],
  });
  await router.push(`/resource/${overrides.resourceId ?? '17'}`);
  wrapper = mount(HtmlContent, {
    props: { content, resourceId: '17', hasWorkspace: true, ...overrides },
    global: { plugins: [router, pinia] },
    attachTo: document.body,
  });
  return { view: wrapper, router };
}

beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockResolvedValue({ data: [] });
  api.patch.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({ data: {} });
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  window.getSelection()?.removeAllRanges();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('reading extracted documents', () => {
  it('gives repeated headings distinct links, scrolls to the right heading and rebuilds the TOC', async () => {
    const { view } = await openContent();
    await waitFor(() => expect(view.vm.toc).toEqual([
      { id: 'field-notes', text: 'Field notes', level: 2 },
      { id: 'field-notes-1', text: 'Field notes', level: 2 },
    ]));
    view.vm.scrollToHeading('field-notes-1');
    expect(contentRoot().querySelector('#field-notes-1')?.classList.contains('toc-target')).toBe(true);
    expect(contentRoot().querySelector('#field-notes')?.classList.contains('toc-target')).toBe(false);

    await view.setProps({ content: '<h3 id="annex">A new annex</h3><h2></h2>' });
    await waitFor(() => expect(view.vm.toc).toEqual([{ id: 'annex', text: 'A new annex', level: 3 }]));
  });

  it('highlights literal text matches, scrolls through them and preserves the original document on clear', async () => {
    const { view } = await openContent('<p>A [box] of records</p><p>Second [BOX] of records</p><p>This box is plain</p>');
    expect(view.vm.search('[box]')).toBe(2);
    expect([...contentRoot().querySelectorAll('mark')].map((mark) => mark.textContent)).toEqual(['[box]', '[BOX]']);
    view.vm.scrollTo(1);
    expect(contentRoot().querySelector('mark.active-highlight')?.textContent).toBe('[BOX]');
    view.vm.clearHighlights();
    expect(contentRoot().querySelector('mark')).toBeNull();
    expect(contentRoot().textContent).toBe('A [box] of recordsSecond [BOX] of recordsThis box is plain');
  });

  it('finds evidence spanning inline elements and clears the previous evidence for another query', async () => {
    const { view } = await openContent('<p>The  first <strong>reference</strong> is recorded.</p>');
    expect(view.vm.focusEvidence('first reference is recorded')).toBe(true);
    expect([...contentRoot().querySelectorAll('mark.evidence-highlight')].map((mark) => mark.textContent))
      .toEqual(['first ', 'reference', ' is recorded']);
    expect(contentRoot().querySelector('strong mark')?.textContent).toBe('reference');
    expect(view.vm.focusEvidence('nonexistent phrase')).toBe(false);
    expect(contentRoot().querySelector('mark')).toBeNull();
  });

  it('matches accent-insensitive entity aliases and keeps an existing annotation intact', async () => {
    const { view } = await openContent(
      '<p>García wrote this.</p><p>The archive stores AGarciaB byline.</p><p><span class="comment-mark">García</span> also signed.</p>',
    );
    view.vm.highlightEntity('Garcia', ['Archivist']);
    expect([...contentRoot().querySelectorAll('mark.entity-highlight')].map((mark) => mark.textContent))
      .toEqual(['García', 'Garcia']);
    expect(contentRoot().querySelector('.comment-mark mark')).toBeNull();

    view.vm.highlightEntity('', []);
    expect(contentRoot().querySelectorAll('mark')).toHaveLength(0);
    expect(contentRoot().querySelector('.comment-mark')?.textContent).toBe('García');
  });

  it('applies editor settings read through the Electron bridge', async () => {
    vi.stubGlobal('electronAPI', { getSettings: vi.fn().mockResolvedValue({ fontSize: 20, fontFamily: 'serif', paragraphSpacing: 1.75 }) });
    await openContent();
    await waitFor(() => expect(contentRoot().style.getPropertyValue('--font-size-p')).toBe('20'));
    expect(contentRoot().style.getPropertyValue('--font-family')).toBe('serif');
    expect(contentRoot().style.getPropertyValue('--paragraph-spacing')).toBe('1.75');
  });
});

describe('annotations and selected text', () => {
  it('restores stored annotations and removes the selected mark by id', async () => {
    api.get.mockImplementation(async (url) => ({ data: url === '/marks/resource/17'
      ? [{ id: '5', content: 'García', type: 'idea' }]
      : url === '/comments/resource/17' ? [{ id: '6', quote: 'update' }, { id: '7' }] : [] }));
    const { view } = await openContent();
    await waitFor(() => expect(contentRoot().querySelector('[data-mark-id="5"]')?.textContent).toBe('García'));
    expect(contentRoot().querySelector('[data-comment-id="6"]')?.textContent).toBe('update');
    expect(contentRoot().querySelector('[data-comment-id="7"]')).toBeNull();
    view.vm.highlightComment('6');
    expect(contentRoot().querySelector<HTMLElement>('[data-comment-id="6"]')?.style.transition).toBe('background-color 0.5s ease');

    await fireEvent.contextMenu(contentRoot().querySelector('[data-mark-id="5"]')!);
    await fireEvent.click(screen.getByText('Eliminar'));
    await waitFor(() => expect(view.emitted('content-updated')).toHaveLength(1));
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/marks/5');
    expect(contentRoot().querySelector('[data-mark-id="5"]')).toBeNull();
    expect(contentRoot().textContent).toContain('García');
    expect(contentRoot().querySelector('[data-comment-id="6"]')).toBeTruthy();

    await fireEvent.contextMenu(contentRoot().querySelector('[data-comment-id="6"]')!);
    await fireEvent.click(screen.getByText('Eliminar'));
    await waitFor(() => expect(contentRoot().querySelector('[data-comment-id="6"]')).toBeNull());
    expect(api.patch).toHaveBeenCalledWith('/resources/17', { content: contentRoot().innerHTML });
  });

  it('creates a highlight with its location and saves the annotated HTML', async () => {
    api.post.mockResolvedValue({ data: { id: '19' } });
    await openContent('<p>Archive register A</p>');
    const p = contentRoot().querySelector('p')!;
    select(p, 'register');
    await fireEvent.keyDown(p, { key: 'h', ctrlKey: true });
    await waitFor(() => expect(contentRoot().querySelector('[data-mark-id="19"]')?.textContent).toBe('register'));
    expect(api.post).toHaveBeenCalledWith('/marks', {
      resource: 17, content: 'register', type: 'highlight', prefix: 'Archive ', suffix: ' A', position: 8,
    });
    expect(api.patch).toHaveBeenCalledWith('/resources/17', {
      content: expect.stringContaining('data-mark-type="highlight"'),
    });
  });

  it('captures the comment selection and stores the quote, prefix and suffix', async () => {
    api.post.mockResolvedValue({ data: { id: '12' } });
    await openContent('<p>See the archives for context.</p>');
    const term = contentRoot().querySelector('p')!;
    select(term, 'archives');
    await fireEvent.keyDown(term, { key: 'C', ctrlKey: true, shiftKey: true });
    const comment = screen.getByRole('textbox', { name: 'Comment' });
    expect(screen.getByText('"archives"')).toBeTruthy();
    expect((button('Save') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.update(comment, 'Cross-check the year.');
    await fireEvent.click(button('Save'));
    await waitFor(() => expect(contentRoot().querySelector('[data-comment-id="12"]')?.textContent).toBe('archives'));
    expect(api.post).toHaveBeenCalledWith('/comments', {
      resource: 17, content: 'Cross-check the year.', quote: 'archives',
      prefix: 'See the ', suffix: ' for context.', position: 8,
    });
  });

  it.each([
    ['Send to workspace', 'send-selection-to-workspace'],
    ['Send to document', 'send-selection-to-doc'],
    [/Summarize selection/, 'summarize-selection'],
  ] as const)('forwards the selected text through %s', async (action, event) => {
    const { view } = await openContent('<p>Review the primary source.</p>');
    const term = contentRoot().querySelector('p')!;
    select(term, 'primary source');
    await fireEvent.contextMenu(term);
    await fireEvent.click(button(action));
    expect(view.emitted(event)).toEqual([['primary source']]);
    expect(window.getSelection()?.rangeCount).toBe(0);
  });

  it('searches the knowledge base using the selected phrase and opens a result', async () => {
    api.get.mockImplementation(async (url) => ({ data: url === '/knowledge-entries'
      ? [{ id: 8, title: 'Primary records', summary: 'Original holdings' }] : [] }));
    const { router } = await openContent('<p>Primary records are stored here.</p>');
    const term = contentRoot().querySelector('p')!;
    select(term, 'Primary records');
    await fireEvent.contextMenu(term);
    await fireEvent.click(button('Search in KB'));
    await fireEvent.click(await screen.findByRole('button', { name: /Primary records/ }));
    expect(api.get).toHaveBeenCalledWith('/knowledge-entries', { params: { q: 'Primary records' } });
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/knowledge-base/8'));
  });

  it('uploads an embedded image with its resource and project context', async () => {
    const imgSrc = 'data:image/png;base64,aW1hZ2U=';
    const fetch = vi.fn().mockResolvedValue({ blob: async () => new Blob(['image'], { type: 'image/png' }) });
    vi.stubGlobal('fetch', fetch);
    api.post.mockResolvedValue({ data: { resourceId: 31 } });
    const { view } = await openContent(`<img src="${imgSrc}" alt="Title page">`);
    await fireEvent.contextMenu(screen.getByAltText('Title page'));
    await fireEvent.click(screen.getByText('Save image as resource'));
    await waitFor(() => expect(view.emitted('content-updated')).toHaveLength(1));
    const [path, form, config] = api.post.mock.lastCall!;
    expect(fetch).toHaveBeenCalledExactlyOnceWith(imgSrc);
    expect(path).toBe('/resources/upload');
    expect(form.get('file')).toMatchObject({ type: 'image/png', size: 5 });
    expect(form.get('projectId')).toBe('8');
    expect(form.get('relatedTo')).toBe('17');
    expect(form.get('url')).toBe(imgSrc);
    expect(form.get('name')).toBe('Title page');
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
  });

  it('ignores same-origin images, dismisses the context menu and reports a remote download failure', async () => {
    const remote = 'https://archive.example/cover.jpg';
    const failure = new Error('Image unavailable');
    const download = vi.fn().mockRejectedValue(failure);
    const alert = vi.fn();
    vi.stubGlobal('fetch', download);
    vi.stubGlobal('alert', alert);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { view } = await openContent(
      '<img src="/cover.jpg" alt="Local cover"><img src="' + remote + '" alt="Remote cover">',
    );

    await fireEvent.contextMenu(screen.getByAltText('Local cover'));
    expect(screen.queryByText('Save image as resource')).toBeNull();

    const image = screen.getByAltText('Remote cover');
    await fireEvent.contextMenu(image);
    expect(screen.getByText('Save image as resource')).toBeTruthy();
    await fireEvent.click(document.body);
    expect(screen.queryByText('Save image as resource')).toBeNull();

    await fireEvent.contextMenu(image);
    await fireEvent.click(screen.getByText('Save image as resource'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Failed to import image as resource.'));
    expect(download).toHaveBeenCalledWith(remote);
    expect(api.post).not.toHaveBeenCalled();
    expect(view.emitted('content-updated')).toBeUndefined();
    expect(screen.queryByText('Save image as resource')).toBeNull();
  });
});
