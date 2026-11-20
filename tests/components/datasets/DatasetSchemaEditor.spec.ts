import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import DatasetSchemaEditor from '@/components/datasets/DatasetSchemaEditor.vue';
import type { DatasetField } from '@/services/datasets/useDatasets';

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/services/api', () => ({ default: api }));

const linkedDataset = { id: 21, name: 'Catalogues', schema: [
  { key: 'code', name: 'Code', type: 'number' },
  { key: 'name', name: 'Title', type: 'text' },
] };
const field: DatasetField = { key: 'collection', name: 'Collection', type: 'text', required: false };
const suggestionsButton = () => screen.getByRole('button', { name: 'Suggest columns from sources' });

beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockImplementation(async (path) => {
    if (path === '/datasets') return { data: [linkedDataset] };
    throw new Error(`Unexpected GET ${path}`);
  });
});

afterEach(() => vi.useRealTimers());

describe('dataset schema editing', () => {
  it('normalizes generated keys, keeps saved keys when renamed and edits select options', async () => {
    const fields = reactive([{ ...field }]);
    render(DatasetSchemaEditor, { props: { modelValue: fields } });
    expect(screen.queryByRole('button', { name: /Suggest columns/ })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Add field' }));
    await fireEvent.update(screen.getAllByRole('textbox', { name: 'Field name' })[1], 'Année de publication!');
    await fireEvent.update(screen.getAllByRole('combobox', { name: 'Field type' })[1], 'select');
    await fireEvent.update(screen.getByRole('textbox', { name: /Options for/ }), ' Draft, , Confirmed  ');
    await fireEvent.click(screen.getAllByRole('checkbox', { name: 'Req.' })[1]);
    await fireEvent.update(screen.getAllByRole('textbox', { name: 'Field name' })[0], 'Collection title');
    expect(fields).toEqual([
      { ...field, name: 'Collection title' },
      { key: 'annee_de_publication', name: 'Année de publication!', type: 'select', required: true, options: ['Draft', 'Confirmed'] },
    ]);

    await fireEvent.click(screen.getAllByTitle('Remove field')[0]);
    expect(fields).toHaveLength(1);
    expect(fields[0].key).toBe('annee_de_publication');
  });

  it('configures lookup and display for a linked dataset and clears it on unlink', async () => {
    const fields = reactive([{ ...field }]);
    render(DatasetSchemaEditor, { props: { modelValue: fields } });
    await fireEvent.click(await screen.findByText('Link to another dataset (FK)'));
    const lookup = screen.getByRole('combobox', { name: 'Linked dataset lookup field' });
    const display = screen.getByRole('combobox', { name: 'Linked dataset display field' });
    await fireEvent.update(lookup, 'code');
    await fireEvent.update(display, 'name');
    expect(fields[0]).toMatchObject({ linkedDatasetId: 21, linkedLookupField: 'code', linkedDisplayField: 'name' });
    await fireEvent.click(screen.getByText('Linked to dataset'));
    expect(fields[0].linkedDatasetId).toBeUndefined();
    expect(fields[0].linkedDisplayField).toBeUndefined();
    expect(screen.queryByRole('combobox', { name: 'Linked dataset display field' })).toBeNull();
  });

  it('waits for suggestions, rejects conflicts and adds only selected valid columns', async () => {
    const fields = reactive([{ ...field }]);
    const date = { name: 'Published', key: 'published', type: 'date', description: 'Day of publication' };
    const status = { name: 'Review state', key: 'state', type: 'select', options: ['Draft', 'Final'] };
    const getDataset = api.get.getMockImplementation()!;
    api.get.mockImplementation(async (path, ...args) => {
      if (path === '/datasets/propose-columns/exec') return { data: { status: 'completed', result: { columns: [field, date, status] } } };
      return getDataset(path, ...args);
    });
    api.post.mockResolvedValue({ data: { executionId: 'exec' } });
    render(DatasetSchemaEditor, { props: { modelValue: fields, sourceMode: 'resource_selection', sourceConfig: { resourceIds: [7, 15] } } });
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/datasets', { params: {} }));
    expect(screen.getByText('Without a description, this column will be skipped during extraction.')).toBeTruthy();

    vi.useFakeTimers();
    await fireEvent.click(suggestionsButton());
    expect(api.post).toHaveBeenCalledWith('/datasets/propose-columns', { resourceIds: [7, 15], projectId: undefined });
    expect((screen.getByRole('button', { name: /Reading sources/ }) as HTMLButtonElement).disabled).toBe(true);
    await vi.advanceTimersByTimeAsync(2000);
    expect(screen.getByRole('heading', { name: 'Suggested columns' })).toBeTruthy();
    expect((screen.getByRole('checkbox', { name: /Collection.*Conflict/ }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText('Options: Draft, Final')).toBeTruthy();
    await fireEvent.click(screen.getByRole('checkbox', { name: /Review state/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'Add 1 column' }));
    expect(fields).toEqual([field, date]);
    expect(screen.queryByRole('heading', { name: 'Suggested columns' })).toBeNull();
  });

  it('samples at most three project resources matching exact or prefix MIME filters', async () => {
    const getDataset = api.get.getMockImplementation()!;
    api.get.mockImplementation(async (path, ...args) => {
      if (path === '/resources/project/12') return { data: [
        { id: 1 }, { id: 2, mimeType: 'text/html' }, { id: 3, mimeType: 'image/jpeg' },
        { id: 4, mimeType: 'application/pdf' }, { id: 5, mimeType: 'image/png' }, { id: 6, mimeType: 'image/gif' },
      ] };
      return getDataset(path, ...args);
    });
    api.post.mockResolvedValue({ data: {} });
    render(DatasetSchemaEditor, { props: {
      modelValue: [], sourceMode: 'project_resources', projectId: 12,
      sourceConfig: { resourceTypeFilter: ['image/', 'application/pdf'] },
    } });

    await fireEvent.click(suggestionsButton());
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/datasets/propose-columns', { resourceIds: [3, 4, 5], projectId: 12 }));
    expect((await screen.findByRole('button', { name: 'Suggest columns from sources' }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole('heading', { name: 'Suggested columns' })).toBeNull();
  });

  it('requires a selected source before requesting suggestions', () => {
    render(DatasetSchemaEditor, { props: { modelValue: [], sourceMode: 'resource_selection', sourceConfig: { resourceIds: [] } } });
    expect((suggestionsButton() as HTMLButtonElement).disabled).toBe(true);
    expect(api.post).not.toHaveBeenCalled();
  });
});
