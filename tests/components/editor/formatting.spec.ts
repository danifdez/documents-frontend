import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import EditorContent from '@/components/editor/EditorContent.vue';
import { useFeatureStore } from '@/store/featureStore';
import type { CanvasRecord } from '@/types/canvas';

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('@/services/api', () => ({ default: api }));

const snippet = 'Archive inventory';
const doc = (html: string) => new DOMParser().parseFromString(html, 'text/html');
const title = (name: string | RegExp) => screen.getByTitle(name);
const button = (name: string) => screen.getByRole('button', { name });
const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;
let wrapper: VueWrapper<InstanceType<typeof EditorContent>> | undefined;
const editor = () => wrapper!.vm.editor!;
const content = () => wrapper!.get('.ProseMirror').element;
const alert = vi.fn();

async function openEditor(context = 'document', features: Record<string, boolean> = {}, html = `<p>${snippet}</p>`, path = '/document/new') {
  const pinia = createPinia();
  useFeatureStore(pinia).setBackendFeatures(features);
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/document/:id', component: EditorContent }, { path: '/resource/:id', component: EditorContent }] });
  await router.push(path);
  wrapper = mount(EditorContent, {
    props: { content: html, context },
    global: { plugins: [pinia, router] },
    attachTo: document.body,
  });
  await waitFor(() => expect(editor()).toBeTruthy());
  return wrapper;
}

beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockResolvedValue({ data: [] });
  vi.stubGlobal('alert', alert);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('formatting a research document', () => {
  it('applies inline formatting and text alignment to the selected text', async () => {
    await openEditor();
    editor().commands.selectAll();
    await fireEvent.click(title('Bold (Ctrl+B)'));
    await fireEvent.click(title('Italic (Ctrl+I)'));
    await fireEvent.click(title('Underline (Ctrl+U)'));
    await fireEvent.click(title('Strikethrough (Ctrl+Shift+X)'));
    await fireEvent.click(title('Heading 2 (Ctrl+Alt+2)'));
    await fireEvent.click(title('Align Center (Ctrl+Shift+E)'));
    const heading = content().querySelector('h2') as HTMLElement;
    expect(heading.style.textAlign).toBe('center');
    expect(heading.querySelector('strong')?.textContent).toBe(snippet);
    expect(heading.querySelector('em')?.textContent).toBe(snippet);
    expect(heading.querySelector('u')?.textContent).toBe(snippet);
    expect(heading.querySelector('s')?.textContent).toBe(snippet);
  });

  it('adds and removes color and highlight independently', async () => {
    await openEditor();
    editor().commands.selectAll();
    await fireEvent.click(title('Text Color'));
    await fireEvent.click(title('Red'));
    expect(content().querySelector('span[style]')).toHaveProperty('textContent', snippet);
    expect(editor().getAttributes('textStyle').color).toBe('#EF4444');
    await fireEvent.click(title('Background Color'));
    await fireEvent.click(title('Light Blue'));
    expect(content().querySelector('mark')?.textContent).toBe(snippet);
    await fireEvent.click(title('Text Color'));
    await fireEvent.click(button('Remove color'));
    expect(editor().getAttributes('textStyle').color).toBeFalsy();
    expect(editor().getAttributes('highlight').color).toBe('#DBEAFE');
    await fireEvent.click(title('Background Color'));
    await fireEvent.click(button('Remove highlight'));
    expect(content().querySelector('mark')).toBeNull();
  });

  it('inserts and removes a normalized link across selected text', async () => {
    await openEditor();
    editor().commands.setTextSelection({ from: 1, to: 8 });
    await fireEvent.click(title('Insert/Edit Link (Ctrl+K)'));
    await waitFor(() => expect(field('Link text').value).toBe('Archive'));
    await fireEvent.click(button('Apply'));
    expect(content().querySelector('a')).toBeNull();
    await fireEvent.update(field('Link URL'), 'archive.example/catalogue');
    await fireEvent.keyDown(field('Link URL'), { key: 'Enter' });
    const linked = content().querySelector('a')!;
    expect(linked.textContent).toBe('Archive');
    expect(linked.getAttribute('href')).toBe('https://archive.example/catalogue');
    expect(linked.getAttribute('target')).toBe('_blank');

    editor().commands.setTextSelection(3);
    await fireEvent.click(title('Insert/Edit Link (Ctrl+K)'));
    await waitFor(() => expect(field('Link URL').value).toBe('https://archive.example/catalogue'));
    await fireEvent.click(button('Remove'));
    expect(content().querySelector('a')).toBeNull();
  });

  it('inserts a custom link label when the cursor has no selection and closes on outside click', async () => {
    await openEditor();
    editor().commands.setTextSelection(1);
    await fireEvent.click(title('Insert/Edit Link (Ctrl+K)'));
    await fireEvent.update(field('Link URL'), 'mailto:records@example.org');
    await fireEvent.update(field('Link text'), 'Contact records');
    await fireEvent.click(button('Apply'));
    expect(content().querySelector('a')?.outerHTML).toContain('href="mailto:records@example.org"');
    expect(content().querySelector('a')?.textContent).toBe('Contact records');
    await fireEvent.click(title('Insert/Edit Link (Ctrl+K)'));
    await fireEvent.click(document.body);
    expect(screen.queryByLabelText('Link URL')).toBeNull();
  });

  it('saves a trimmed formula and serializes a direct video URL', async () => {
    const view = await openEditor();
    editor().commands.setTextSelection(snippet.length + 1);
    await fireEvent.click(title('Math Formula (Ctrl+Shift+M)'));
    await fireEvent.click(button('Insert'));
    expect(content().querySelector('[data-formula]')).toBeNull();
    await fireEvent.update(field('Math formula'), '  a^2+b^2=c^2 ');
    await fireEvent.click(button('Insert'));
    expect(editor().getHTML()).toContain('data-formula="a^2+b^2=c^2"');
    await fireEvent.click(title('Insert Video (Ctrl+Shift+V)'));
    await fireEvent.update(field('Video URL'), ' https://media.example/lecture.mp4 ');
    await fireEvent.keyDown(field('Video URL'), { key: 'Enter' });
    expect(editor().getHTML()).toContain('data-video-src="https://media.example/lecture.mp4"');
    expect(editor().getHTML()).toContain('<video');
    expect(view.emitted('content-change')?.length).toBeGreaterThan(0);
  });

  it('creates a syntax-labelled block and converts it back to a paragraph', async () => {
    await openEditor();
    editor().commands.setTextSelection(4);
    await fireEvent.click(title('Code Block (Ctrl+Alt+C)'));
    await fireEvent.click(button('Python'));
    expect(editor().getAttributes('codeBlock')).toMatchObject({ language: 'python' });
    expect(content().querySelector('pre code')?.textContent).toBe(snippet);
    await fireEvent.click(title('Code Block (Ctrl+Alt+C)'));
    expect(content().querySelector('pre')).toBeNull();
    expect(content().querySelector('p')?.textContent).toBe(snippet);
  });

  it('opens a comment for selected text and prompts for a selection before applying a mark', async () => {
    await openEditor();
    editor().commands.setTextSelection(2);
    await fireEvent.click(title('Add Comment (Ctrl+Alt+C)'));
    await fireEvent.click(title('Important Mark'));
    expect(alert).toHaveBeenCalledWith('Please select some text to comment on');
    expect(alert).toHaveBeenCalledWith('Select text first to apply a mark');
    editor().commands.setTextSelection({ from: 1, to: 8 });
    await fireEvent.click(title('Add Comment (Ctrl+Alt+C)'));
    expect(await screen.findByText('"Archive"')).toBeTruthy();
    await fireEvent.click(button('Cancel'));
    expect(api.post).not.toHaveBeenCalled();
  });

  it('keeps writing controls available when optional research features are disabled', async () => {
    await openEditor('document', { datasets: false, canvas: false, timelines: false, bibliography: false });
    expect(screen.queryByTitle('Insert Dataset View')).toBeNull();
    expect(screen.queryByTitle('Insert Dataset Chart')).toBeNull();
    expect(screen.queryByTitle('Insert Canvas')).toBeNull();
    expect(screen.queryByTitle('Insert Timeline')).toBeNull();
    expect(screen.queryByTitle('Insert Reference')).toBeNull();
    expect(title('Bold (Ctrl+B)')).toBeTruthy();
  });
});

