import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import Canvas from '@/pages/Canvas.vue';
import { getApiBaseUrl } from '@/services/apiBase';
import { useFeatureStore } from '@/store/featureStore';
import type { Project } from '@/types/Project';
import { useProjectStore } from '@/store/projectStore';
import type { CanvasData, CanvasNode, CanvasRecord } from '@/types/canvas';

const { api, toPng } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  toPng: vi.fn(),
}));
vi.mock('@/services/api', () => ({ default: api }));
vi.mock('html-to-image', () => ({ toPng }));

const project: Project = { id: 12, name: 'Archives', status: 'active' as const, description: null, createdAt: '', updatedAt: '' };
const original: CanvasRecord = {
  id: 9, name: 'Research board', updatedAt: '2026-06-01',
  canvasData: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
};
const timeline = {
  id: 41, name: 'Acquisition history',
  epochs: [{ id: 'early', name: 'Early years', startDate: '2020-01-01', endDate: '2021-12-31', color: '#888888' }],
  timelineData: [
    { id: 'event1', title: 'First purchase', date: '2020-10-01', color: '#3b82f6' },
    { id: 'event2', title: 'Expansion', date: '2023-04-15', color: '#ef4444' },
  ],
};
const doc = {
  id: 16, name: 'Field notes', content: '<h2>Findings</h2><p>Manuscripts were catalogued.</p><p>Returned manuscripts.</p>',
};
const image = { id: 15, title: 'Digitized cover', name: 'cover.png', mimeType: 'image/png' };
const report = { id: 31, name: 'Audit report', mimeType: 'text/html' };

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const nameInput = () => screen.getByRole('textbox', { name: 'Canvas name' }) as HTMLInputElement;

async function openCanvas(path = '/canvas/9', features: Record<string, boolean> = {}, saved: CanvasRecord = original) {
  api.get.mockImplementation(async (url: string) => {
    if (url === '/canvases/9') return { data: structuredClone(saved) };
    if (url === '/threads/23') return { data: { id: 23, name: 'Early research', project: 12 } };
    if (url === '/docs/project/12') return { data: [doc] };
    if (url === '/docs/16') return { data: doc };
    if (url === '/resources/project/12') return { data: [image, report] };
    if (url === '/resources/31') return { data: { ...report } };
    if (url === '/resources/31/content') return { data: { content: '<p>Property records</p>' } };
    if (url === '/timelines/project/12') return { data: [timeline] };
    if (url === '/timelines/41') return { data: timeline };
    if (url === '/datasets') return { data: [{ id: 18, name: 'Holdings' }] };
    if (url === '/datasets/18/charts') return { data: [{ id: 33, name: 'Counts by branch', config: { chartType: 'bar' } }] };
    throw new Error(`Unexpected GET ${url}`);
  });
  const pinia = createPinia();
  useProjectStore(pinia).setCurrentProject(project);
  useFeatureStore(pinia).setBackendFeatures(features);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<p>Home</p>' } },
      { path: '/canvas/:id', component: Canvas },
      { path: '/project/:id', component: { template: '<p>Project</p>' } },
      { path: '/thread/:id', component: { template: '<p>Thread</p>' } },
    ],
  });
  await router.push(path);
  const { container } = render(Canvas, { global: { plugins: [pinia, router] } });
  if (path.startsWith('/canvas/9')) {
    await waitFor(() => expect(nameInput().value).toBe(saved.name));
  }
  return { router, container };
}

async function savedNode(type: string, data: CanvasNode['data']) {
  await waitFor(() => {
    const writes = api.patch.mock.calls.filter(([, payload]) => payload.canvasData);
    const latest = writes.at(-1)?.[1].canvasData as CanvasData;
    expect(writes.at(-1)?.[0]).toBe('/canvases/9');
    expect(latest.nodes).toContainEqual(expect.objectContaining({
      type, id: expect.any(String), position: { x: expect.any(Number), y: expect.any(Number) },
      data: expect.objectContaining(data),
    }));
  }, { timeout: 2400 });
}

beforeEach(() => {
  vi.resetAllMocks();
  api.patch.mockResolvedValue({ data: original });
});

afterEach(() => vi.restoreAllMocks());

