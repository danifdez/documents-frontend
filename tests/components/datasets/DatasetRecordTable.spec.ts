import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import DatasetRecordTable from '@/components/datasets/DatasetRecordTable.vue';
import type { CellAnchor, DatasetField, DatasetRecord } from '@/services/datasets/useDatasets';

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@/services/api', () => ({ default: api }));

const schema: DatasetField[] = [
  { key: 'title', name: 'Title', type: 'text', required: true },
  { key: 'count', name: 'Count', type: 'number', required: false },
  { key: 'reviewed', name: 'Reviewed', type: 'boolean', required: false },
  { key: 'kind', name: 'Kind', type: 'select', required: false, options: ['Manuscript', 'Map'] },
  { key: 'received', name: 'Received', type: 'date', required: false },
  { key: 'accession', name: 'Accession', type: 'text', required: false, linkedDatasetId: 19, linkedLookupField: 'code', linkedDisplayField: 'category' },
];
const anchor: CellAnchor = {
  sourceResourceId: 30, page: 4, quote: 'The register lists five items.', extractedAt: '2026-01-12T09:00:00Z',
  model: 'fixture-model', promptVersion: '1', editedByUser: true,
};
const makeRecord = (overrides: Partial<DatasetRecord>): DatasetRecord => ({
  id: 1, data: {}, cellMetadata: {}, extractionStatus: 'pending', extractionError: null,
  sourceResourceId: null, createdAt: '', updatedAt: '', ...overrides,
});
const records = [
  makeRecord({ id: 1, data: { title: 'Inventory', count: 5, reviewed: false, kind: 'Manuscript', received: '2026-01-13', accession: 'A-7' },
    sourceResourceId: 30, cellMetadata: { count: anchor }, extractionStatus: 'extracted' }),
  makeRecord({ id: 2, data: { title: 'Survey', count: 8, reviewed: true, accession: 'A-7' }, extractionStatus: 'in_progress' }),
  makeRecord({ id: 3, data: { title: 'Map', reviewed: null, accession: 'absent' }, extractionStatus: 'failed',
    extractionError: 'Unreadable file', sourceResourceId: 32 }),
  makeRecord({ id: 4, data: { title: 'New record', reviewed: null } }),
];
let view: VueWrapper<InstanceType<typeof DatasetRecordTable>> | undefined;
const button = (name: string) => screen.getByRole('button', { name });

async function openTable() {
  const page = { template: '<main />' };
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/', component: page }, { path: '/resource/:id', component: page },
  ] });
  await router.push('/');
  view = mount(DatasetRecordTable, {
    props: { schema, records: structuredClone(records), limit: 4, page: 2, total: 8, showStatusColumn: true, sortField: 'count', sortOrder: 'desc' },
    global: { plugins: [router] }, attachTo: document.body,
  });
  return view;
}

beforeEach(() => {
  vi.resetAllMocks();
  api.post.mockResolvedValue({ data: { 'A-7': { category: 'Manuscript collection', code: 'A-7', details: null } } });
  api.get.mockImplementation(async (path) => {
    if (path === '/datasets/19') return { data: { id: 19, name: 'Accessions', schema: [{ key: 'category', name: 'Category', type: 'text' }] } };
    if (path === '/resources/30') return { data: { id: 30, name: '2026 Register' } };
    if (path === '/resources/30/content') return { data: {} };
    throw new Error(`Unexpected GET ${path}`);
  });
});

afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.restoreAllMocks();
});