describe('inserting research material from the editor', () => {
  const fields = [
    { key: 'city', name: 'City', type: 'text', required: false },
    { key: 'pages', name: 'Pages', type: 'number', required: false },
  ];
  const dataset = { id: 4, name: 'Inventory', schema: fields };

  it('embeds a dataset with the selected fields and only completed filters', async () => {
    api.get.mockImplementation(async (path) => {
      if (path === '/datasets') return { data: [dataset] };
      if (path === '/datasets/4') return { data: dataset };
      if (path === '/datasets/4/records') return { data: { records: [{ id: 10, data: { city: 'Madrid', pages: 15 } }], total: 1 } };
      return { data: [] };
    });
    await openEditor();
    await fireEvent.click(title('Insert Dataset View'));
    expect((button('Insert') as HTMLButtonElement).disabled).toBe(true);
    await screen.findByRole('option', { name: 'Inventory' });
    await fireEvent.update(screen.getByLabelText('Dataset *'), '4');
    await fireEvent.click(button('Deselect all'));
    expect((button('Insert') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.click(screen.getByRole('checkbox', { name: /City/ }));
    await fireEvent.click(button('Add filter'));
    await fireEvent.update(screen.getByLabelText('Filter field'), 'pages');
    await fireEvent.update(screen.getByLabelText('Filter operator'), 'gt');
    await fireEvent.update(screen.getByLabelText('Filter value'), '10');
    await fireEvent.click(button('Add filter'));
    await fireEvent.click(button('Insert'));
    const view = doc(editor().getHTML()).querySelector('[data-dataset-view]')!;
    expect(view.getAttribute('data-dataset-id')).toBe('4');
    expect(JSON.parse(view.getAttribute('data-fields')!)).toEqual(['city']);
    expect(JSON.parse(view.getAttribute('data-filters')!)).toEqual([{ field: 'pages', operator: 'gt', value: '10' }]);
    expect(await screen.findByRole('cell', { name: 'Madrid' })).toBeTruthy();
  });

  it('embeds a selected canvas by identifier and loads its current node data', async () => {
    const details: CanvasRecord = { id: 4, name: 'Board of findings', updatedAt: '', canvasData: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } } };
    api.get.mockImplementation(async (path) => {
      if (path === '/canvases') return { data: [details] };
      if (path === '/canvases/4') return { data: details };
      return { data: [] };
    });
    await openEditor();
    await fireEvent.click(title('Insert Canvas'));
    expect((button('Insert') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.click(await screen.findByRole('button', { name: /Board of findings/ }));
    await fireEvent.click(button('Insert'));
    const embedded = doc(editor().getHTML()).querySelector('[data-canvas-view]')!;
    expect(embedded.getAttribute('data-canvas-id')).toBe('4');
    expect(embedded.getAttribute('data-canvas-name')).toBe('Board of findings');
    expect(await screen.findByText('Empty canvas')).toBeTruthy();
  });

  it('uses the table at the cursor, infers column types and replaces the table with the created dataset', async () => {
    const created = { id: 4, name: 'Table inventory', schema: fields };
    api.get.mockImplementation(async (path) => {
      if (path === '/datasets/4') return { data: created };
      if (path === '/datasets/4/records') return { data: { records: [], total: 0 } };
      return { data: [] };
    });
    api.post.mockResolvedValue({ data: { dataset: created, imported: 1, errors: [] } });
    const table = '<table><thead><tr><th>City</th><th>Pages</th></tr></thead><tbody><tr><td>Madrid</td><td>15</td></tr></tbody></table>';
    await openEditor('document', {}, table);
    editor().commands.setTextSelection(5);
    await fireEvent.click(title('Convert Table to Dataset'));
    expect((screen.getByLabelText('Type for City') as HTMLSelectElement).value).toBe('text');
    expect((screen.getByLabelText('Type for Pages') as HTMLSelectElement).value).toBe('number');
    await fireEvent.update(screen.getByLabelText('Dataset name'), '  Table inventory  ');
    await fireEvent.click(button('Create Dataset'));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/datasets/from-table', {
      name: 'Table inventory', headers: ['City', 'Pages'], rows: [['Madrid', '15']], projectId: null,
    });
    expect(await screen.findByRole('button', { name: 'Open Dataset' })).toBeTruthy();
    const richText = doc(editor().getHTML());
    expect(richText.querySelector('table')).toBeNull();
    expect(richText.querySelector('[data-dataset-id="4"]')).toBeTruthy();
  });

  it('inserts a reference to a searched resource using its stable identifier', async () => {
    api.get.mockImplementation(async (path) => {
      if (path === '/reference/search') return { data: [{ id: '17', type: 'resource', name: 'Archive register', content: 'Inventory provenance' }] };
      return { data: [] };
    });
    await openEditor();
    await fireEvent.click(title('Insert Reference'));
    const search = screen.getByLabelText('Search references');
    await fireEvent.update(search, 'A');
    expect(screen.getByText('Type at least 2 characters.')).toBeTruthy();
    await fireEvent.update(search, 'Archive');
    await fireEvent.click(await screen.findByText('Archive register'));
    expect(api.get).toHaveBeenCalledWith('/reference/search', { params: { q: 'Archive' } });
    const reference = doc(editor().getHTML()).querySelector('[data-ref-id="17"]')!;
    expect(reference.getAttribute('data-ref-type')).toBe('resource');
    expect(reference.getAttribute('data-label')).toBe('Archive register');
  });
});

