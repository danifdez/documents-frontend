import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDatasets, type DatasetField, type ImportResult, type SchemaAnalysis } from '@/services/datasets/useDatasets';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/services/api', () => ({ default: api }));

const schema: DatasetField[] = [{ key: 'city', name: 'City', type: 'text', required: false }];
const dataset = { id: 9, name: 'Census', schema };
const row = { id: 12, data: { city: 'Madrid' } };

beforeEach(() => {
  vi.resetAllMocks();
});

describe('dataset API', () => {
  it('loads project datasets, reports a failed request and clears the error on retry', async () => {
    const service = useDatasets();
    const failure = { response: { data: { message: 'Project unavailable' } } };
    api.get.mockRejectedValueOnce(failure).mockResolvedValueOnce({ data: [dataset] });

    const pending = service.getAllDatasets(4);
    expect(service.isLoading.value).toBe(true);
    expect(api.get).toHaveBeenCalledWith('/datasets', { params: { projectId: 4 } });
    await expect(pending).rejects.toBe(failure);
    expect(service.error.value).toBe('Project unavailable');
    expect(service.isLoading.value).toBe(false);

    const retry = service.getAllDatasets();
    expect(service.error.value).toBeNull();
    await expect(retry).resolves.toEqual([dataset]);
    expect(api.get).toHaveBeenLastCalledWith('/datasets', { params: {} });
    expect(service.isLoading.value).toBe(false);
  });

  it('creates a dataset, loads its definition, previews schema changes and applies a rename', async () => {
    const service = useDatasets();
    const renamed = { ...dataset, name: 'Revised census' };
    const schemaImpact: SchemaAnalysis = { safe: true, removedFields: [], typeChanges: [] };
    api.post.mockResolvedValueOnce({ data: dataset }).mockResolvedValueOnce({ data: schemaImpact });
    api.get.mockResolvedValue({ data: dataset });
    api.patch.mockResolvedValue({ data: renamed });

    await expect(service.createDataset({ name: 'Census', schema })).resolves.toBe(dataset);
    await expect(service.getDataset(9)).resolves.toBe(dataset);
    await expect(service.analyzeSchemaChange(9, schema)).resolves.toBe(schemaImpact);
    await expect(service.updateDataset(9, { name: renamed.name })).resolves.toBe(renamed);

    expect(api.post.mock.calls).toEqual([
      ['/datasets', { name: 'Census', schema }],
      ['/datasets/9/analyze-schema', { schema }],
    ]);
    expect(api.get).toHaveBeenCalledWith('/datasets/9');
    expect(api.patch).toHaveBeenCalledWith('/datasets/9', { name: renamed.name });

    api.delete.mockResolvedValue({ data: {} });
    await expect(service.deleteDataset(9)).resolves.toBeUndefined();
    expect(api.delete).toHaveBeenCalledWith('/datasets/9');
  });

  it('lists, edits, and deletes records under the correct dataset', async () => {
    const service = useDatasets();
    const result = { records: [row], total: 40 };
    const edited = { ...row, data: { city: 'Málaga' } };
    api.get.mockResolvedValue({ data: result });
    api.post.mockResolvedValue({ data: row });
    api.patch.mockResolvedValue({ data: edited });
    api.delete.mockResolvedValueOnce({ data: {} }).mockResolvedValueOnce({ data: { deleted: 2 } });

    await expect(service.getRecords(9)).resolves.toBe(result);
    await expect(service.getRecords(9, { limit: 10, offset: 20 })).resolves.toBe(result);
    expect(api.get.mock.calls).toEqual([
      ['/datasets/9/records', { params: {} }],
      ['/datasets/9/records', { params: { limit: 10, offset: 20 } }],
    ]);
    await expect(service.createRecord(9, row.data)).resolves.toBe(row);
    expect(api.post).toHaveBeenCalledWith('/datasets/9/records', { data: row.data });
    await expect(service.updateRecord(9, 12, edited.data)).resolves.toBe(edited);
    expect(api.patch).toHaveBeenCalledWith('/datasets/9/records/12', { data: edited.data });
    await expect(service.deleteRecord(9, 12)).resolves.toBeUndefined();
    await expect(service.bulkDeleteRecords(9, [13, 15])).resolves.toEqual({ deleted: 2 });
    expect(api.delete.mock.calls).toEqual([
      ['/datasets/9/records/12'],
      ['/datasets/9/records/bulk', { data: { recordIds: [13, 15] } }],
    ]);
  });

  it('resolves linked values and allows tables to render when links are unavailable', async () => {
    const service = useDatasets();
    await expect(service.resolveLinks(9, [], 'city')).resolves.toEqual({});
    expect(api.post).not.toHaveBeenCalled();

    const matches = { '0012': row.data, '23': { city: 'Toledo' } };
    api.post.mockResolvedValueOnce({ data: matches }).mockRejectedValueOnce(new Error('offline'));
    await expect(service.resolveLinks(9, ['0012', 23], 'code')).resolves.toEqual(matches);
    expect(api.post).toHaveBeenCalledWith('/datasets/9/resolve-links', {
      values: ['0012', 23], lookupField: 'code',
    });
    await expect(service.resolveLinks(9, [23])).resolves.toEqual({});
  });

  it('creates a relation without mixing up the dataset and record identifiers', async () => {
    const service = useDatasets();
    const relation = { id: 8, sourceDatasetId: 9, targetDatasetId: 6, relationType: 'one_to_many' };
    const link = { id: 5, sourceRecordId: 12, targetRecordId: 48 };
    api.post.mockResolvedValueOnce({ data: relation }).mockResolvedValueOnce({ data: link });
    api.get.mockResolvedValueOnce({ data: [relation] }).mockResolvedValueOnce({ data: [link] });
    api.delete.mockResolvedValue({});

    const { id, ...fields } = relation;
    await expect(service.createRelation(fields)).resolves.toBe(relation);
    await expect(service.getRelations(9)).resolves.toEqual([relation]);
    await expect(service.linkRecords(id, 12, 48)).resolves.toBe(link);
    await expect(service.getLinkedRecords(9, 12)).resolves.toEqual([link]);
    await service.unlinkRecords(id, link.id);
    await service.deleteRelation(id);

    expect(api.post.mock.calls).toEqual([
      ['/datasets/relations', fields],
      ['/datasets/relations/8/links', { sourceRecordId: 12, targetRecordId: 48 }],
    ]);
    expect(api.get.mock.calls).toEqual([['/datasets/9/relations'], ['/datasets/9/records/12/links']]);
    expect(api.delete.mock.calls).toEqual([['/datasets/relations/8/links/5'], ['/datasets/relations/8']]);
  });

  it('queues extraction, sends only selected columns and encodes cell keys before forcing extraction', async () => {
    const service = useDatasets();
    const queued = { executionId: 'job-14' };
    const warning = { requiresConfirmation: true, reason: 'Value edited manually' };
    api.post
      .mockResolvedValueOnce({ data: { rowsQueued: 5 } })
      .mockResolvedValueOnce({ data: queued })
      .mockResolvedValueOnce({ data: warning })
      .mockResolvedValueOnce({ data: queued });

    await expect(service.extractAll(9)).resolves.toEqual({ rowsQueued: 5 });
    await expect(service.reExtractRow(9, 12, ['city'])).resolves.toBe(queued);
    await expect(service.reExtractCell(9, 12, 'County / City')).resolves.toBe(warning);
    await expect(service.reExtractCell(9, 12, 'County / City', true)).resolves.toBe(queued);

    expect(api.post.mock.calls).toEqual([
      ['/datasets/9/extract', {}],
      ['/datasets/9/records/12/re-extract', { columnsToExtract: ['city'] }],
      ['/datasets/9/records/12/cells/County%20%2F%20City/re-extract', { force: false }],
      ['/datasets/9/records/12/cells/County%20%2F%20City/re-extract', { force: true }],
    ]);
  });

  it('requests suggestions and statistics and fetches results by execution id', async () => {
    const service = useDatasets();
    const completed = { status: 'completed', result: { columns: schema } };
    const stats = { status: 'completed', result: { rows: 100 } };
    api.post.mockResolvedValueOnce({ data: { executionId: 'columns' } })
      .mockResolvedValueOnce({ data: { executionId: 'stats' } });
    api.get.mockResolvedValueOnce({ data: completed }).mockResolvedValueOnce({ data: stats });

    const proposed = await service.proposeColumns([1, 2], 7);
    await expect(service.getProposeColumnsResult(proposed.executionId!)).resolves.toBe(completed);
    const requested = await service.requestStats(9);
    await expect(service.getStatsResult(9, requested.executionId)).resolves.toBe(stats);
    expect(api.post.mock.calls).toEqual([
      ['/datasets/propose-columns', { resourceIds: [1, 2], projectId: 7 }],
      ['/datasets/9/stats', { operation: 'summary', params: {} }],
    ]);
    expect(api.get.mock.calls).toEqual([['/datasets/propose-columns/columns'], ['/datasets/9/stats/stats']]);
  });

  it('sends groupBy only when aggregating by a field', async () => {
    const service = useDatasets();
    const response = [{ value: 10 }];
    api.get.mockResolvedValue({ data: response });
    await expect(service.aggregate(9, 'sales', 'sum')).resolves.toBe(response);
    await expect(service.aggregate(9, 'sales', 'sum', 'city')).resolves.toBe(response);
    expect(api.get.mock.calls).toEqual([
      ['/datasets/9/aggregate', { params: { field: 'sales', fn: 'sum' } }],
      ['/datasets/9/aggregate', { params: { field: 'sales', fn: 'sum', groupBy: 'city' } }],
    ]);
  });

  it('stores chart configuration and deletes the chart by its own id', async () => {
    const service = useDatasets();
    const chart = { id: 20, name: 'Counts', config: { chartType: 'bar' } };
    const renamed = { ...chart, name: 'City counts' };
    api.get.mockResolvedValue({ data: [chart] });
    api.post.mockResolvedValue({ data: chart });
    api.patch.mockResolvedValue({ data: renamed });
    api.delete.mockResolvedValue({});
    await expect(service.getSavedCharts(9)).resolves.toEqual([chart]);
    await expect(service.saveChart(9, chart.name, { chartType: 'bar' })).resolves.toBe(chart);
    await expect(service.updateSavedChart(20, { name: renamed.name })).resolves.toBe(renamed);
    await service.deleteSavedChart(20);
    expect(api.get).toHaveBeenCalledWith('/datasets/9/charts');
    expect(api.post).toHaveBeenCalledWith('/datasets/9/charts', { name: chart.name, config: chart.config });
    expect(api.patch).toHaveBeenCalledWith('/datasets/charts/20', { name: renamed.name });
    expect(api.delete).toHaveBeenCalledWith('/datasets/charts/20');
  });

  it('previews and confirms file imports with the selected column mapping', async () => {
    const service = useDatasets();
    const file = new File(['City\nMadrid'], 'places.csv', { type: 'text/csv' });
    const mappings = [{ csvColumn: 'City', fieldKey: 'city' }];
    const preview = { headers: ['City'], rows: [['Madrid']] };
    const result: ImportResult = { imported: 1, errors: [] };
    api.post.mockResolvedValueOnce({ data: preview }).mockResolvedValueOnce({ data: result })
      .mockResolvedValueOnce({ data: { dataset } }).mockResolvedValueOnce({ data: { dataset } });

    await expect(service.uploadCsvPreview(9, file)).resolves.toBe(preview);
    await expect(service.confirmCsvImport(9, file, mappings, false)).resolves.toBe(result);
    await expect(service.importFromFile(file, 'Places', 7)).resolves.toEqual({ dataset });
    await expect(service.importFromFile(file)).resolves.toEqual({ dataset });

    expect(api.post.mock.calls.map(([path]) => path)).toEqual([
      '/datasets/9/import', '/datasets/9/import/confirm', '/datasets/import', '/datasets/import',
    ]);
    const forms = api.post.mock.calls.map(([, form, config]) => {
      expect(config.headers['Content-Type']).toBe('multipart/form-data');
      expect(form.get('file')).toMatchObject({ name: 'places.csv' });
      return form;
    });
    expect(forms[1].get('mappings')).toBe(JSON.stringify(mappings));
    expect(forms[1].get('skipFirstRow')).toBe('false');
    expect(forms[2].get('name')).toBe('Places');
    expect(forms[2].get('projectId')).toBe('7');
    expect(forms[3].has('name')).toBe(false);
    expect(forms[3].has('projectId')).toBe(false);
  });

  it('creates a dataset from a table with the original headers and rows', async () => {
    const service = useDatasets();
    const table = { name: 'Places', headers: ['City'], rows: [['Madrid']], projectId: 3 };
    api.post.mockResolvedValue({ data: { dataset, recordCount: 1 } });
    await expect(service.createFromTable(table)).resolves.toEqual({ dataset, recordCount: 1 });
    expect(api.post).toHaveBeenCalledWith('/datasets/from-table', table);
  });

  it.each([
    [true, { 'content-disposition': 'attachment; filename="places.csv"' }, 'places.csv'],
    [false, {}, 'dataset.csv'],
  ] as const)('exports CSV and revokes the object URL (anchors %s)', async (anchors, headers, filename) => {
    const service = useDatasets();
    const blob = new Blob(['City\nMadrid'], { type: 'text/csv' });
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:report');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.href).toBe('blob:report');
        expect(this.download).toBe(filename);
      });
    api.get.mockResolvedValue({ data: blob, headers });

    try {
      await service.exportDatasetCsv(9, anchors);
      expect(api.get).toHaveBeenCalledWith('/datasets/9/export', {
        params: anchors ? { include_anchors: 'true' } : {}, responseType: 'blob',
      });
      expect(create).toHaveBeenCalledWith(blob);
      expect(click).toHaveBeenCalledOnce();
      expect(revoke).toHaveBeenCalledWith('blob:report');
    } finally {
      create.mockRestore();
      click.mockRestore();
      revoke.mockRestore();
    }
  });
});
