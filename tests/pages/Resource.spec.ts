import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import ResourcePage from '@/pages/Resource.vue';
import type { Resource } from '@/services/resources/useResource';
import type { ResourceDate } from '@/types/ResourceDate';

const { api, notification } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), defaults: { baseURL: 'http://backend.example' } },
  notification: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));
vi.mock('@/services/api', () => ({ default: api }));
vi.mock('@/composables/useNotification', () => ({ useNotification: () => notification }));

const resource: Resource = {
  id: 17, name: 'Acquisition report', project: { id: 9, name: 'Archives' },
  status: 'ready', mimeType: 'text/html', originalName: 'annual.html', language: 'es',
  content: '<h2>Holdings</h2><p>Extracted inventory</p>',
  translatedContent: '<p>Translated inventory</p>',
  summary: '<p>Three donations were received.</p>',
  keyPoints: ['New archive', 'Annual audit'], keywords: ['holdings'],
};
const button = (name: string) => screen.getByRole('button', { name });

async function openResource(overrides: Partial<Resource> = {}, responses: Record<string, unknown> = {}) {
  const state = { ...resource, ...overrides };
  api.get.mockImplementation(async (path) => {
    if (Object.hasOwn(responses, path)) return { data: responses[path] };
    if (path === '/resources/17') return { data: structuredClone(state) };
    if (path === '/resources/17/content') return { data: { content: state.content } };
    if (path === '/resources/17/translated-content') return { data: { translatedContent: state.translatedContent } };
    if (path === '/resources/17/download') return { data: '<article><p>Original document</p></article>' };
    if (path === '/docs/resource/17') throw { response: { status: 404 } };
    if (['/resources/17/entities', '/pending-entities/resource/17', '/resource-types',
      '/reading-points/resource/17', '/bibliography/global'].includes(path)) return { data: [] };
    throw new Error(`Unexpected GET ${path}`);
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>Projects</div>' } },
      { path: '/project/:id', component: { template: '<div>Project</div>' } },
      { path: '/resource/:id', component: ResourcePage },
      { path: '/document/:id', component: { template: '<div>Document</div>' } },
    ],
  });
  await router.push('/resource/17');
  const { container } = render(ResourcePage, { global: { plugins: [router, createPinia()], stubs: { OfflineToggle: true } } });
  await screen.findByRole('heading', { name: state.name });
  return { container, router, state };
}