describe('editor annotations', () => {
  const selected = { from: 8, to: 17 };
  const text = '<p>Review inventory today</p>';
  const commentButton = () => title('Add Comment (Ctrl+Alt+C)');

  it('saves a document comment with its quote and surrounding context and attaches the returned ID', async () => {
    const view = await openEditor('document', {}, text, '/document/25');
    api.post.mockResolvedValue({ data: { id: 'comment-25' } });
    await fireEvent.click(commentButton());
    expect(alert).toHaveBeenCalledWith('Please select some text to comment on');
    editor().commands.setTextSelection(selected);
    await fireEvent.click(commentButton());
    expect(screen.getByText('"inventory"')).toBeTruthy();
    expect((button('Save') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.update(field('Comment'), 'Verify the count');
    await fireEvent.click(button('Save'));

    expect(api.post).toHaveBeenCalledExactlyOnceWith('/comments', {
      doc: 25, content: 'Verify the count', quote: 'inventory', prefix: 'Review ', suffix: ' today', position: 7,
    });
    await waitFor(() => expect(view.emitted('comment-created')).toEqual([[]]));
    expect(view.emitted('toggle-comments')).toEqual([[true]]);
    expect(doc(editor().getHTML()).querySelector('[data-comment-id="comment-25"]')?.textContent).toBe('inventory');
  });

  it('cancels a draft and keeps the dialog open when saving a resource comment fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await openEditor('resource', {}, text, '/resource/27');
    editor().commands.setTextSelection(selected);
    await fireEvent.click(commentButton());
    await fireEvent.update(field('Comment'), 'Draft');
    await fireEvent.click(button('Cancel'));
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Add Comment' })).toBeNull();

    api.post.mockRejectedValueOnce({ response: { data: { message: 'Resource unavailable' } } });
    editor().commands.setTextSelection(selected);
    await fireEvent.click(commentButton());
    expect((screen.getByRole('textbox', { name: 'Comment' }) as HTMLTextAreaElement).value).toBe('');
    await fireEvent.update(field('Comment'), 'Verify the resource');
    await fireEvent.click(button('Save'));
    await waitFor(() => expect(log).toHaveBeenCalled());
    expect(api.post).toHaveBeenCalledWith('/comments', expect.objectContaining({ resource: 27, quote: 'inventory' }));
    expect(screen.getByRole('heading', { name: 'Add Comment' })).toBeTruthy();
    expect(doc(editor().getHTML()).querySelector('[data-comment-id]')).toBeNull();
  });

  it('applies an anchored mark, scrolls to it from the gutter and removes it on a second use', async () => {
    await openEditor('document', {}, text, '/document/25');
    api.post.mockResolvedValue({ data: { id: 'mark-25' } });
    api.delete.mockResolvedValue({ data: {} });
    await fireEvent.click(title('Idea Mark'));
    expect(alert).toHaveBeenCalledWith('Select text first to apply a mark');
    editor().commands.setTextSelection(selected);
    await fireEvent.click(title('Idea Mark'));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/marks', {
      doc: 25, content: 'inventory', type: 'idea', prefix: 'Review ', suffix: ' today', position: 7,
    });
    const element = await waitFor(() => {
      const node = content().querySelector('[data-mark-id="mark-25"]');
      expect(node?.textContent).toBe('inventory');
      return node!;
    });
    const scroll = vi.spyOn(element as HTMLElement, 'scrollIntoView');
    await fireEvent.click(await screen.findByTitle('Idea: inventory'));
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ behavior: 'smooth', block: 'center' });
    editor().commands.setTextSelection(10);
    await fireEvent.click(title('Idea Mark'));
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/marks/mark-25');
    expect(doc(editor().getHTML()).querySelector('[data-mark-id="mark-25"]')).toBeNull();
  });
});
