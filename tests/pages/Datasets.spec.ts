import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import Datasets from '@/pages/Datasets.vue';
import type { DatasetField } from '@/services/datasets/useDatasets';

const { api, notification } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  notification: { error: vi.fn(), success: vi.fn() },
}));
vi.mock('@/services/api', () => ({ default: api }));
vi.mock('@/composables/useNotification', () => ({ useNotification: () => notification }));

const census = {
  id: 9, name: 'Census', description: 'Population figures', project: { id: 4, name: 'Spain' },
  schema: [{ key: 'city', name: 'City', type: 'text', required: false } satisfies DatasetField], recordCount: 21,
};
const inventory = { id: 14, name: 'Inventory', schema: [] as DatasetField[], recordCount: 0 };

async function openDatasets(records = [census, inventory]) {
  api.get.mockImplementation(async (path) => {
    if (path === '/datasets') return { data: [...records] };
    throw new Error(`Unexpected GET ${path}`);
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/datasets', component: Datasets },
      { path: '/datasets/:id', component: { template: '<div>Dataset detail</div>' } },
    ],
  });
  await router.push('/datasets');
  render(Datasets, { global: { plugins: [router] } });
  return router;
}

const button = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
  vi.resetAllMocks();
});

describe('datasets catalog', () => {
  it('filters by description, restores the full list and opens the selected dataset', async () => {
    const router = await openDatasets();
    await screen.findByText('Census');
    expect(screen.getByText('Spain')).toBeTruthy();
    await fireEvent.update(screen.getByRole('textbox', { name: /search datasets/i }), '  FIGURES  ');
    expect(screen.queryByText('Inventory')).toBeNull();
    expect(screen.getByText('1 datasets')).toBeTruthy();

    await fireEvent.click(button('Clear search'));
    expect(screen.getByText('Inventory')).toBeTruthy();
    await fireEvent.click(screen.getByText('Census'));
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/datasets/9'));
  });

  it('creates a dataset with normalized schema keys and required select options', async () => {
    await openDatasets();
    await screen.findByText('Census');
    api.post.mockResolvedValue({ data: { id: 20, name: 'Cities', description: 'Places', schema: [] } });
    await fireEvent.click(button('New Dataset'));
    expect((button('Create') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.update(screen.getByLabelText('Name *'), '  Cities  ');
    await fireEvent.update(screen.getByLabelText('Description', { exact: true }), '  Places  ');
    await fireEvent.click(button('Add field'));
    await fireEvent.update(screen.getByRole('textbox', { name: 'Field name' }), 'Área / State');
    await fireEvent.update(screen.getByRole('combobox', { name: 'Field type' }), 'select');
    await fireEvent.update(screen.getByPlaceholderText('Option 1, Option 2, Option 3'), ' North, South, , ');
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Req.' }));
    await fireEvent.click(button('Create'));

    expect(await screen.findByText('Cities')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'New Dataset' })).toBeNull();
    expect(api.post).toHaveBeenCalledWith('/datasets', {
      name: 'Cities', description: 'Places',
      schema: [{ name: 'Área / State', key: 'area_state', type: 'select', required: true, options: ['North', 'South'] }],
    });
    expect(notification.success).toHaveBeenCalledWith('"Cities" created');
  });

  it('leaves the dataset in the list on cancel or failure, and removes it after confirmation succeeds', async () => {
    await openDatasets([census]);
    await screen.findByText('Census');
    const confirm = () => within(screen.getByRole('heading', { name: 'Delete Dataset' }).parentElement!.parentElement!)
      .getByRole('button', { name: 'Delete' });

    await fireEvent.click(button('Delete'));
    await fireEvent.click(button('Cancel'));
    expect(api.delete).not.toHaveBeenCalled();

    api.delete.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: {} });
    await fireEvent.click(button('Delete'));
    await fireEvent.click(confirm());
    await waitFor(() => expect(notification.error).toHaveBeenCalledWith('Failed to delete dataset'));
    expect(screen.getByText('Census')).toBeTruthy();

    await fireEvent.click(button('Delete'));
    await fireEvent.click(confirm());
    expect(await screen.findByText('No datasets yet')).toBeTruthy();
    expect(api.delete).toHaveBeenLastCalledWith('/datasets/9');
    expect(notification.success).toHaveBeenCalledWith('"Census" deleted');
  });

  it('retries provider discovery and configures an incremental sync from sample fields', async () => {
    await openDatasets([]);
    await screen.findByText('No datasets yet');
    const getDatasets = api.get.getMockImplementation()!;
    const provider = {
      type: 'statistics', displayName: 'City Statistics', description: 'Annual records', category: 'government',
      defaultIncrementalKey: 'date',
      configSchema: {
        required: ['series'],
        properties: {
          series: { title: 'Series', default: 'cities' },
          format: { title: 'Format', enum: ['csv', 'json'], default: 'csv' },
          includeArchived: { title: 'Include archived', type: 'boolean', default: false },
          limit: { title: 'Row limit', type: 'number', default: 10 },
        },
      },
      credentialsSchema: { properties: { token: { title: 'API token' } } },
    };
    let providerRequests = 0;
    api.get.mockImplementation(async (path) => {
      if (path === '/data-sources/providers') {
        if (++providerRequests === 1) throw new Error('Provider directory offline');
        return { data: [provider] };
      }
      return getDatasets(path);
    });
    api.post
      .mockRejectedValueOnce({ response: { data: { message: 'Temporary connection error' } } })
      .mockResolvedValueOnce({ data: {
        success: true, message: 'Connected', sampleData: [{ date: '2026-01-01', sequence: 7 }],
      } })
      .mockResolvedValueOnce({ data: { id: 5 } })
      .mockResolvedValueOnce({ data: { executionId: 'sync-5' } });

    await fireEvent.click(button('Sync Provider'));
    await waitFor(() => expect(notification.error).toHaveBeenCalledWith('Failed to load providers'));
    await fireEvent.click(button('Sync Provider'));
    await fireEvent.click(await screen.findByRole('button', { name: /City Statistics/ }));
    const token = screen.getByLabelText('API token', { exact: true });
    expect(token.getAttribute('type')).toBe('password');
    await fireEvent.update(token, 'test-token');
    await fireEvent.update(screen.getByRole('combobox', { name: 'Format' }), 'json');
    await fireEvent.update(screen.getByRole('spinbutton', { name: 'Row limit' }), '25');
    await fireEvent.click(button('Test Connection'));
    expect(await screen.findByText('Temporary connection error')).toBeTruthy();
    await fireEvent.click(button('Test Connection'));
    expect(await screen.findByText('Connected')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'sequence' })).toBeTruthy();

    await fireEvent.click(button('Next'));
    await fireEvent.click(screen.getByRole('button', { name: /^Incremental/ }));
    await fireEvent.update(screen.getByLabelText('Incremental key field'), 'sequence');
    await fireEvent.click(button('Custom'));
    await fireEvent.update(screen.getByLabelText('Cron expression'), '15 4 * * 1');
    await fireEvent.click(button('Create & Sync'));
    await waitFor(() => expect(notification.success).toHaveBeenCalledWith('Dataset imported from provider'));

    const config = { series: 'cities', format: 'json', includeArchived: false, limit: 25 };
    expect(api.post.mock.calls).toEqual([
      ['/data-sources/test', { providerType: 'statistics', config, credentials: { token: 'test-token' } }],
      ['/data-sources/test', { providerType: 'statistics', config, credentials: { token: 'test-token' } }],
      ['/data-sources', {
        name: 'City Statistics data', providerType: 'statistics', config, credentials: { token: 'test-token' },
        syncSchedule: '15 4 * * 1', syncStrategy: 'incremental', incrementalKey: 'sequence', projectId: undefined,
      }],
      ['/data-sources/5/sync'],
    ]);
  });

  it('imports a CSV with quoted cells and inferred types, shows row errors and opens the imported dataset', async () => {
    const router = await openDatasets([]);
    await screen.findByText('No datasets yet');
    const imported = { id: 22, name: 'Edited sample', schema: [] as DatasetField[], recordCount: 2 };
    api.post.mockResolvedValue({ data: {
      dataset: imported, imported: 2, errors: [{ row: 4, messages: ['Missing date'] }],
    } });

    await fireEvent.click(button('Import File'));
    expect((button('Continue') as HTMLButtonElement).disabled).toBe(true);
    const input = screen.getByLabelText('Choose CSV file');
    const file = new File([
      'Región,Count,Active,Date,Missing\n"Madrid, ES",4,true,2026-08-15,\n"City ""A""",2,false,2026-08-16,',
    ], 'sample.csv', { type: 'text/csv' });
    await fireEvent.change(input, { target: { files: [file] } });
    await fireEvent.click(button('Continue'));

    expect((await screen.findByLabelText('Dataset name') as HTMLInputElement).value).toBe('sample');
    for (const text of ['region', 'number', 'boolean', 'date', 'Madrid, ES', 'City "A"']) {
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    }
    await fireEvent.update(screen.getByLabelText('Dataset name'), ' Edited sample ');
    await fireEvent.click(button('Create Dataset'));
    expect(await screen.findByText(/created with 2 records/)).toBeTruthy();
    expect(screen.getByText('Row 4: Missing date')).toBeTruthy();
    expect(screen.getByText('Edited sample')).toBeTruthy();

    const [path, form] = api.post.mock.lastCall!;
    expect(path).toBe('/datasets/import');
    expect(form.get('name')).toBe('Edited sample');
    expect(form.get('file').name).toBe('sample.csv');

    await fireEvent.click(button('Open Dataset'));
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/datasets/22'));
  });
});