beforeEach(() => {
  vi.resetAllMocks();
  api.patch.mockResolvedValue({ data: {} });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('resource details', () => {
  it('renders summary, extracted text, translation and the original through their respective views', async () => {
    await openResource();
    expect(screen.getByText('Three donations were received.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Archives' }).getAttribute('href')).toBe('/project/9');

    await fireEvent.click(button('Content'));
    expect(await screen.findByText('Extracted inventory')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Holdings' })).toBeTruthy();

    await fireEvent.click(await screen.findByRole('button', { name: 'Translated' }));
    expect(await screen.findByText('Translated inventory')).toBeTruthy();
    expect(screen.queryByText('Extracted inventory')).toBeNull();

    await fireEvent.click(button('Original'));
    const preview = await screen.findByTitle('HTML Preview');
    await waitFor(() => expect(preview.getAttribute('srcdoc')).toContain('Original document'));
    expect(preview.getAttribute('sandbox')).toBe('allow-same-origin');
    expect(api.get).toHaveBeenCalledWith('/resources/17/download', {
      responseType: 'text', headers: { 'x-offline-skip-cache': '1' },
    });
  });

  it('validates an empty title, trims the new title and persists it on Enter', async () => {
    await openResource();
    vi.useFakeTimers();
    const heading = screen.getByRole('heading', { name: resource.name });
    await fireEvent.dblClick(heading);
    const name = screen.getByRole('textbox', { name: 'Resource name' });
    await fireEvent.update(name, '  ');
    await fireEvent.keyUp(name, { key: 'Enter' });
    expect(notification.error).toHaveBeenCalledWith('Resource name cannot be empty');
    expect(api.patch).not.toHaveBeenCalled();

    await fireEvent.update(name, '  Yearly acquisitions  ');
    await fireEvent.keyUp(name, { key: 'Enter' });
    expect(api.patch).toHaveBeenCalledWith('/resources/17', { name: 'Yearly acquisitions' });
    expect(notification.success).toHaveBeenCalledWith('Resource name updated successfully');
    await vi.advanceTimersByTimeAsync(1500);
    expect(screen.getByRole('heading', { name: 'Yearly acquisitions' })).toBeTruthy();
  });

  it('edits and saves only overview fields, dropping blank entries', async () => {
    await openResource();
    await fireEvent.click(button('Edit resource'));
    await fireEvent.click(screen.getAllByRole('button', { name: 'Move key point down' })[0]);
    expect((screen.getByRole('textbox', { name: 'Key point 1' }) as HTMLInputElement).value).toBe('Annual audit');
    await fireEvent.update(screen.getByRole('textbox', { name: 'Key point 2' }), '  ');
    await fireEvent.update(screen.getByRole('textbox', { name: 'Keyword 1' }), 'inventory');
    await fireEvent.keyDown(screen.getByRole('textbox', { name: 'Keyword 1' }), { key: 'Enter' });
    await fireEvent.click(button('Save'));

    await waitFor(() => expect(notification.success).toHaveBeenCalledWith('Content updated successfully'));
    expect(api.patch).toHaveBeenCalledWith('/resources/17', {
      summary: resource.summary, keyPoints: ['Annual audit'], keywords: ['inventory'],
    });
    expect(screen.queryByText('New archive')).toBeNull();
    expect(screen.getByText('inventory')).toBeTruthy();
  });

  it('confirms a pending extraction and reloads the updated resource', async () => {
    const { state } = await openResource({ status: 'extracted' });
    expect(screen.getByText(/Resource pending confirmation/)).toBeTruthy();
    expect(screen.getByText('Extracted Content (Editable)')).toBeTruthy();
    api.post.mockImplementation(async () => {
      state.status = 'ready';
      return { data: {} };
    });

    await fireEvent.click(button('Confirm Extraction'));
    await waitFor(() => expect(screen.queryByText(/Resource pending confirmation/)).toBeNull());
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/resources/17/confirm');
    expect(api.get.mock.calls.filter(([path]) => path === '/resources/17')).toHaveLength(2);
    expect(notification.success).toHaveBeenCalledWith(expect.stringContaining('Resource confirmed'));
  });

  it('creates a workspace document for this resource and opens the workspace view', async () => {
    await openResource();
    api.post.mockResolvedValue({ data: { id: 101, name: 'Acquisition report - Workspace', content: '' } });
    await fireEvent.click(screen.getByTitle('Create Workspace'));
    await waitFor(() => expect(notification.success).toHaveBeenCalledWith('Workspace created successfully'));
    expect(api.post).toHaveBeenCalledWith('/docs', {
      name: 'Acquisition report - Workspace', content: '', projectId: 9, resourceId: 17,
    });
    expect(button('Workspace')).toBeTruthy();
    expect(screen.queryByTitle('Create Workspace')).toBeNull();
  });

  it('loads only the selected resource dates and removes the chosen date', async () => {
    await openResource();
    const getDetails = api.get.getMockImplementation()!;
    const dates: ResourceDate[] = [
      {
        id: 5, resourceId: 17, date: '2024-04-03', endDate: '2024-04-05', rawExpression: '3–5 April',
        charOffset: 10, precision: 'day', contextSnippet: 'Audit dates', unresolvedReason: null, createdAt: '2026-02-01',
      },
      {
        id: 6, resourceId: 17, date: null, endDate: null, rawExpression: 'last year',
        charOffset: null, precision: null, contextSnippet: null, unresolvedReason: 'missing_anchor', createdAt: '2026-02-01',
      },
    ];
    api.get.mockImplementation(async (path) => {
      if (path === '/resources/17/dates') return { data: dates };
      return getDetails(path);
    });
    api.delete.mockResolvedValue({ data: {} });
    await fireEvent.click(button('Dates'));
    expect(await screen.findByText('2024-04-03 → 2024-04-05')).toBeTruthy();
    expect(screen.getByText('1 resolved · 1 pending')).toBeTruthy();
    expect((button('Set authoring date') as HTMLButtonElement).disabled).toBe(true);

    const item = screen.getByText('“3–5 April”').closest('li')!;
    await fireEvent.click(within(item).getByRole('button', { name: '×' }));
    expect(await screen.findByText('0 resolved · 1 pending')).toBeTruthy();
    expect(api.delete).toHaveBeenCalledWith('/resources/17/dates/5');
  });

  it('leaves the resource open when removal is canceled or fails and navigates after the retry', async () => {
    const { router } = await openResource();
    api.delete.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: {} });
    const remove = screen.getByTitle('Remove Resource');
    const confirm = () => {
      const heading = screen.getByRole('heading', { name: 'Remove Resource' });
      return within(heading.parentElement!.parentElement!).getByRole('button', { name: 'Remove' });
    };

    await fireEvent.click(remove);
    await fireEvent.click(button('Cancel'));
    expect(api.delete).not.toHaveBeenCalled();
    await fireEvent.click(remove);
    await fireEvent.click(confirm());
    await waitFor(() => expect(notification.error).toHaveBeenCalledWith('Failed to remove resource'));
    expect(router.currentRoute.value.path).toBe('/resource/17');

    await fireEvent.click(remove);
    await fireEvent.click(confirm());
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/project/9'));
    expect(api.delete).toHaveBeenLastCalledWith('/resources/17');
  });
});