describe('dataset record table', () => {
  it('displays extraction outcomes, summarizes the page, and requests sorting and pagination', async () => {
    const table = await openTable();
    expect(screen.getByTitle('Extracted')).toBeTruthy();
    expect(screen.getByTitle('Extracting...')).toBeTruthy();
    expect(screen.getAllByTitle('Unreadable file').length).toBeGreaterThan(0);
    expect(screen.getByTitle('Pending extraction')).toBeTruthy();
    expect(screen.getByText('Showing 4 of 8 records')).toBeTruthy();
    const summary = screen.getByText('Sum:').closest('td')!;
    expect(summary.textContent).toContain('13');
    expect(summary.textContent).toContain('6.5');
    await fireEvent.click(screen.getByRole('columnheader', { name: /Count.*↓/ }));
    expect(table.emitted('sort')).toEqual([['count']]);
    await fireEvent.click(button('Prev'));
    await fireEvent.click(button('Next'));
    expect(table.emitted('page')).toEqual([[1], [3]]);

    const all = screen.getByRole('checkbox', { name: 'Select all records' }) as HTMLInputElement;
    await fireEvent.click(all);
    expect(table.vm.selectedIds.size).toBe(4);
    await fireEvent.click(all);
    expect(table.vm.selectedIds.size).toBe(0);
    const first = screen.getByRole('checkbox', { name: 'Select record 1' });
    await fireEvent.click(first);
    expect([...table.vm.selectedIds]).toEqual([1]);
    await table.setProps({ records: [], page: 1 });
    expect(table.vm.selectedIds.size).toBe(0);
    expect(screen.getByText('No records yet')).toBeTruthy();
    expect((button('Prev') as HTMLButtonElement).disabled).toBe(true);
    expect((button('Next') as HTMLButtonElement).disabled).toBe(true);
  });

  it('groups inline changes by record, preserves untouched values and can discard pending edits', async () => {
    const table = await openTable();
    const row = screen.getByRole('checkbox', { name: 'Select record 1' }).closest('tr')!;
    const cells = within(row);
    await fireEvent.dblClick(cells.getByRole('cell', { name: 'Inventory' }));
    const title = cells.getByRole('textbox', { name: 'Edit Title for record 1' });
    await fireEvent.blur(title);
    expect(table.vm.hasChanges).toBe(false);
    await fireEvent.dblClick(cells.getByText('5'));
    await fireEvent.update(cells.getByRole('spinbutton', { name: 'Edit Count for record 1' }), '12');
    await fireEvent.dblClick(cells.getByText('No'));
    const reviewed = cells.getByRole('combobox', { name: 'Edit Reviewed for record 1' }) as HTMLSelectElement;
    reviewed.value = 'true';
    await fireEvent.input(reviewed);
    await fireEvent.dblClick(cells.getByText('Manuscript'));
    const kind = cells.getByRole('combobox', { name: 'Edit Kind for record 1' }) as HTMLSelectElement;
    kind.value = 'Map';
    await fireEvent.input(kind);
    expect(table.vm.hasChanges).toBe(true);

    table.vm.applyEdits();
    expect(table.emitted('inlineUpdate')).toEqual([[1, { ...records[0].data, count: '12', reviewed: true, kind: 'Map' }]]);
    expect(table.vm.hasChanges).toBe(false);
    await fireEvent.dblClick(cells.getByText('2026-01-13'));
    expect((cells.getByLabelText('Edit Received for record 1') as HTMLInputElement).type).toBe('date');
    table.vm.cancelEdits();
    expect(table.vm.hasChanges).toBe(false);
    expect(table.emitted('inlineUpdate')).toHaveLength(1);
  });

  it('resolves distinct linked values together and opens the source record using its display schema', async () => {
    await openTable();
    const linked = await screen.findAllByRole('button', { name: 'Manuscript collection' });
    expect(linked).toHaveLength(2);
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/datasets/19/resolve-links', { values: ['A-7', 'absent'], lookupField: 'code' });
    await fireEvent.dblClick(linked[0]);
    expect(screen.queryByLabelText('Edit Accession for record 1')).toBeNull();
    await fireEvent.click(linked[0]);
    const heading = await screen.findByRole('heading', { name: 'Accessions — Record #A-7' });
    const popup = within(heading.closest('.max-w-lg')!);
    expect(popup.getByRole('rowheader', { name: 'Category' })).toBeTruthy();
    expect(popup.getByRole('cell', { name: 'Manuscript collection' })).toBeTruthy();
    await fireEvent.click(button('Close cell details'));
    expect(screen.queryByRole('heading', { name: /Record #A-7/ })).toBeNull();
  });

  it('shows the saved extraction quote and emits re-extraction for the selected cell and row', async () => {
    const table = await openTable();
    await fireEvent.click(screen.getByTitle('Show extraction source'));
    expect(await screen.findByText(/The register lists five items/)).toBeTruthy();
    expect(screen.getByText(/fixture-model/)).toBeTruthy();
    await fireEvent.click(button('Re-extract this cell'));
    expect(table.emitted('reExtractCell')).toEqual([[1, 'count']]);
    expect(screen.queryByText(/The register lists five items/)).toBeNull();

    await fireEvent.click(within(screen.getByRole('checkbox', { name: 'Select record 3' }).closest('tr')!).getByTitle('Re-extract this row'));
    await waitFor(() => expect(table.emitted('reExtractRow')).toEqual([[3]]));
  });
});