describe('canvas persistence', () => {
  it('creates a named canvas once in the selected research thread after the autosave debounce', async () => {
    const { router } = await openCanvas('/canvas/new?projectId=12&threadId=23');
    let createdPayload: unknown;
    api.post.mockImplementation(async (_url, payload) => {
      createdPayload = JSON.parse(JSON.stringify(payload));
      return { data: { id: 91 } };
    });
    await screen.findByRole('link', { name: 'Early research' });
    await fireEvent.blur(nameInput());
    expect(api.post).not.toHaveBeenCalled();
    await fireEvent.update(nameInput(), 'Evidence map');
    await fireEvent.blur(nameInput());
    expect(api.post).not.toHaveBeenCalled();

    await waitFor(() => expect(router.currentRoute.value.path).toBe('/canvas/91'), { timeout: 2400 });
    expect(api.post).toHaveBeenCalledOnce();
    expect(api.post.mock.lastCall![0]).toBe('/canvases');
    expect(createdPayload).toEqual({
      name: 'Evidence map', projectId: 12, threadId: 23,
      canvasData: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
    });
  });

  it('renames a saved canvas and removes it only after confirmation', async () => {
    const { router } = await openCanvas();
    await fireEvent.update(nameInput(), 'Updated research board');
    await fireEvent.blur(nameInput());
    expect(api.patch).toHaveBeenCalledWith('/canvases/9', { name: 'Updated research board' });

    await fireEvent.click(button('Remove'));
    await fireEvent.click(button('Cancel'));
    expect(api.delete).not.toHaveBeenCalled();
    await fireEvent.click(button('Remove'));
    const dialog = screen.getByRole('heading', { name: 'Remove Canvas' }).parentElement!.parentElement!;
    api.delete.mockResolvedValue({ data: {} });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/project/12'));
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/canvases/9');
  });

  it('places a selected shape at the pointer and persists the resulting node', async () => {
    const { container } = await openCanvas();
    const canvas = container.querySelector('.vue-flow__pane')!;
    await fireEvent.click(screen.getByTitle('Database'));
    await fireEvent.click(canvas, { clientX: 120, clientY: 170 });
    await savedNode('shape', { shape: 'cylinder', label: '' });
    expect(container.querySelectorAll('.vue-flow__node-shape')).toHaveLength(1);
  });
});