describe('resource actions and evidence', () => {
  it.each([
    ['Summarize Resource', '/model/summarize', 'Summarization'],
    ['Translate Resource', '/model/translate', 'Translation'],
    ['Key Points', '/model/key-points', 'Key points'],
    ['Generate Keywords', '/model/keywords', 'Keywords'],
    ['Extract Entities', '/model/extract-entities', 'Entity extraction'],
  ] as const)('starts %s for this resource and stops polling on failure', async (title, path, label) => {
    await openResource({ summary: '', translatedContent: null, keyPoints: [], keywords: [] });
    const base = api.get.getMockImplementation()!;
    api.get.mockImplementation(async (url) => url === '/executions/action-1/progress'
      ? { data: { runtime: { status: 'failed' } } }
      : base(url));
    api.post.mockResolvedValueOnce({ data: { executionId: 'action-1' } });
    vi.useFakeTimers();
    await fireEvent.click(screen.getByTitle(title));
    await vi.advanceTimersByTimeAsync(1400);
    expect(api.post).toHaveBeenCalledExactlyOnceWith(path, title === 'Extract Entities'
      ? { resourceId: 17 }
      : { resourceId: 17, targetLanguage: 'en' });
    expect(notification.success).toHaveBeenCalledWith(`${label} execution created successfully`);
    await vi.advanceTimersByTimeAsync(3000);
    expect(api.get.mock.calls.filter(([url]) => url === '/executions/action-1/progress')).toHaveLength(1);
  });

  it('recovers from an unavailable progress request and renders the resulting summary', async () => {
    const { state } = await openResource({ summary: '', translatedContent: null });
    const base = api.get.getMockImplementation()!;
    let requests = 0;
    api.get.mockImplementation(async (url) => {
      if (url !== '/executions/summary-1/progress') return base(url);
      if (++requests === 1) throw new Error('Temporary offline');
      state.summary = '<p>Summary generated from the source.</p>';
      return { data: { runtime: { status: 'completed' } } };
    });
    api.post.mockResolvedValueOnce({ data: { executionId: 'summary-1' } });
    vi.useFakeTimers();
    await fireEvent.click(screen.getByTitle('Summarize Resource'));
    await vi.advanceTimersByTimeAsync(2100);
    expect(requests).toBe(2);
    expect(screen.getByText('Summary generated from the source.')).toBeTruthy();
  });

  it('reports an operation that fails before an execution is created', async () => {
    await openResource({ translatedContent: null });
    api.post.mockRejectedValueOnce(new Error('No translation worker'));
    await fireEvent.click(screen.getByTitle('Translate Resource'));
    await waitFor(() => expect(notification.error).toHaveBeenCalledWith('Failed to create translation execution'));
    expect(notification.success).not.toHaveBeenCalled();
  });

  it('switches from summary to the source with the evidence phrase highlighted', async () => {
    const { router } = await openResource();
    expect(screen.getByText('Three donations were received.')).toBeTruthy();
    await router.push('/resource/17?evidence=Extracted+inventory');
    await waitFor(() => expect(document.querySelector('.evidence-highlight')?.textContent).toBe('Extracted inventory'));
  });

  it('sets the download filename and targets this resource', async () => {
    await openResource();
    const downloads: Array<{ url: string; name: string }> = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push({ url: this.href, name: this.download });
    });
    await fireEvent.click(screen.getByTitle('Download Resource'));
    expect(downloads).toEqual([{ url: 'http://backend.example/resources/17/download', name: 'annual.html' }]);
  });

  it.each([true, false])('sends selected text to an existing or new project document (%s)', async (existing) => {
    const selectedText = 'A & B < 10';
    const { router } = await openResource({ content: '<p>Recorded value A &amp; B &lt; 10 was verified.</p>' });
    const doc = { id: 70, name: 'Research draft', content: '<p>Introduction</p>' };
    const base = api.get.getMockImplementation()!;
    api.get.mockImplementation(async (url) => {
      if (url === '/docs/project/9') return { data: [doc] };
      if (url === '/docs/70') return { data: doc };
      return base(url);
    });
    api.post.mockResolvedValueOnce({ data: { id: 71, name: 'New source extract' } });
    await fireEvent.click(button('Content'));
    const paragraph = await screen.findByText(/Recorded value/);
    const position = paragraph.textContent!.indexOf(selectedText);
    const range = document.createRange();
    range.setStart(paragraph.firstChild!, position);
    range.setEnd(paragraph.firstChild!, position + selectedText.length);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    await fireEvent.contextMenu(paragraph);
    await fireEvent.click(button('Send to document'));
    expect(await screen.findByRole('heading', { name: 'Send selection to document' })).toBeTruthy();

    if (existing) {
      await fireEvent.click(await screen.findByRole('radio', { name: doc.name }));
      await fireEvent.click(button('Send'));
      await waitFor(() => expect(api.patch).toHaveBeenCalledExactlyOnceWith('/docs/70', {
        content: '<p>Introduction</p><p>A &amp; B &lt; 10</p>',
      }));
      expect(notification.success).toHaveBeenCalledWith('Selection added to document');
    } else {
      await fireEvent.click(button('Create & Send'));
      expect(api.post).toHaveBeenCalledExactlyOnceWith('/docs', {
        name: 'Selection from Acquisition report', content: '<p>A &amp; B &lt; 10</p>', projectId: 9,
      });
      await waitFor(() => expect(router.currentRoute.value.path).toBe('/document/71'));
    }
  });
});

