import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import Dataset from '@/pages/Dataset.vue';
import type { DatasetField, DatasetRecord } from '@/services/datasets/useDatasets';

const { api, notification, subscribe, unsubscribe } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  notification: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
}));
vi.mock('@/services/api', () => ({ default: api }));
vi.mock('@/composables/useNotification', () => ({ useNotification: () => notification }));
vi.mock('@/services/notifications/notification', () => ({ connectSocket: vi.fn() }));
vi.mock('@/services/notifications/executionPublication', () => ({ subscribeExecutionPublication: subscribe }));

const schema: DatasetField[] = [
  { key: 'city', name: 'City', type: 'text', required: false },
  { key: 'population', name: 'Population', type: 'number', required: false },
  { key: 'active', name: 'Active', type: 'boolean', required: false },
  { key: 'region', name: 'Region', type: 'select', required: false, options: ['North', 'South'] },
];
const date = '2026-01-15T08:00:00Z';
const record = (id: number, data: DatasetRecord['data']): DatasetRecord => ({
  id, data, cellMetadata: {}, sourceResourceId: null, extractionStatus: 'extracted',
  extractionError: null, createdAt: date, updatedAt: date,
});
const first = record(31, { city: 'Madrid', population: 300, active: true, region: 'North' });
const second = record(32, { city: 'Toledo', population: 90, active: false, region: 'South' });
const button = (name: string) => screen.getByRole('button', { name });
const lastRecordsRequest = () => api.get.mock.calls.filter(([path]) => path === '/datasets/9/records').at(-1);

async function openDataset({
  sourceMode = 'manual',
  saved = [],
  dataSources = [],
  initialRecords = [first, second],
}: { sourceMode?: string; saved?: { id: number; name: string; config: object; createdAt: string }[]; dataSources?: { id: number }[]; initialRecords?: DatasetRecord[] } = {}) {
  const dataset = { id: 9, name: 'Census', description: 'Population figures', schema, sourceMode, dataSources };
  const records = [...initialRecords];
  api.get.mockImplementation(async (path) => {
    if (path === '/datasets/9') return { data: dataset };
    if (path === '/datasets/9/charts') return { data: saved };
    if (path === '/datasets/9/records') return { data: { records: [...records], total: records.length } };
    if (path === '/datasets') return { data: [] };
    throw new Error(`Unexpected GET ${path}`);
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/datasets/:id', component: Dataset }],
  });
  await router.push('/datasets/9');
  const { unmount } = render(Dataset, { global: { plugins: [router] } });
  await screen.findByRole('heading', { name: 'Census' });
  return { dataset, records, unmount };
}

