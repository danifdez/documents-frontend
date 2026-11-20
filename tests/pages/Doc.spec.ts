import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import Doc from '@/pages/Doc.vue';
import EditorContent from '@/components/editor/EditorContent.vue';
import type { Project } from '@/types/Project';
import { useProjectStore } from '@/store/projectStore';
import type { DocumentRecord } from '@/services/documents/useDocument';

const { api, subscribe, unsubscribe } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), defaults: { baseURL: '' } },
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
}));
vi.mock('@/services/api', () => ({ default: api }));
vi.mock('@/services/notifications/executionPublication', () => ({ subscribeExecutionPublication: subscribe }));

const project: Project = { id: 7, name: 'Archives', status: 'active' as const, description: null, createdAt: '', updatedAt: '' };
const thread = { id: 8, name: 'Fieldwork', project: { id: 7, name: 'Archives' } };
const original: DocumentRecord = {
  id: 9, name: 'Reference index', content: '<h2>Holdings</h2><p>The first item was sold in 1900.</p>',
  thread: { id: 8, name: 'Fieldwork' }, project: 7,
};
const other: DocumentRecord = { id: 11, name: 'Delivery notes', content: '<p>Item received on Friday.</p>', project: 7 };
let page: VueWrapper<InstanceType<typeof Doc>> | undefined;
const nameInput = () => screen.getByRole('textbox', { name: 'Document name' }) as HTMLInputElement;
const editor = () => page!.findAllComponents(EditorContent)[0].vm.editor!;
const editable = () => page!.get('.ProseMirror').element as HTMLElement;
const button = (name: string) => screen.getByRole('button', { name });

async function openDoc(path = '/document/9') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>Projects</div>' } },
      { path: '/document/:id', component: Doc },
      ...['project', 'thread', 'resource', 'knowledge-base'].map((section) => ({
        path: `/${section}/:id`, component: { template: '<div>Detail</div>' },
      })),
    ],
  });
  const pinia = createPinia();
  useProjectStore(pinia).setCurrentProject(project);
  await router.push(path);
  page = mount(Doc, {
    global: { plugins: [router, pinia], stubs: { TableOfContents: true } },
    attachTo: document.body,
  });
  if (path.startsWith('/document/9')) await waitFor(() => expect(nameInput().value).toBe(original.name));
  else await waitFor(() => expect(nameInput().value).toBe(''));
  return router;
}

function dragData(payload: unknown) {
  const dataTransfer = new DataTransfer();
  dataTransfer.setData('application/json', JSON.stringify(payload));
  return dataTransfer;
}

