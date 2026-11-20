import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import Timeline from '@/pages/Timeline.vue';
import type { TimelineEvent, TimelineRecord } from '@/types/timeline';

const { api, renderPng } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }, renderPng: vi.fn() }));
vi.mock('@/services/api', () => ({ default: api }));
vi.mock('html-to-image', () => ({ toPng: renderPng }));

const milestone: TimelineEvent = {
  id: 'first', title: 'Archive opened', date: '2021-04-06', color: '#3b82f6',
};
const timeline: TimelineRecord = {
  id: 7, name: 'Archive history', timelineData: [milestone], epochs: [], notes: '', syncDatasetId: null,
  syncMapping: null, layoutType: 'horizontal', axisBreaks: false, project: { id: 13, name: 'Archive' },
  createdAt: '2026-01-10', updatedAt: '2026-01-10',
};
const button = (name: string) => screen.getByRole('button', { name });

async function openTimeline(path = '/timeline/7') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<p>Projects</p>' } },
      { path: '/timeline/:id', component: Timeline },
      { path: '/project/:id', component: { template: '<p>Project</p>' } },
    ],
  });
  await router.push(path);
  render(Timeline, { global: { plugins: [router, createPinia()] } });
  if (!path.includes('/new')) {
    await waitFor(() => expect((screen.getByRole('textbox', { name: 'Timeline name' }) as HTMLInputElement).value)
      .toBe(timeline.name));
  }
  return router;
}

beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockImplementation(async (path) => {
    if (path === '/timelines/7') return { data: structuredClone(timeline) };
    if (path === '/docs/project/13' || path === '/resources/project/13') return { data: [] };
    throw new Error(`Unexpected GET ${path}`);
  });
  api.patch.mockResolvedValue({ data: {} });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.style.removeProperty('--color-surface');
});