describe('canvas references', () => {
  it('searches within a document, renders its contents and saves a node linked to that document', async () => {
    await openCanvas();
    await fireEvent.click(screen.getByTitle('Document Reference'));
    await fireEvent.click(await screen.findByRole('button', { name: 'Field notes' }));
    expect(await screen.findByRole('heading', { name: 'Findings' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Findings' })).toBeTruthy();
    const search = screen.getByRole('textbox', { name: 'Search documents' });
    await fireEvent.update(search, 'manuscripts');
    await fireEvent.keyDown(search, { key: 'Enter' });
    const matches = document.querySelectorAll('.picker-content mark');
    expect(matches).toHaveLength(2);
    expect(matches[0].classList.contains('ring-accent')).toBe(true);

    await fireEvent.click(button('Add'));
    await savedNode('docRef', { docId: 16, sourceName: 'Field notes', title: 'Field notes' });
  });

  it('inserts a resource node and persists the resource id from the picker', async () => {
    await openCanvas();
    await fireEvent.click(screen.getByTitle('Resource Reference'));
    await fireEvent.click(await screen.findByRole('button', { name: /Audit report/ }));
    expect(await screen.findByText('Property records')).toBeTruthy();
    await fireEvent.click(button('Add'));
    await savedNode('resourceRef', { resourceId: 31, sourceName: 'Audit report', title: 'Audit report' });
  });

  it('only lists image resources in the image picker and persists the selected source', async () => {
    await openCanvas();
    await fireEvent.click(screen.getByTitle('Image'));
    await screen.findByRole('heading', { name: 'Add Image' });
    expect((button('Add') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.click(button('Project'));
    expect(screen.queryByRole('button', { name: 'Audit report' })).toBeNull();
    await fireEvent.click(button('Digitized cover'));
    const src = `${getApiBaseUrl()}/resources/15/view`;
    expect(screen.getByAltText('Preview').getAttribute('src')).toBe(src);
    await fireEvent.error(screen.getByAltText('Preview'));
    expect(screen.getByText('Could not load image')).toBeTruthy();
    await fireEvent.load(screen.getByAltText('Preview'));
    expect(screen.queryByText('Could not load image')).toBeNull();
    await fireEvent.click(button('Add'));
    await savedNode('image', { src, alt: 'Image' });
  });

  it('creates a timeline node for a selected epoch', async () => {
    await openCanvas();
    await fireEvent.click(screen.getByTitle('Timeline'));
    await fireEvent.click(await screen.findByRole('radio', { name: /Acquisition history/ }));
    await fireEvent.update(screen.getByRole('combobox', { name: 'Filter' }), 'epoch');
    await fireEvent.click(screen.getByRole('radio', { name: 'Early years' }));
    await fireEvent.click(button('Insert'));
    await savedNode('timeline', { timelineId: 41, timelineName: timeline.name, filterMode: 'epoch', epochId: 'early' });
    expect(api.get).toHaveBeenCalledWith('/timelines/41');
  });

  it('loads saved charts from the chosen dataset and persists the selected chart', async () => {
    await openCanvas();
    await fireEvent.click(screen.getByTitle('Chart'));
    expect((button('Insert') as HTMLButtonElement).disabled).toBe(true);

    await screen.findByRole('option', { name: 'Holdings' });
    await fireEvent.update(screen.getByLabelText('Dataset *'), '18');
    await fireEvent.click(await screen.findByRole('radio', { name: 'Counts by branch (bar)' }));
    await fireEvent.click(button('Insert'));
    await savedNode('chart', { chartId: 33, chartName: 'Counts by branch', datasetId: 18, datasetName: 'Holdings' });
  });

  it('recovers from a failed entity request and searches by type before inserting the entity', async () => {
    await openCanvas();
    const existing = api.get.getMockImplementation()!;
    let entityRequests = 0;
    api.get.mockImplementation(async (url) => {
      if (url !== '/entities') return existing(url);
      if (entityRequests++ === 0) throw new Error('Catalog temporarily unavailable');
      return { data: [{ id: 18, name: 'Ada Lovelace', entityType: { name: 'PERSON' } },
        { id: 32, name: 'London', entityType: { name: 'LOCATION' } },
        { id: 61, name: 'Unclassified' }] };
    });
    await fireEvent.click(screen.getByTitle('Entity Graph'));
    expect(await screen.findByText('No entities found')).toBeTruthy();
    await fireEvent.click(button('Cancel'));

    await fireEvent.click(screen.getByTitle('Entity Graph'));
    const search = await screen.findByRole('textbox', { name: 'Search entities' });
    await fireEvent.update(search, 'missing');
    expect(screen.getByText('No matching entities')).toBeTruthy();
    await fireEvent.update(search, 'location');
    expect(screen.queryByRole('radio', { name: /Ada/ })).toBeNull();
    await fireEvent.click(await screen.findByRole('radio', { name: 'London LOCATION' }));
    await fireEvent.click(button('Insert'));
    await savedNode('entityGraph', { entityId: 32, entityName: 'London', entityType: 'LOCATION' });
  });

  it('hides disabled tools and exports the visible canvas as a PNG', async () => {
    toPng.mockResolvedValue('data:image/png;base64,AA==');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe('canvas.png');
        expect(this.href).toBe('data:image/png;base64,AA==');
      });
    const { container } = await openCanvas('/canvas/9', { datasets: false, timelines: false, relationships: false });
    for (const title of ['Chart', 'Timeline', 'Entity Graph']) expect(screen.queryByTitle(title)).toBeNull();
    await fireEvent.click(screen.getByTitle('Export as image'));
    await waitFor(() => expect(click).toHaveBeenCalledOnce());
    expect(toPng).toHaveBeenCalledWith(container.querySelector('.vue-flow__viewport'), expect.any(Object));
  });
});

describe('editing canvas contents', () => {
  it('replaces an existing image source in place and accepts a local file as a preview', async () => {
    const before = 'https://example.org/old.png';
    const imageNode: CanvasNode = { id: 'cover', type: 'image', position: { x: 15, y: 15 }, data: { src: before, alt: 'Cover' } };
    const { container } = await openCanvas('/canvas/9', {}, {
      ...original, canvasData: { ...original.canvasData!, nodes: [imageNode] },
    });
    await waitFor(() => expect(container.querySelector('[data-id="cover"]')).toBeTruthy());
    await fireEvent.dblClick(container.querySelector('[data-id="cover"]')!);
    const url = await screen.findByRole('textbox', { name: 'Image URL' }) as HTMLInputElement;
    expect(url.value).toBe(before);
    await fireEvent.click(button('Local file'));
    const input = screen.getByText('Click to select an image').closest('label')!.querySelector('input')!;
    await fireEvent.change(input, { target: { files: [new File(['image'], 'cover.png', { type: 'image/png' })] } });
    await waitFor(() => expect(screen.getByAltText('Preview').getAttribute('src')).toBe('data:image/png;base64,aW1hZ2U='));
    await fireEvent.click(button('Add'));
    await savedNode('image', { src: 'data:image/png;base64,aW1hZ2U=', alt: 'Cover' });
    expect(container.querySelectorAll('.vue-flow__node-image')).toHaveLength(1);
    expect(container.querySelector('[data-id="cover"]')).toBeTruthy();
  });

  it('navigates a document outline and makes a reference from the selected passage', async () => {
    await openCanvas();
    await fireEvent.click(screen.getByTitle('Document Reference'));
    await fireEvent.click(await screen.findByRole('button', { name: 'Field notes' }));
    const heading = await screen.findByRole('heading', { name: 'Findings' });
    const scroll = vi.spyOn(heading, 'scrollIntoView');
    await fireEvent.click(button('Findings'));
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });

    const selected = await screen.findByText('Manuscripts were catalogued.');
    const range = document.createRange();
    range.selectNodeContents(selected);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    try {
      await fireEvent.click(button('Add'));
      await savedNode('docRef', { docId: doc.id, title: 'Manuscripts were catalogued.', sourceName: doc.name });
    } finally {
      selection.removeAllRanges();
    }
  });

  it('clears a selected text tool on a second press and adds a new text node after reselecting', async () => {
    const { container } = await openCanvas();
    const tool = screen.getByTitle('Text');
    const pane = container.querySelector('.vue-flow__pane')!;
    await fireEvent.click(tool);
    expect(container.querySelector('.cursor-crosshair')).toBeTruthy();
    await fireEvent.click(tool);
    await fireEvent.click(pane, { clientX: 80, clientY: 120 });
    expect(container.querySelector('.vue-flow__node-text')).toBeNull();

    await fireEvent.click(tool);
    await fireEvent.click(pane, { clientX: 80, clientY: 120 });
    await savedNode('text', { text: '' });
    expect(container.querySelector('.cursor-crosshair')).toBeNull();
  });
});