beforeEach(() => {
  vi.resetAllMocks();
  subscribe.mockReturnValue(unsubscribe);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('dataset records', () => {
  it('sends the numeric filter, text search and sort direction with record requests', async () => {
    await openDataset();
    await fireEvent.click(screen.getByRole('columnheader', { name: /Population/ }));
    expect(lastRecordsRequest()).toEqual(['/datasets/9/records', {
      params: { page: 1, limit: 50, sort: 'population', order: 'asc' },
    }]);
    await fireEvent.click(screen.getByRole('columnheader', { name: /Population/ }));
    expect(lastRecordsRequest()?.[1].params.order).toBe('desc');

    await fireEvent.click(button('Add filter'));
    await fireEvent.update(screen.getByRole('combobox', { name: 'Filter field' }), 'population');
    await fireEvent.update(screen.getByRole('combobox', { name: 'Filter operator' }), 'gte');
    await fireEvent.update(screen.getByRole('textbox', { name: 'Filter value' }), '100');
    await fireEvent.click(button('Apply'));

    const search = screen.getByRole('textbox', { name: 'Search across text fields' });
    await fireEvent.update(search, 'Madrid');
    await fireEvent.keyDown(search, { key: 'Enter' });
    expect(lastRecordsRequest()).toEqual(['/datasets/9/records', {
      params: { page: 1, limit: 50, sort: 'population', order: 'desc', 'filter[population_gte]': '100', search: 'Madrid' },
    }]);
    await fireEvent.click(button('Clear all'));
    await fireEvent.keyDown(search, { key: 'Enter' });
    expect(lastRecordsRequest()?.[1].params).not.toHaveProperty(['filter[population_gte]']);
  });

  it('creates a record with typed field values and refreshes the data table', async () => {
    const { records } = await openDataset();
    const data = { city: 'Bilbao', population: 100, active: true, region: 'North' };
    api.post.mockImplementation(async () => {
      const created = record(33, data);
      records.push(created);
      return { data: created };
    });
    await fireEvent.click(button('New Record'));
    await fireEvent.update(screen.getByLabelText('City'), data.city);
    await fireEvent.update(screen.getByRole('spinbutton', { name: 'Population' }), '100');
    await fireEvent.click(screen.getByRole('checkbox', { name: /Active/ }));
    await fireEvent.update(screen.getByRole('combobox', { name: 'Region' }), data.region);
    await fireEvent.click(button('Save'));

    expect(await screen.findByText('Bilbao')).toBeTruthy();
    expect(api.post).toHaveBeenCalledWith('/datasets/9/records', { data });
    expect(notification.success).toHaveBeenCalledWith('Record created');
  });

  it('cancels a pending grid edit, then persists a second edit', async () => {
    const { records } = await openDataset();
    const edit = async (text: string, value: string) => {
      await fireEvent.dblClick(screen.getByText(text));
      const editor = screen.getByRole('textbox', { name: 'Edit City for record 31' });
      await fireEvent.update(editor, value);
      await fireEvent.blur(editor);
    };
    await edit('Madrid', 'Discarded');
    await fireEvent.click(button('Cancel'));
    expect(screen.getByText('Madrid')).toBeTruthy();
    expect(api.patch).not.toHaveBeenCalled();

    const saved = record(31, { ...first.data, city: 'Salamanca' });
    api.patch.mockImplementation(async () => {
      records.splice(0, 1, saved);
      return { data: saved };
    });
    await edit('Madrid', 'Salamanca');
    await fireEvent.click(button('Save'));
    expect(await screen.findByText('Salamanca')).toBeTruthy();
    expect(api.patch).toHaveBeenCalledWith('/datasets/9/records/31', { data: saved.data });
    expect(notification.success).toHaveBeenCalledWith('Record updated');
  });

  it('bulk deletes only selected records and refreshes the table', async () => {
    const { records } = await openDataset();
    api.delete.mockImplementation(async () => {
      records.splice(0, 1);
      return { data: { deleted: 1 } };
    });
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Select all records' }));
    expect(screen.getByText('2 selected')).toBeTruthy();
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Select record 32' }));
    expect(screen.getByText('1 selected')).toBeTruthy();
    await fireEvent.click(button('Delete'));
    await fireEvent.click(button('Cancel'));
    expect(api.delete).not.toHaveBeenCalled();

    await fireEvent.click(button('Delete'));
    await fireEvent.click(button('Delete All'));
    await waitFor(() => expect(screen.queryByText('Madrid')).toBeNull());
    expect(screen.getByText('Toledo')).toBeTruthy();
    expect(api.delete).toHaveBeenCalledWith('/datasets/9/records/bulk', { data: { recordIds: [31] } });
  });

  it('refreshes records on extraction notifications for this dataset and unsubscribes on exit', async () => {
    const { unmount } = await openDataset({ sourceMode: 'resource_selection', dataSources: [{ id: 19 }] });
    const callback = subscribe.mock.calls.find(([event]) => event === 'notification')![1];
    expect(lastRecordsRequest()).toBeTruthy();
    api.get.mockClear();

    callback({ type: 'dataset.extract-row', datasetId: 99 });
    callback({ type: 'unrelated', datasetId: 9 });
    expect(lastRecordsRequest()).toBeUndefined();
    callback({ type: 'dataset.extract-row', datasetId: 9 });
    expect(lastRecordsRequest()).toBeTruthy();

    api.post.mockResolvedValue({ data: { executionId: 'sync-1' } });
    await fireEvent.click(button('Sync'));
    await waitFor(() => expect(notification.success).toHaveBeenCalledWith('Sync started'));
    expect(api.post).toHaveBeenCalledWith('/data-sources/19/sync');
    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});

describe('dataset schema and saved views', () => {
  it('asks for confirmation before applying a schema change that removes existing data', async () => {
    const { dataset } = await openDataset();
    const nextSchema = schema.slice(1);
    api.post.mockResolvedValue({ data: {
      safe: false, removedFields: [{ key: 'city', name: 'City', affectedRecords: 2 }], typeChanges: [],
    } });
    api.patch.mockResolvedValue({ data: { ...dataset, schema: nextSchema } });
    await fireEvent.click(screen.getAllByRole('button', { name: 'Schema' })[0]);
    await fireEvent.click(screen.getAllByTitle('Remove field')[0]);
    await fireEvent.click(button('Save'));
    expect(await screen.findByText('Removed fields with existing data')).toBeTruthy();
    expect(api.patch).not.toHaveBeenCalled();
    await fireEvent.click(button('Cancel'));

    await fireEvent.click(button('Save'));
    await screen.findByText('Removed fields with existing data');
    await fireEvent.click(button('Apply anyway'));
    await waitFor(() => expect(notification.success).toHaveBeenCalledWith('Schema updated'));
    expect(api.post).toHaveBeenLastCalledWith('/datasets/9/analyze-schema', { schema: nextSchema });
    expect(api.patch).toHaveBeenCalledWith('/datasets/9', { name: dataset.name, description: dataset.description, schema: nextSchema });
  });

  it('summarizes saved views, filters by name and removes only the deleted view', async () => {
    const saved = [
      { id: 10, name: 'Population by city', config: { xField: 'city', yField: 'population', aggregation: 'sum' } },
      { id: 20, name: 'Monthly counts', config: { visualMode: 'time-series', params: { valueField: 'population', period: 'ME' } } },
      { id: 30, name: 'Population outliers', config: { visualMode: 'outliers', params: { field: 'population' } } },
      { id: 40, name: 'Fields', config: { visualMode: 'summary' } },
      { id: 50, name: 'Cross-tab', config: { visualMode: 'pivot', params: { rowField: 'region', colField: 'city', fn: 'count' } } },
    ];
    await openDataset({ saved: saved.map((view) => ({ ...view, createdAt: date })) });
    await fireEvent.click(screen.getByRole('button', { name: /^Saved/ }));
    for (const summary of [
      'City · Population · sum', 'Population · monthly', 'Population · IQR + Z-score', 'All fields overview', 'Region · City · count',
    ]) {
      expect(screen.getByText((text) => text.startsWith(summary + ' · '))).toBeTruthy();
    }
    await fireEvent.update(screen.getByRole('textbox', { name: 'Search saved views by name' }), ' monthly ');
    expect(screen.queryByText('Population by city')).toBeNull();
    api.delete.mockResolvedValue({ data: {} });
    await fireEvent.click(screen.getByTitle('Delete'));
    await waitFor(() => expect(screen.queryByText('Monthly counts')).toBeNull());
    expect(api.delete).toHaveBeenCalledWith('/datasets/charts/20');
  });
});

describe('dataset sources and CSV', () => {
  it('starts extraction for pending rows and disables repeated requests during cooldown', async () => {
    const { records } = await openDataset({ sourceMode: 'resource_selection' });
    const base = api.get.getMockImplementation()!;
    records[0] = { ...first, extractionStatus: 'pending', sourceResourceId: 40 };
    const response = Promise.withResolvers<{ data: { rowsQueued: number } }>();
    api.post.mockReturnValueOnce(response.promise);
    await fireEvent.click(button('Extract all'));
    const extract = button('Extract all') as HTMLButtonElement;
    expect(extract.disabled).toBe(true);
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/datasets/9/extract', {});
    api.get.mockImplementation(async (url, options) => {
      if (url === '/datasets/9/records') return { data: { records: [...records], total: 2 } };
      return base(url, options);
    });
    response.resolve({ data: { rowsQueued: 1 } });
    expect(await screen.findByRole('button', { name: 'Extract pending (1)' })).toBeTruthy();
    expect(notification.success).toHaveBeenCalledWith('Extraction started: 1 row queued');
  });

  it('re-extracts a row and requires explicit consent to overwrite a manually edited cell', async () => {
    const annotated: DatasetRecord = {
      ...first, sourceResourceId: 40,
      cellMetadata: { population: {
        sourceResourceId: 40, page: 2, quote: 'Madrid had 300 documented entries.', editedByUser: true,
        model: 'test-model', promptVersion: '1', extractedAt: date,
      } },
    };
    await openDataset({ sourceMode: 'resource_selection', initialRecords: [annotated, second] });
    api.post.mockImplementation(async (url: string, payload: { force?: boolean }) => ({
      data: url.includes('/cells/') && !payload.force
        ? { requiresConfirmation: true, reason: 'manually edited' }
        : { executionId: 're-extract-1' },
    }));
    await fireEvent.click(await screen.findByTitle('Re-extract this row'));
    expect(api.post).toHaveBeenCalledWith('/datasets/9/records/31/re-extract', { columnsToExtract: undefined });
    const anchor = await screen.findByTitle('Show extraction source');
    await fireEvent.click(anchor);
    expect(screen.getByText(/Madrid had 300 documented entries/)).toBeTruthy();
    await fireEvent.click(button('Re-extract this cell'));
    const path = '/datasets/9/records/31/cells/population/re-extract';
    expect(api.post).toHaveBeenLastCalledWith(path, { force: false });
    expect(await screen.findByRole('heading', { name: 'Overwrite manual edit?' })).toBeTruthy();
    await fireEvent.click(button('Cancel'));
    expect(api.post).toHaveBeenCalledTimes(2);
    await fireEvent.click(screen.getByTitle('Show extraction source'));
    await fireEvent.click(button('Re-extract this cell'));
    await fireEvent.click(await screen.findByRole('button', { name: 'Overwrite' }));
    expect(api.post).toHaveBeenLastCalledWith(path, { force: true });
    await waitFor(() => expect(notification.success).toHaveBeenCalledWith('Cell queued for re-extraction'));
  });

  it('starts a configured source synchronization and reloads the dataset', async () => {
    await openDataset({ sourceMode: 'manual', dataSources: [{ id: 81 }] });
    api.post.mockResolvedValueOnce({ data: { executionId: 'sync-1' } });
    await fireEvent.click(button('Sync'));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/data-sources/81/sync');
    await waitFor(() => expect(notification.success).toHaveBeenCalledWith('Sync started'));
    await waitFor(() => expect(api.get.mock.calls.filter(([url]) => url === '/datasets/9')).toHaveLength(2));
  });

  it.each([
    ['manual', 'Values only', {}, undefined, 'dataset.csv', 'CSV exported'],
    ['resource_selection', 'With sources (anchors)', { include_anchors: 'true' }, 'attachment; filename="census-sources.csv"', 'census-sources.csv', 'CSV exported with sources'],
  ] as const)('exports %s records with the expected options and filename', async (sourceMode, option, params, disposition, filename, message) => {
    await openDataset({ sourceMode });
    const base = api.get.getMockImplementation()!;
    const csv = new Blob(['city,population\nMadrid,300'], { type: 'text/csv' });
    api.get.mockImplementation(async (url, options) => url === '/datasets/9/export'
      ? { data: csv, headers: { 'content-disposition': disposition } }
      : base(url, options));
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:csv');
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const downloads: Array<{ url: string; name: string }> = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push({ url: this.href, name: this.download });
    });
    await fireEvent.click(button('Export'));
    await fireEvent.click(button(option));
    expect(api.get).toHaveBeenCalledWith('/datasets/9/export', { params, responseType: 'blob' });
    expect(createUrl).toHaveBeenCalledExactlyOnceWith(csv);
    expect(downloads).toEqual([{ url: 'blob:csv', name: filename }]);
    expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:csv');
    await waitFor(() => expect(notification.success).toHaveBeenCalledWith(message));
  });

  it('parses a dropped CSV, maps columns, reports row errors and reloads imported records', async () => {
    await openDataset();
    api.post.mockResolvedValueOnce({ data: {
      headers: ['City', 'Estimate', 'Unused'], previewRows: [['Madrid', '300', 'Unused']], totalRows: 2,
    } }).mockResolvedValueOnce({ data: { imported: 1, errors: [{ row: 2, messages: ['No city provided'] }] } });
    await fireEvent.click(button('Import CSV'));
    const heading = await screen.findByRole('heading', { name: 'Import CSV' });
    const modal = within(heading.parentElement!.parentElement!);
    const dropzone = modal.getByText(/Drop your CSV file here/);
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File(['City,Estimate,Unused\nMadrid,300,Unused'], 'census.csv', { type: 'text/csv' }));
    await fireEvent.drop(dropzone, { dataTransfer });
    await fireEvent.click(modal.getByRole('button', { name: 'Parse CSV' }));
    const city = await modal.findByLabelText('Map column City') as HTMLSelectElement;
    expect(city.value).toBe('city');
    await fireEvent.update(modal.getByLabelText('Map column Estimate'), 'population');
    await fireEvent.click(modal.getByRole('button', { name: 'Import' }));
    const [[previewPath, preview], [confirmPath, confirmed]] = api.post.mock.calls as [[string, FormData], [string, FormData]];
    expect(previewPath).toBe('/datasets/9/import');
    expect(preview.get('file')).toMatchObject({ type: 'text/csv' });
    expect(confirmPath).toBe('/datasets/9/import/confirm');
    expect(confirmed.get('mappings')).toBe(JSON.stringify([
      { csvColumn: 'City', fieldKey: 'city' }, { csvColumn: 'Estimate', fieldKey: 'population' },
    ]));
    expect(confirmed.get('skipFirstRow')).toBe('true');
    expect(await modal.findByText('Row 2: No city provided')).toBeTruthy();
    await waitFor(() => expect(api.get.mock.calls.filter(([url]) => url === '/datasets/9/records')).toHaveLength(2));
  });
});

describe('dataset analysis lifecycle', () => {
  it('polls for analysis completion, saves the view and reopens it with the same parameters', async () => {
    await openDataset();
    const base = api.get.getMockImplementation()!;
    const params = { chartType: 'bar', fn: 'mean', period: 'ME' };
    const analysisConfig = { operation: 'summary', params, visualMode: 'summary' };
    const saved = { id: 91, name: 'Population summary', config: analysisConfig, createdAt: date };
    const result = { operation: 'summary', chartType: 'none', title: 'Census summary', tableData: { fields: [
      { field: 'population', name: 'Population', type: 'number', nonNullCount: 2, min: 90, max: 300, mean: 195 },
    ] } };
    let polls = 0;
    api.get.mockImplementation(async (path, options) => {
      if (path !== '/datasets/9/stats/summary-1') return base(path, options);
      if (++polls === 1) throw new Error('Temporary request failure');
      return { data: { status: 'completed', result } };
    });
    api.post.mockImplementation(async (path) => ({
      data: path === '/datasets/9/stats' ? { executionId: 'summary-1' } : saved,
    }));
    await fireEvent.click(button('Charts & Analysis'));
    vi.useFakeTimers();
    try {
      await fireEvent.click(button('Run'));
      expect(api.post).toHaveBeenCalledExactlyOnceWith('/datasets/9/stats', { operation: 'summary', params });
      expect(button('Analyzing...')).toBeTruthy();
      await vi.advanceTimersByTimeAsync(4200);
      expect(polls).toBe(2);
      expect(screen.getByRole('cell', { name: '195' })).toBeTruthy();

      await fireEvent.click(button('Save View'));
      await fireEvent.update(screen.getByLabelText('Name'), '  Population summary  ');
      await fireEvent.click(button('Save'));
      expect(api.post).toHaveBeenLastCalledWith('/datasets/9/charts', {
        name: saved.name, config: analysisConfig,
      });

      await fireEvent.click(button('Saved'));
      await fireEvent.click(screen.getByText(saved.name));
      await vi.advanceTimersByTimeAsync(2200);
      expect(api.post).toHaveBeenLastCalledWith('/datasets/9/stats', { operation: 'summary', params });
      expect(screen.getByRole('cell', { name: '195' })).toBeTruthy();
      expect(polls).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('dataset chart runs', () => {
  it('runs a filtered chart, polls through a transient read error, and saves the resulting view on retry', async () => {
    await openDataset();
    const priorGet = api.get.getMockImplementation()!;
    let polls = 0;
    api.get.mockImplementation(async (path, ...args) => {
      if (path === '/datasets/9/stats/exec-1') {
        polls++;
        if (polls === 1) throw new Error('Transient failure');
        if (polls === 2) return { data: { status: 'running' } };
        return { data: { status: 'completed', result: {
          title: 'Population counts', chartType: 'pie', chartData: { labels: ['North', 'South'], values: [1, 1] },
        } } };
      }
      return priorGet(path, ...args);
    });
    api.post.mockResolvedValueOnce({ data: { executionId: 'exec-1' } })
      .mockRejectedValueOnce(new Error('Write unavailable'))
      .mockImplementationOnce(async (_path, payload) => ({ data: { id: 81, ...payload, createdAt: date, updatedAt: date } }));

    await fireEvent.click(button('Add filter'));
    await fireEvent.update(screen.getByRole('combobox', { name: 'Filter field' }), 'population');
    await fireEvent.update(screen.getByRole('combobox', { name: 'Filter operator' }), 'gte');
    await fireEvent.update(screen.getByRole('textbox', { name: 'Filter value' }), '50');
    await fireEvent.click(button('Apply'));
    const search = screen.getByRole('textbox', { name: 'Search across text fields' });
    await fireEvent.update(search, 'Madrid');
    await fireEvent.keyDown(search, { key: 'Enter' });

    await fireEvent.click(button('Charts & Analysis'));
    await fireEvent.click(button('Pie'));
    await fireEvent.update(screen.getByRole('combobox', { name: /^X Axis|^Category/ }), 'region');
    vi.useFakeTimers();
    await fireEvent.click(button('Generate Chart'));
    expect(screen.queryByRole('button', { name: 'Save View' })).toBeNull();
    await vi.advanceTimersByTimeAsync(4000);
    expect(polls).toBe(2);
    expect(screen.queryByRole('heading', { name: 'Population counts' })).toBeNull();
    await vi.advanceTimersByTimeAsync(2000);
    expect(screen.getByRole('heading', { name: 'Population counts' })).toBeTruthy();
    const params = {
      chartType: 'pie', xField: 'region', aggregation: 'count', sortBy: 'value', sortOrder: 'desc', limit: 20,
      filters: [{ field: 'population', operator: 'gte', value: '50' }], search: 'Madrid',
    };
    expect(api.post).toHaveBeenCalledWith('/datasets/9/stats', { operation: 'chart', params });

    await fireEvent.click(button('Save View'));
    expect((button('Save') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.update(screen.getByRole('textbox', { name: 'Name' }), '  Population by region  ');
    await fireEvent.click(button('Save'));
    await vi.advanceTimersByTimeAsync(0);
    expect(notification.error).toHaveBeenCalledExactlyOnceWith('Failed to save view');
    await fireEvent.click(button('Save'));
    await vi.advanceTimersByTimeAsync(0);
    expect(notification.success).toHaveBeenCalledWith('"Population by region" saved');
    expect(api.post).toHaveBeenLastCalledWith('/datasets/9/charts', {
      name: 'Population by region', config: { ...params, visualMode: 'chart-pie' },
    });
    await fireEvent.click(screen.getByRole('button', { name: /^Saved/ }));
    expect(screen.getByText('Population by region')).toBeTruthy();
    await vi.advanceTimersByTimeAsync(4000);
    expect(polls).toBe(3);
  });
});