describe('timeline editing', () => {
  it('creates a project-scoped timeline from the new route when the name is entered', async () => {
    api.post.mockResolvedValue({ data: { id: 7 } });
    const router = await openTimeline('/timeline/new?projectId=13');
    const name = screen.getByRole('textbox', { name: 'Timeline name' });
    expect((button('Event') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.blur(name);
    expect(api.post).not.toHaveBeenCalled();

    await fireEvent.update(name, 'Archive history');
    await fireEvent.blur(name);
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/timeline/7'));
    expect(api.post).toHaveBeenCalledWith('/timelines', {
      name: 'Archive history', timelineData: [], layoutType: 'horizontal', axisBreaks: false, projectId: 13,
    });
  });

  it('creates, edits and removes a milestone, retaining the other events', async () => {
    await openTimeline();
    await fireEvent.click(button('Event'));
    expect((button('Add') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.update(screen.getByPlaceholderText('Event title'), 'Collection catalogued');
    await fireEvent.update(screen.getByLabelText('Date *'), '2022-03-10');
    await fireEvent.update(screen.getByLabelText('End Date (opt)'), '2022-03-12');
    await fireEvent.click(button('Add'));
    const editor = await screen.findByRole('textbox', { name: 'Event title' });
    const added = {
      id: expect.any(String), title: 'Collection catalogued', date: '2022-03-10',
      endDate: '2022-03-12', color: '#3b82f6',
    };
    expect(api.patch).toHaveBeenLastCalledWith('/timelines/7', {
      timelineData: [milestone, expect.objectContaining(added)],
    });

    await fireEvent.update(editor, 'Collection digitized');
    await fireEvent.blur(editor);
    expect(api.patch).toHaveBeenLastCalledWith('/timelines/7', {
      timelineData: [milestone, expect.objectContaining({ ...added, title: 'Collection digitized' })],
    });
    await fireEvent.click(screen.getByText('Delete', { exact: true }));
    expect(api.patch).toHaveBeenLastCalledWith('/timelines/7', { timelineData: [milestone] });
    expect(screen.queryByRole('textbox', { name: 'Event title' })).toBeNull();
  });

  it('persists layout, axis breaks and notes independently', async () => {
    await openTimeline();
    await fireEvent.click(screen.getByTitle('Enable axis breaks'));
    expect(api.patch).toHaveBeenLastCalledWith('/timelines/7', { axisBreaks: true });
    expect(screen.getByTitle('Disable axis breaks')).toBeTruthy();

    await fireEvent.click(button('Vertical'));
    expect(api.patch).toHaveBeenLastCalledWith('/timelines/7', { layoutType: 'vertical' });
    await fireEvent.click(button('Notes'));
    const notes = screen.getByRole('textbox', { name: 'Timeline notes' });
    await fireEvent.update(notes, 'Original holdings listed in box 14.');
    await fireEvent.blur(notes);
    expect(api.patch).toHaveBeenLastCalledWith('/timelines/7', { notes: 'Original holdings listed in box 14.' });
  });

  it('adds an epoch with a bounded date range', async () => {
    await openTimeline();
    await fireEvent.click(button('Epoch'));
    expect((button('Add') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.update(screen.getByLabelText('Name *'), 'Initial acquisition');
    await fireEvent.update(screen.getByLabelText('Start Date *'), '2021-01-01');
    await fireEvent.update(screen.getByLabelText('End Date *'), '2021-12-31');
    await fireEvent.click(button('Add'));
    expect(api.patch).toHaveBeenLastCalledWith('/timelines/7', {
      epochs: [expect.objectContaining({
        id: expect.any(String), name: 'Initial acquisition', startDate: '2021-01-01', endDate: '2021-12-31',
      })],
    });
  });

  it('filters events by description and saves document and resource links from the detail tab', async () => {
    const existing = api.get.getMockImplementation()!;
    api.get.mockImplementation(async (path) => {
      if (path === '/timelines/7') return { data: {
        ...timeline, layoutType: 'vertical',
        timelineData: [{ ...milestone, description: 'Official announcement' },
          { ...milestone, id: 'second', title: 'New exhibit', date: '2022-01-05' }],
      } };
      if (path === '/docs/project/13') return { data: [{ id: 15, name: 'Minutes' }] };
      if (path === '/resources/project/13') return { data: [{ id: 16, name: 'Newspaper scan' }] };
      return existing(path);
    });
    await openTimeline();
    await fireEvent.click(button('Events'));
    await fireEvent.update(screen.getByLabelText('Search events'), 'announcement');
    const eventRow = screen.getByTitle('Edit').parentElement!;
    expect(eventRow.parentElement?.textContent).toContain(milestone.title);
    await fireEvent.click(within(eventRow).getByTitle('Edit'));

    await fireEvent.update(screen.getByLabelText('Document'), '15');
    await fireEvent.update(screen.getByLabelText('Resource'), '16');
    await fireEvent.update(screen.getByLabelText('End date'), '2021-04-08');
    expect(api.patch).toHaveBeenLastCalledWith('/timelines/7', {
      timelineData: [
        expect.objectContaining({ id: 'first', docId: 15, resourceId: 16, endDate: '2021-04-08' }),
        expect.objectContaining({ id: 'second' }),
      ],
    });

    await fireEvent.click(button('Delete event'));
    expect(api.patch).toHaveBeenLastCalledWith('/timelines/7', {
      timelineData: [expect.objectContaining({ id: 'second' })],
    });
  });

  it('updates an existing epoch in place and removes it through its card controls', async () => {
    const epoch = { id: 'opening', name: 'First season', startDate: '2021-03-01', endDate: '2021-06-01', color: '#3b82f620' };
    const existing = api.get.getMockImplementation()!;
    api.get.mockImplementation(async (path) => path === '/timelines/7'
      ? { data: { ...timeline, epochs: [epoch] } }
      : existing(path));
    await openTimeline();
    const chip = () => screen.getAllByText(/First season/).find((item) => item.parentElement?.querySelector('button[title="Edit"]'))!.parentElement!;
    await fireEvent.click(within(chip()).getByTitle('Edit'));
    expect(await screen.findByRole('heading', { name: 'Edit Epoch' })).toBeTruthy();
    await fireEvent.update(screen.getByLabelText('End Date *'), '2021-06-02');
    await fireEvent.click(button('Save'));
    expect(api.patch).toHaveBeenLastCalledWith('/timelines/7', { epochs: [{ ...epoch, endDate: '2021-06-02' }] });

    await fireEvent.click(within(chip()).getByTitle('Delete'));
    expect(api.patch).toHaveBeenLastCalledWith('/timelines/7', { epochs: [] });
    expect(screen.queryByText(epoch.name)).toBeNull();
  });

  it('deletes a timeline only after confirmation and returns to the project', async () => {
    const router = await openTimeline();
    api.delete.mockResolvedValue({ data: {} });
    await fireEvent.click(button('Remove'));
    await fireEvent.click(button('Cancel'));
    expect(api.delete).not.toHaveBeenCalled();

    await fireEvent.click(button('Remove'));
    const dialog = screen.getByRole('heading', { name: 'Remove Timeline' }).parentElement!.parentElement!;
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/project/13'));
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/timelines/7');
  });
});

describe('timeline dataset import', () => {
  it.each([false, true])('previews valid rows and submits the import (synchronized %s)', async (sync) => {
    const dataset = {
      id: 23, name: 'Milestones',
      schema: [
        { key: 'label', name: 'Label', type: 'text' },
        { key: 'started', name: 'Started', type: 'date' },
        { key: 'ended', name: 'Ended', type: 'date' },
      ],
    };
    const getTimelineData = api.get.getMockImplementation()!;
    api.get.mockImplementation(async (path) => {
      if (path === '/datasets') return { data: [dataset] };
      if (path === '/datasets/23') return { data: dataset };
      if (path === '/datasets/23/records') {
        return { data: {
          records: [
            { data: { label: 'Imported milestone', started: '2023-01-04', ended: '2023-01-12' } },
            { data: { label: 'Undated row' } },
          ],
          total: 2,
        } };
      }
      return getTimelineData(path);
    });
    await openTimeline();
    await fireEvent.click(button('Import'));
    await screen.findByRole('option', { name: 'Milestones' });
    await fireEvent.update(screen.getByRole('combobox', { name: 'Dataset' }), '23');
    expect(await screen.findByText(/1 records will be skipped/)).toBeTruthy();
    if (sync) await fireEvent.click(screen.getByRole('checkbox', { name: 'Keep synced with dataset' }));
    await fireEvent.click(button(sync ? 'Import & Sync 1 events' : 'Import 1 events'));

    const imported = expect.objectContaining({
      id: expect.any(String), title: 'Imported milestone', date: '2023-01-04', endDate: '2023-01-12',
    });
    expect(api.get).toHaveBeenCalledWith('/datasets/23/records', { params: { limit: 5000 } });
    expect(api.patch).toHaveBeenCalledWith('/timelines/7', {
      timelineData: sync ? [imported] : [milestone, imported],
    });
    if (sync) {
      await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/timelines/7', {
        syncMapping: { titleField: 'label', dateField: 'started', endDateField: 'ended', descriptionField: '', color: '#3b82f6' },
      }));
      expect(api.patch).toHaveBeenCalledWith('/timelines/7', { syncDatasetId: 23 });
      expect(screen.queryByRole('button', { name: 'Event' })).toBeNull();
      await fireEvent.click(screen.getByTitle('Unsync from dataset'));
      await waitFor(() => expect(api.patch).toHaveBeenLastCalledWith('/timelines/7', { syncMapping: null }));
      expect(api.patch).toHaveBeenCalledWith('/timelines/7', { syncDatasetId: null });
      expect(button('Event')).toBeTruthy();
    } else {
      expect(api.patch).toHaveBeenCalledOnce();
    }
  });
});

describe('timeline dataset import', () => {
  const schema = [
    { key: 'title', name: 'Event name', type: 'text' },
    { key: 'start', name: 'Opening', type: 'datetime' },
    { key: 'finish', name: 'Closing', type: 'date' },
    { key: 'summary', name: 'Summary', type: 'text' },
  ];
  const records = [
    { id: 1, data: { title: 'Research exhibition', start: '2025-04-03T12:00:00Z', finish: '2025-06-16', summary: 'Opening of the spring collection' } },
    { id: 2, data: { title: 'Undated exhibition' } },
  ];

  async function openImport() {
    const get = api.get.getMockImplementation()!;
    api.get.mockImplementation(async (path, ...args) => {
      if (path === '/datasets') return { data: [{ id: 81, name: 'Exhibitions register' }, { id: 82, name: 'Unavailable' }] };
      if (path === '/datasets/81') return { data: { id: 81, schema } };
      if (path === '/datasets/81/records') return { data: { records, total: records.length } };
      if (path === '/datasets/82') throw new Error('Dataset access denied');
      return get(path, ...args);
    });
    await openTimeline();
    await fireEvent.click(button('Import'));
    await screen.findByRole('option', { name: 'Exhibitions register' });
    return screen.getByRole('combobox', { name: 'Dataset' });
  }

  it('previews record mappings, skips invalid rows and appends events to the manual timeline', async () => {
    const dataset = await openImport();
    expect((button('Import 0 events') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.update(dataset, '81');
    expect(await screen.findByText('1 records will be skipped (missing title or date)')).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith('/datasets/81/records', { params: { limit: 5000 } });
    expect((screen.getByLabelText('Title *') as HTMLSelectElement).value).toBe('title');
    expect((screen.getByLabelText('Date *') as HTMLSelectElement).value).toBe('start');
    expect((screen.getByLabelText('End Date (opt)') as HTMLSelectElement).value).toBe('finish');

    await fireEvent.update(screen.getByLabelText('Description (opt)'), 'summary');
    await fireEvent.click(button('Import 1 events'));
    expect(api.patch).toHaveBeenLastCalledWith('/timelines/7', {
      timelineData: [milestone, expect.objectContaining({
        title: 'Research exhibition', date: '2025-04-03', endDate: '2025-06-16', description: 'Opening of the spring collection',
      })],
    });
  });

  it('replaces existing events for a synced dataset, refreshes them and disconnects the source', async () => {
    const dataset = await openImport();
    await fireEvent.update(dataset, '81');
    await screen.findByRole('cell', { name: 'Research exhibition' });
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Keep synced with dataset' }));
    await fireEvent.click(button('Import & Sync 1 events'));
    expect(api.patch).toHaveBeenCalledWith('/timelines/7', {
      timelineData: [expect.objectContaining({ title: 'Research exhibition', date: '2025-04-03' })],
    });
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/timelines/7', {
      syncMapping: { titleField: 'title', dateField: 'start', endDateField: 'finish', descriptionField: '', color: '#3b82f6' },
    }));
    expect(api.patch).toHaveBeenCalledWith('/timelines/7', { syncDatasetId: 81 });

    const get = api.get.getMockImplementation()!;
    api.get.mockImplementation(async (path, ...args) => {
      if (path === '/datasets/81/records') return { data: { records: [{ id: 3, data: { title: 'Revised exhibition', start: '2025-05-01' } }], total: 1 } };
      return get(path, ...args);
    });
    await fireEvent.click(screen.getByTitle('Refresh from dataset'));
    await waitFor(() => expect(api.patch).toHaveBeenLastCalledWith('/timelines/7', {
      timelineData: [expect.objectContaining({ title: 'Revised exhibition', date: '2025-05-01' })],
    }));
    await fireEvent.click(screen.getByTitle('Unsync from dataset'));
    await waitFor(() => expect(api.patch).toHaveBeenLastCalledWith('/timelines/7', { syncMapping: null }));
    expect(api.patch).toHaveBeenCalledWith('/timelines/7', { syncDatasetId: null });
    expect(screen.queryByText('Synced')).toBeNull();
    expect(button('Import')).toBeTruthy();
  });

  it('shows a failed dataset selection and allows the reader to select a working dataset', async () => {
    const dataset = await openImport();
    await fireEvent.update(dataset, '82');
    expect(await screen.findByText('Dataset access denied')).toBeTruthy();
    expect((button('Import 0 events') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.update(dataset, '81');
    expect(await screen.findByRole('cell', { name: 'Research exhibition' })).toBeTruthy();
    expect(screen.queryByText('Dataset access denied')).toBeNull();
    await fireEvent.click(button('Cancel'));
    expect(api.patch).not.toHaveBeenCalled();
  });
});

describe('timeline image export', () => {
  const png = 'data:image/png;base64,aW1hZ2U=';
  it('dismisses the menu on outside clicks and downloads the visible layout with the timeline name', async () => {
    const links: Array<{ file: string; url: string }> = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      links.push({ file: this.download, url: this.href });
    });
    renderPng.mockResolvedValue(png);
    document.documentElement.style.setProperty('--color-surface', '#fffaef');
    await openTimeline();
    await fireEvent.click(button('Export'));
    expect(button('Download as PNG')).toBeTruthy();
    await fireEvent.click(document.body);
    expect(screen.queryByRole('button', { name: 'Download as PNG' })).toBeNull();

    await fireEvent.click(button('Export'));
    await fireEvent.click(button('Download as PNG'));
    await waitFor(() => expect(links).toEqual([{ file: timeline.name + '.png', url: png }]));
    expect(renderPng).toHaveBeenCalledExactlyOnceWith(document.querySelector('[data-timeline-export]'), { backgroundColor: '#fffaef', pixelRatio: 2 });
  });

  it('uploads a named image as a project resource and preserves the timeline on conversion failure', async () => {
    const fetch = vi.fn().mockResolvedValue({ blob: async () => new Blob(['image'], { type: 'image/png' }) });
    vi.stubGlobal('fetch', fetch);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderPng.mockRejectedValueOnce(new Error('Export unavailable')).mockResolvedValueOnce(png);
    api.post.mockResolvedValue({ data: { resourceId: 59 } });
    await openTimeline();

    await fireEvent.click(button('Export'));
    await fireEvent.click(button('Save as resource'));
    await waitFor(() => expect(log).toHaveBeenCalledWith('Export failed:', expect.any(Error)));
    expect(api.post).not.toHaveBeenCalled();
    await fireEvent.click(button('Export'));
    await fireEvent.click(button('Save as resource'));

    expect(await screen.findByText('Saved')).toBeTruthy();
    expect(fetch).toHaveBeenCalledExactlyOnceWith(png);
    const [path, form, config] = api.post.mock.calls[0];
    expect(path).toBe('/resources/upload');
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
    expect(form.get('file')).toMatchObject({ name: timeline.name + '.png', type: 'image/png' });
    expect(form.get('name')).toBe(timeline.name + ' (image)');
    expect(form.get('projectId')).toBe('13');
  });
});