beforeEach(() => {
  vi.resetAllMocks();
  subscribe.mockReturnValue(unsubscribe);
  api.get.mockImplementation(async (url) => {
    if (url === '/docs/9') return { data: structuredClone(original) };
    if (url === '/docs/11') return { data: structuredClone(other) };
    if (url === '/threads/8') return { data: thread };
    if (url === '/resources/15') return { data: { id: 15, name: 'Source letter', mimeType: 'text/plain' } };
    if (url === '/resources/15/content') return { data: { content: '<p>From the Archive</p>' } };
    if (/^\/(reading-points|comments|marks|bibliography)\//.test(url)) return { data: [] };
    throw new Error(`Unexpected GET ${url}`);
  });
  api.patch.mockResolvedValue({ data: {} });
});

afterEach(() => {
  page?.unmount();
  page = undefined;
  vi.restoreAllMocks();
});

describe('research document editor', () => {
  it('loads a document with its thread and follows an evidence link to the matching text', async () => {
    const router = await openDoc('/document/9?evidence=first+item+was+sold');
    const collection = await screen.findByRole('link', { name: 'Archives' });
    expect(collection.getAttribute('href')).toBe('/project/7');
    expect(screen.getByRole('link', { name: 'Fieldwork' }).getAttribute('href')).toBe('/thread/8');
    expect(editable().querySelector('.evidence-highlight')?.textContent).toBe('first item was sold');
    await router.push('/document/9?evidence=1900');
    await waitFor(() => expect(editable().querySelector('.evidence-highlight')?.textContent).toBe('1900'));
  });

  it('creates a named document with content and preserves its project and thread context', async () => {
    const created = { id: 20, name: 'Findings', content: '<p>First observation.</p>', thread: 8, project: 7 };
    api.post.mockResolvedValueOnce({ data: created });
    const baseGet = api.get.getMockImplementation()!;
    api.get.mockImplementation(async (url) => url === '/docs/20' ? { data: created } : baseGet(url));
    const router = await openDoc('/document/new?projectId=7&threadId=8');
    await waitFor(() => expect(editable()).toBeTruthy());
    editor().commands.setContent('<p>An unnamed draft.</p>');
    expect(api.post).not.toHaveBeenCalled();

    await fireEvent.update(nameInput(), created.name);
    editor().commands.setContent(created.content);
    await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/document/20?projectId=7&threadId=8'), { timeout: 2500 });
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/docs', {
      name: created.name, content: created.content, projectId: 7, threadId: 8, citationFormat: undefined,
    });
    await waitFor(() => expect(editable().textContent).toBe('First observation.'));
  });

  it('debounces text and title updates for an existing document', async () => {
    await openDoc();
    await fireEvent.update(nameInput(), '  Updated title  ');
    editor().commands.setContent('<p>Old draft.</p>');
    editor().commands.setContent('<p>Final draft.</p>');
    expect(api.patch).not.toHaveBeenCalled();
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(2), { timeout: 2500 });
    expect(api.patch).toHaveBeenCalledWith('/docs/9', { name: 'Updated title' });
    expect(api.patch).toHaveBeenCalledWith('/docs/9', { content: '<p>Final draft.</p>' });
  });

  it('opens another document or resource in split view and ignores a drop of the current document', async () => {
    await openDoc();
    const dragTarget = () => editable().closest<HTMLElement>('.relative.flex-1')!;
    const zone = page!.findAll('div').find((item) => item.element.getAttribute('class')?.includes('drag-overlay-active'))?.element
      ?? dragTarget();
    await fireEvent.dragEnter(zone);
    expect(await screen.findByText('Drop document or resource to open in split view')).toBeTruthy();
    await fireEvent.drop(zone, { dataTransfer: dragData({ type: 'document', document: { id: '9' } }) });
    expect(api.get.mock.calls.filter(([url]) => url === '/docs/9')).toHaveLength(1);
    expect(screen.queryByTitle('Split view panel')).toBeNull();

    await fireEvent.drop(zone, { dataTransfer: dragData({ type: 'document', document: { id: '11' } }) });
    expect(await screen.findByText('Delivery notes')).toBeTruthy();
    expect(screen.getByTitle('Open document').getAttribute('href')).toBe('/document/11');
    await fireEvent.click(screen.getByTitle('Close split view (Esc)'));
    expect(screen.queryByText('Delivery notes')).toBeNull();

    await fireEvent.drop(zone, { dataTransfer: dragData({ type: 'resource', resource: { id: 15 } }) });
    expect(await screen.findByText('Source letter')).toBeTruthy();
    expect(screen.getByTitle('Open resource').getAttribute('href')).toBe('/resource/15');
    expect(api.get).toHaveBeenCalledWith('/resources/15/content');
  });

  it('merges keyword and semantic search results and routes using the matching evidence', async () => {
    const router = await openDoc();
    const baseGet = api.get.getMockImplementation()!;
    api.get.mockImplementation(async (url) => baseGet(url));
    api.post.mockImplementation(async (url, payload) => {
      if (url === '/search') return { data: [
        { id: 11, name: 'Delivery notes', collection: 'docs', score: 0.7, highlightedContent: 'Friday' },
      ] };
      if (url === '/model/semantic-search') {
        const callback = subscribe.mock.calls.find(([event]) => event === 'searchResponse')![1];
        callback({ requestId: 'unrelated', results: [] });
        callback({ requestId: payload.requestId, results: [
          { text: 'Duplicate doc', score: 0.6, metadata: { source_type: 'doc', source_id: 11 } },
          { text: 'Source letter\nFrom the Archive', score: 0.89, metadata: { source_type: 'resource', source_id: 15 } },
        ] });
        return { data: {} };
      }
      throw new Error(`Unexpected POST ${url}`);
    });
    await fireEvent.click(screen.getByTitle('Search related content'));
    const field = screen.getByRole('textbox', { name: 'Search related content' });
    await fireEvent.update(field, '  source  ');
    await fireEvent.keyDown(field, { key: 'Enter' });
    const semantic = await screen.findByText('Source letter');
    expect(screen.getByText('Delivery notes')).toBeTruthy();
    expect(screen.queryByText('Duplicate doc')).toBeNull();
    expect(screen.getByText('89% match')).toBeTruthy();
    await fireEvent.click(semantic);
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/resource/15'));
  });

  it('downloads a Word file using the server name and a PDF using the document name by default', async () => {
    await openDoc();
    const baseGet = api.get.getMockImplementation()!;
    api.get.mockImplementation(async (url, config) => {
      if (url === '/docs/9/export/docx') return { data: 'docx', headers: { 'content-disposition': 'attachment; filename="holdings.docx"' } };
      if (url === '/docs/9/export/pdf') return { data: 'pdf', headers: {} };
      return baseGet(url, config);
    });
    const filenames: string[] = [];
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:download');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      filenames.push(this.download);
    });

    await fireEvent.click(screen.getByTitle('Export as Word document (.docx)'));
    await fireEvent.click(screen.getByTitle('Export as PDF'));
    await waitFor(() => expect(filenames).toEqual(['holdings.docx', 'Reference index.pdf']));
    expect(api.get).toHaveBeenCalledWith('/docs/9/export/docx', { responseType: 'blob' });
    expect(api.get).toHaveBeenCalledWith('/docs/9/export/pdf', { responseType: 'blob' });
    expect(revoke).toHaveBeenCalledTimes(2);
  });

  it('removes a saved document after confirmation and returns to the parent thread', async () => {
    const router = await openDoc();
    api.delete.mockResolvedValue({ data: {} });
    const remove = screen.getByTitle('Remove document (Del)');
    await fireEvent.click(remove);
    await fireEvent.click(button('Cancel'));
    expect(api.delete).not.toHaveBeenCalled();

    await fireEvent.click(remove);
    const confirmation = screen.getByRole('heading', { name: 'Remove Document' }).parentElement!.parentElement!;
    await fireEvent.click(within(confirmation).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/thread/8'));
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/docs/9');
  });
});