describe('resource split view', () => {
  const document = { id: 53, name: 'Review note', content: '<p>Review the December inventory</p>' };
  const related = { id: 62, name: 'Preservation log', mimeType: 'text/plain' };
  const draggedDocument = { type: 'document', document: { id: '53', name: 'Cached title' } };
  const draggedResource = { type: 'resource', resource: { id: 62 } };

  function transfer(data: object) {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('application/json', JSON.stringify(data));
    return dataTransfer;
  }

  async function openSplitArea() {
    const { container } = await openResource();
    const originalGet = api.get.getMockImplementation()!;
    api.get.mockImplementation(async (path, ...args) => {
      if (path === '/docs/53') return { data: document };
      if (path === '/resources/62') return { data: structuredClone(related) };
      if (path === '/resources/62/content') return { data: { content: '<p>Inspect the boxes</p>' } };
      return originalGet(path, ...args);
    });
    return container.querySelector('.grid.grid-cols-1.gap-4')!;
  }

  it('marks the drop target, loads a resource alongside the current one, and closes the pane', async () => {
    const splitArea = await openSplitArea();
    const dataTransfer = transfer(draggedResource);

    await fireEvent.dragEnter(splitArea, { dataTransfer });
    expect(splitArea.classList.contains('drag-over')).toBe(true);
    const leave = new DragEvent('dragleave', { dataTransfer, bubbles: true });
    Object.defineProperty(leave, 'clientX', { value: -20 });
    Object.defineProperty(leave, 'clientY', { value: -20 });
    await fireEvent(splitArea, leave);
    expect(splitArea.classList.contains('drag-over')).toBe(false);
    const hover = new DragEvent('dragover', { dataTransfer, bubbles: true, cancelable: true });
    await fireEvent(splitArea, hover);
    expect(hover.defaultPrevented).toBe(true);
    expect(splitArea.classList.contains('drag-over')).toBe(true);
    await fireEvent.drop(splitArea, { dataTransfer });

    expect(await screen.findByText('Inspect the boxes')).toBeTruthy();
    expect(screen.getByText(related.name)).toBeTruthy();
    expect(screen.getByTitle('Open resource').getAttribute('href')).toBe('/resource/62');
    expect(splitArea.classList.contains('drag-over')).toBe(false);
    await fireEvent.click(button('Close split view'));
    expect(screen.queryByText('Inspect the boxes')).toBeNull();
    expect(screen.getByRole('heading', { name: resource.name })).toBeTruthy();
  });

  it('loads a fresh document into the pane and saves its updated title', async () => {
    const splitArea = await openSplitArea();
    await fireEvent.drop(splitArea, { dataTransfer: transfer(draggedResource) });
    expect(await screen.findByText('Inspect the boxes')).toBeTruthy();
    await fireEvent.drop(splitArea, { dataTransfer: transfer(draggedDocument) });
    const name = await screen.findByRole('textbox', { name: 'Document name' }) as HTMLInputElement;
    expect(name.value).toBe('Review note');
    expect(await screen.findByText('Review the December inventory')).toBeTruthy();
    expect(screen.queryByText('Inspect the boxes')).toBeNull();

    const panel = within(name.closest<HTMLElement>('.split-document-panel')!);
    vi.useFakeTimers();
    await fireEvent.update(name, 'Updated review note');
    expect(panel.getAllByText('Saving...').length).toBeGreaterThan(0);
    await vi.advanceTimersByTimeAsync(1000);
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/docs/53', { name: 'Updated review note' });
    expect(panel.getAllByText('Saved').length).toBeGreaterThan(0);
    await fireEvent.click(button('Close document editor'));
    expect(screen.queryByRole('textbox', { name: 'Document name' })).toBeNull();
  });

  it.each([
    [{ type: 'document', document: { id: '54', name: 'Removed note' } }, 'Failed to load document', '/docs/54'],
    [{ type: 'resource', resource: { id: 63 } }, 'Failed to load resource', '/resources/63'],
  ])('reports a failed split load and preserves the original resource', async (data, message, path) => {
    const splitArea = await openSplitArea();
    await fireEvent.drop(splitArea, { dataTransfer: transfer(data) });
    await waitFor(() => expect(notification.error).toHaveBeenCalledExactlyOnceWith(message));
    expect(api.get).toHaveBeenCalledWith(path);
    expect(screen.getByRole('heading', { name: resource.name })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Close (split view|document editor)$/ })).toBeNull();
  });

  it('ignores drops of the current resource and missing IDs', async () => {
    const splitArea = await openSplitArea();
    api.get.mockClear();
    for (const data of [
      { type: 'resource', resource: { id: '17' } },
      { type: 'resource', resource: {} },
      { type: 'document', document: {} },
    ]) {
      await fireEvent.drop(splitArea, { dataTransfer: transfer(data) });
    }
    expect(api.get).not.toHaveBeenCalled();
    expect(notification.error).not.toHaveBeenCalled();
  });

  it('reports a URL drop and leaves local files alone', async () => {
    const splitArea = await openSplitArea();
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/uri-list', 'https://example.org/archive');
    await fireEvent.drop(splitArea, { dataTransfer });
    expect(notification.info).toHaveBeenCalledExactlyOnceWith('Link dropped: https://example.org/archive');

    dataTransfer.items.add(new File(['notes'], 'notes.txt', { type: 'text/plain' }));
    await fireEvent.drop(splitArea, { dataTransfer });
    expect(notification.info).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Close split view' })).toBeNull();
  });
});

describe('reviewing resources and opening a workspace', () => {
  it('reviews the original HTML alongside the extraction, retries a rejected confirmation, and reloads the accepted state', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { state } = await openResource({ status: 'extracted', summary: null });
    expect(screen.getByRole('heading', { name: 'Extracted Content (Editable)' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Original Document' })).toBeTruthy();
    expect(await screen.findByText('Extracted inventory')).toBeTruthy();
    expect(screen.getByTitle('HTML Preview').getAttribute('srcdoc')).toContain('Original document');

    api.post.mockRejectedValueOnce(new Error('Service busy')).mockImplementationOnce(async () => {
      state.status = 'ready';
      return { data: {} };
    });
    await fireEvent.click(button('Confirm Extraction'));
    expect(log).toHaveBeenCalledWith('Error confirming resource:', expect.any(Error));
    expect(notification.error).toHaveBeenCalledExactlyOnceWith('Failed to confirm resource');
    expect((await screen.findByRole('button', { name: 'Confirm Extraction' }) as HTMLButtonElement).disabled).toBe(false);
    await fireEvent.click(button('Confirm Extraction'));
    expect(notification.success).toHaveBeenCalledWith('Resource confirmed successfully. Language detection execution created.');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Confirm Extraction' })).toBeNull());
    expect(api.post.mock.calls).toEqual([['/resources/17/confirm'], ['/resources/17/confirm']]);
    expect(api.get.mock.calls.filter(([path]) => path === '/resources/17')).toHaveLength(2);
  });

  it.each([
    ['audio/mpeg', 'audio'],
    ['video/mp4', 'video'],
  ] as const)('shows the %s player above the pending transcription', async (mimeType, element) => {
    const { container } = await openResource({ mimeType, status: 'extracted', summary: null, content: '<p>Transcribed account</p>' });
    expect(await screen.findByText('Transcribed account')).toBeTruthy();
    const player = container.querySelector(element)!;
    expect(player.getAttribute('src')).toBe('http://backend.example/resources/17/view');
    expect(player.hasAttribute('controls')).toBe(true);
    expect(screen.queryByRole('heading', { name: 'Original Document' })).toBeNull();
    expect(api.get).not.toHaveBeenCalledWith('/resources/17/download', expect.anything());
  });

  it.each([
    ['application/pdf', 'report.pdf', true, '/resources/17/view#toolbar=0&navpanes=0&scrollbar=0&sidebar=0'],
    ['image/png', 'drawing.png', false, '/resources/17/view'],
  ] as const)('renders the original %s when no extract is available', async (mimeType, originalName, isPdf, suffix) => {
    await openResource({ mimeType, originalName, content: '', summary: null, translatedContent: null });
    const preview = isPdf ? await screen.findByTitle(originalName) : await screen.findByAltText(originalName);
    expect(preview.getAttribute('src')).toBe('http://backend.example' + suffix);
    expect(screen.queryByText('Extracted inventory')).toBeNull();
  });

  it('decodes the HTML part of a saved web page in the original tab', async () => {
    await openResource({ mimeType: 'multipart/related', originalName: 'reading.mhtml' });
    const fetch = api.get.getMockImplementation()!;
    const source = [
      'MIME-Version: 1.0', 'Content-Type: multipart/related; boundary="fixture"',
      '', '--fixture', 'Content-Type: text/html; charset=UTF-8',
      '', '<article><h1>Saved reading room</h1></article>', '--fixture--', '',
    ].join('\r\n');
    api.get.mockImplementation(async (path, ...args) => {
      if (path === '/resources/17/download') return { data: source };
      return fetch(path, ...args);
    });
    await fireEvent.click(button('Original'));
    const preview = await screen.findByTitle('HTML Preview');
    await waitFor(() => expect(preview.getAttribute('srcdoc')).toContain('Saved reading room'));
    expect(preview.getAttribute('srcdoc')).not.toContain('Content-Type');
  });

  it('creates a resource workspace, opens it next to the source and restores the workspace tab on close', async () => {
    await openResource();
    api.post.mockResolvedValue({ data: { id: 97, name: 'Acquisition report - Workspace', content: '<p>Cataloguing notes</p>' } });
    await fireEvent.click(screen.getByTitle('Create Workspace'));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/docs', {
      name: 'Acquisition report - Workspace', content: '', resourceId: 17, projectId: 9,
    });
    expect(await screen.findByText('Cataloguing notes')).toBeTruthy();
    expect(notification.success).toHaveBeenCalledWith('Workspace created successfully');

    await fireEvent.click(screen.getByTitle('Open in split view'));
    expect(await screen.findByText('Extracted inventory')).toBeTruthy();
    expect(await screen.findByText('Cataloguing notes')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Workspace' })).toBeNull();
    await fireEvent.click(button('Close document editor'));
    expect(screen.queryByText('Cataloguing notes')).toBeNull();
    expect(button('Workspace')).toBeTruthy();
  });
});

describe('resource dates and their timeline', () => {
  const resolved: ResourceDate = {
    id: 41, resourceId: 17, date: '1926-04-12', endDate: null, rawExpression: '12 April', charOffset: 5,
    precision: 'day', contextSnippet: 'First acquisition', unresolvedReason: null, createdAt: '',
  };
  const relative: ResourceDate = {
    ...resolved, id: 42, date: null, rawExpression: 'the following day', unresolvedReason: 'missing_anchor',
  };

  it('sets the authoring date and refreshes the relative event after the backend resolves it', async () => {
    await openResource({ publicationDate: null });
    const originalGet = api.get.getMockImplementation()!;
    let dateRequests = 0;
    api.get.mockImplementation(async (path, ...args) => {
      if (path === '/resources/17/dates') {
        dateRequests++;
        return { data: [resolved, dateRequests === 1 ? relative : { ...relative, date: '1926-04-13', unresolvedReason: null }] };
      }
      return originalGet(path, ...args);
    });
    await fireEvent.click(button('Dates'));
    expect(await screen.findByText('1 resolved · 1 pending')).toBeTruthy();
    vi.useFakeTimers();
    await fireEvent.update(screen.getByLabelText('Anchor date'), '1926-04-12');
    await fireEvent.click(button('Set authoring date'));
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/resources/17', { publicationDate: '1926-04-12' });
    await vi.advanceTimersByTimeAsync(1500);
    expect(dateRequests).toBe(2);
    expect(screen.getByText('2 resolved · 0 pending')).toBeTruthy();
    expect(screen.queryByLabelText('Anchor date')).toBeNull();
  });

  it('promotes a resolved date from the resource timeline and carries over its source reference', async () => {
    await openResource();
    const originalGet = api.get.getMockImplementation()!;
    const timeline = { id: 75, name: 'Project milestones', timelineData: [] as object[] };
    api.get.mockImplementation(async (path, ...args) => {
      if (path === '/resources/17/dates') return { data: [resolved, relative] };
      if (path === '/timelines/project/9') return { data: [timeline] };
      if (path === '/timelines/75') return { data: timeline };
      return originalGet(path, ...args);
    });
    await fireEvent.click(button('Dates'));
    await screen.findByText('1 resolved · 1 pending');
    await fireEvent.click(button('Timeline'));
    expect(screen.queryByText('“the following day”')).toBeNull();
    await fireEvent.click(button('Add to project timeline'));
    expect((await screen.findByRole('radio', { name: /Project milestones/ }) as HTMLInputElement).checked).toBe(true);
    await fireEvent.click(button('Add to timeline'));
    await waitFor(() => expect(notification.success).toHaveBeenCalledWith('Added "12 April" (1926-04-12) to timeline.'));
    expect(api.patch).toHaveBeenCalledWith('/timelines/75', { timelineData: [
      expect.objectContaining({ title: '12 April', date: '1926-04-12', description: 'First acquisition', resourceId: 17 }),
    ] });
  });
});

describe('reading resource annotations', () => {
  it('highlights translated and alternate entity names and removes only the selected association', async () => {
    vi.stubGlobal('electronAPI', { getSettings: vi.fn().mockResolvedValue({ language: 'fr' }) });
    api.delete.mockResolvedValue({ data: {} });
    const { container } = await openResource({
      content: '<p>El Museo Central, llamado M.C., abrió en 1926.</p>',
      translatedContent: '<p>Le Musée central, ou Central Museum, a ouvert en 1926.</p>',
    }, { '/resources/17/entities': [
      { id: 60, name: 'Central Museum', entityType: { name: 'ORG' }, translations: { es: 'Museo Central', fr: 'Musée central' }, aliases: [{ locale: 'es', value: 'M.C.' }] },
      { entity_id: 61, entity_name: 'The Archive', entity_type: 'ORG' },
    ] });
    await fireEvent.click(button('Content'));
    await fireEvent.click(button('Entities'));
    const row = screen.getByTitle('Click to highlight Museo Central in the document');
    await fireEvent.click(row);
    const highlights = () => [...container.querySelectorAll('mark.entity-highlight')].map((mark) => mark.textContent);
    await waitFor(() => expect(highlights()).toEqual(['Museo Central', 'M.C.']));

    await fireEvent.click(button('Translated'));
    const translated = await screen.findByTitle('Click to highlight Musée central in the document');
    await fireEvent.click(translated);
    await waitFor(() => expect(highlights()).toEqual(['Musée central', 'Central Museum']));
    await fireEvent.click(within(translated.parentElement!).getByTitle('Remove'));
    const dialog = screen.getByRole('heading', { name: 'Remove Entity' }).parentElement!.parentElement!;
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.queryByTitle('Click to highlight Musée central in the document')).toBeNull());
    expect(screen.getByTitle('Click to highlight The Archive in the document')).toBeTruthy();
  });

  it('connects the sidebar comment to its HTML anchor and removes its markup on deletion', async () => {
    api.delete.mockResolvedValue({ data: {} });
    const { container } = await openResource({
      content: '<p>This <span data-comment-id="62">accusation</span> was corrected.</p>',
    }, { '/comments/resource/17': [{ id: '62', quote: 'accusation', content: 'Review this wording', createdAt: '2026-01-01' }] });
    await fireEvent.click(button('Content'));
    await fireEvent.click(button('Comments'));
    const annotation = await screen.findByText('Review this wording');
    const passage = container.querySelector<HTMLElement>('[data-comment-id="62"]')!;
    await fireEvent.click(annotation);
    expect(passage.style.transition).toBe('background-color 0.5s ease');
    await fireEvent.click(within(annotation.closest<HTMLElement>('#comment-62')!).getByTitle('Delete'));
    const dialog = screen.getByRole('heading', { name: 'Delete Comment' }).parentElement!.parentElement!;
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(container.querySelector('[data-comment-id="62"]')).toBeNull());
    expect(screen.getByText('This accusation was corrected.')).toBeTruthy();
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/comments/62');
  });
});