describe('document annotation and split error handling', () => {
  it('focuses an annotated passage from the comment sidebar and clears its mark when deleting the comment', async () => {
    const get = api.get.getMockImplementation()!;
    api.get.mockImplementation(async (path, ...args) => {
      if (path === '/docs/9') return { data: {
        ...original, content: '<p>The <span data-comment-id="78">first item</span> was sold in 1900.</p>',
      } };
      if (path === '/comments/doc/9') return { data: [{ id: '78', content: 'Verify the sale date', createdAt: '2026-01-01' }] };
      return get(path, ...args);
    });
    api.delete.mockResolvedValue({ data: {} });
    await openDoc();
    await fireEvent.click(screen.getByTitle('Comments'));
    const comment = await screen.findByText('Verify the sale date');
    await fireEvent.click(comment);
    expect(editor().state.doc.textBetween(editor().state.selection.from, editor().state.selection.to)).toBe('first item');
    const mark = editable().querySelector<HTMLElement>('[data-comment-id="78"]')!;
    expect(mark.style.transition).toBe('background-color 0.5s ease');

    await fireEvent.click(within(comment.closest<HTMLElement>('#comment-78')!).getByTitle('Delete'));
    const dialog = screen.getByRole('heading', { name: 'Delete Comment' }).parentElement!.parentElement!;
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(editable().querySelector('[data-comment-id="78"]')).toBeNull());
    expect(editable().textContent).toContain('first item');
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/comments/78');
  });

  it('keeps the main document available when a dropped document or resource has been removed', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await openDoc();
    const area = editable().closest<HTMLElement>('.relative.flex-1')!;
    await fireEvent.drop(area, { dataTransfer: dragData({ type: 'document', document: { id: '99' } }) });
    await waitFor(() => expect(log).toHaveBeenCalledWith('Failed to load document for split view:', expect.any(Error)));
    await fireEvent.drop(area, { dataTransfer: dragData({ type: 'resource', resource: { id: 99 } }) });
    await waitFor(() => expect(log).toHaveBeenCalledWith('Failed to load resource for split view:', expect.any(Error)));
    expect(screen.queryByTitle('Close split view (Esc)')).toBeNull();
    expect(nameInput().value).toBe(original.name);
  });

  it('re-enables the PDF export control after the service rejects a request', async () => {
    const get = api.get.getMockImplementation()!;
    const fail = Promise.withResolvers<never>();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    api.get.mockImplementation(async (path, ...args) => {
      if (path === '/docs/9/export/pdf') return fail.promise;
      return get(path, ...args);
    });
    await openDoc();
    const exportButton = screen.getByTitle('Export as PDF') as HTMLButtonElement;
    await fireEvent.click(exportButton);
    expect(exportButton.disabled).toBe(true);
    fail.reject(new Error('Export service unavailable'));
    await waitFor(() => expect(exportButton.disabled).toBe(false));
    expect(log).toHaveBeenCalledWith('Failed to export document as PDF:', expect.any(Error));
  });
});