describe('summarizing a source selection', () => {
  it.each([true, false])('submits the selected passage to the existing workspace when the request succeeds (%s)', async (succeeds) => {
    const doc = { id: 101, name: 'Acquisition report - Workspace', content: '<p>Notes</p>' };
    if (succeeds) api.post.mockResolvedValueOnce({ data: { executionId: 'source-summary' } });
    else api.post.mockRejectedValueOnce(new Error('Summarization service unavailable'));
    await openResource({ content: '<p>Recorded value: Three boxes arrived in late April.</p>' }, { '/docs/resource/17': doc });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await fireEvent.click(button('Content'));
    const paragraph = await screen.findByText(/Recorded value/);
    const selectedText = 'Three boxes arrived in late April.';
    const range = document.createRange();
    range.setStart(paragraph.firstChild!, paragraph.textContent!.indexOf(selectedText));
    range.setEnd(paragraph.firstChild!, paragraph.textContent!.length);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    try {
      await fireEvent.contextMenu(paragraph);
      await fireEvent.click(screen.getByRole('button', { name: /Summarize selection/ }));
      await waitFor(() => expect(api.post).toHaveBeenCalledExactlyOnceWith('/model/summarize', {
        text: selectedText, sourceLanguage: 'es', targetLanguage: expect.any(String),
        targetDocId: 101, type: 'workspace-selection',
      }));
      if (succeeds) {
        expect(notification.success).toHaveBeenCalledWith('Summarization execution created for selected text');
        expect(notification.error).not.toHaveBeenCalled();
      } else {
        expect(notification.error).toHaveBeenCalledWith('Failed to create summarization execution');
        expect(notification.success).not.toHaveBeenCalled();
      }
    } finally {
      selection.removeAllRanges();
      consoleError.mockRestore();
    }
  });
});
