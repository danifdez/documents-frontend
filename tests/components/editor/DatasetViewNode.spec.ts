import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DatasetViewNode from '@/components/editor/DatasetViewNode.vue';
import type { DatasetField, DatasetRecord } from '@/services/datasets/useDatasets';

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('@/services/api', () => ({ default: api }));

const schema: DatasetField[] = [
  { key: 'title', name: 'Title', type: 'text', required: true },
  { key: 'pages', name: 'Pages', type: 'number', required: false },
  { key: 'indexed', name: 'Indexed', type: 'boolean', required: false },
  { key: 'section', name: 'Section', type: 'select', options: ['Maps', 'Letters'], required: false },
  { key: 'acquired', name: 'Date acquired', type: 'date', required: false },
  { key: 'updated', name: 'Last update', type: 'datetime', required: false },
  { key: 'storedAt', name: 'Time stored', type: 'time', required: false },
];
const source: DatasetRecord = {
  id: 31, data: {
    title: 'Shipping register', pages: 170, indexed: true, section: 'Maps',
    acquired: '2025-01-02', updated: '2025-01-02T09:15', storedAt: '09:15', donor: null,
  },
  cellMetadata: {}, sourceResourceId: null, extractionStatus: 'extracted', extractionError: null,
  createdAt: '', updatedAt: '',
};
const other: DatasetRecord = { ...source, id: 32, data: { title: 'Loan ledger', pages: 32, indexed: false } };
const endpoint = '/datasets/6/records';
const props = {
  datasetId: 6, datasetName: 'Inventories', fields: JSON.stringify([...schema.map(({ key }) => key), 'donor']),
  filters: JSON.stringify([]), editable: true,
};
const button = (name: string) => screen.getByRole('button', { name });
const cell = (name: string | RegExp) => screen.getByRole('cell', { name });
let records: DatasetRecord[];

beforeEach(() => {
  vi.resetAllMocks();
  records = [structuredClone(source), structuredClone(other)];
  api.get.mockImplementation(async (url: string) => {
    if (url === '/datasets/6') return { data: { schema } };
    if (url === endpoint) return { data: { records, total: records.length } };
    throw new Error(`Unexpected GET ${url}`);
  });
  api.patch.mockImplementation(async (url: string, payload: { data: DatasetRecord['data'] }) => {
    const id = Number(url.split('/').at(-1));
    records = records.map((record) => record.id === id ? { ...record, data: payload.data } : record);
    return { data: records.find((record) => record.id === id) };
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function openView(overrides: Partial<typeof props> = {}) {
  render(DatasetViewNode, { props: { ...props, ...overrides } });
  await screen.findByRole('table');
}

describe('embedded dataset view', () => {
  it('renders only the selected fields with schema titles, boolean values and empty placeholders', async () => {
    await openView({ editable: false, fields: JSON.stringify(['title', 'indexed', 'donor']) });
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent?.trim())).toEqual(['Title', 'Indexed', 'donor']);
    expect(cell('Yes')).toBeTruthy();
    expect(cell('No')).toBeTruthy();
    expect(screen.getAllByRole('cell', { name: '—' })).toHaveLength(2);
    expect(screen.queryByTitle('Toggle edit mode')).toBeNull();
    await fireEvent.dblClick(cell('Shipping register'));
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('restores saved filters, adds a numeric comparison and clears the filtered query', async () => {
    await openView({ filters: JSON.stringify([{ field: 'title', operator: 'contains', value: 'register' }]) });
    expect(api.get).toHaveBeenCalledWith(endpoint, { params: { limit: 100, 'filter[title_contains]': 'register' } });
    expect(screen.getByText('title ~ register')).toBeTruthy();
    await fireEvent.click(screen.getByTitle('Toggle filters'));
    expect(within(screen.getByLabelText('Filter operator')).queryByRole('option', { name: '>' })).toBeNull();
    await fireEvent.click(button('Add filter'));
    const fields = screen.getAllByLabelText('Filter field');
    await fireEvent.update(fields[1], 'pages');
    await fireEvent.update(screen.getAllByLabelText('Filter operator')[1], 'gt');
    await fireEvent.update(screen.getAllByLabelText('Filter value')[1], '150');
    await fireEvent.click(button('Apply'));
    expect(api.get).toHaveBeenLastCalledWith(endpoint, {
      params: { limit: 100, 'filter[title_contains]': 'register', 'filter[pages_gt]': '150' },
    });
    await fireEvent.click(button('Clear all'));
    expect(api.get).toHaveBeenLastCalledWith(endpoint, { params: { limit: 100 } });
  });

  it('opens editors for supported types and persists related changes grouped by record', async () => {
    await openView();
    await fireEvent.click(screen.getByTitle('Toggle edit mode'));
    const updates = [
      ['Shipping register', 'title', 'Updated register', 'text'],
      ['170', 'pages', '175', 'number'],
      ['Yes', 'indexed', 'false', 'select-one'],
      ['Maps', 'section', 'Letters', 'select-one'],
      ['2025-01-02', 'acquired', '2025-01-03', 'date'],
      ['2025-01-02T09:15', 'updated', '2025-01-03T10:00', 'datetime-local'],
      ['09:15', 'storedAt', '10:00', 'time'],
    ];
    for (const [old, key, value, type] of updates) {
      await fireEvent.dblClick(cell(old));
      const input = screen.getByLabelText(`Edit ${key} for record 31`) as HTMLInputElement;
      expect(input.type).toBe(type);
      await fireEvent.input(input, { target: { value } });
    }
    await fireEvent.dblClick(cell('Loan ledger'));
    await fireEvent.update(screen.getByLabelText('Edit title for record 32'), 'Ledger index');
    expect(screen.getByText('8 unsaved changes')).toBeTruthy();
    await fireEvent.click(button('Save changes'));
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(2));
    expect(api.patch).toHaveBeenCalledWith(endpoint + '/31', { data: {
      title: 'Updated register', pages: '175', indexed: false, section: 'Letters',
      acquired: '2025-01-03', updated: '2025-01-03T10:00', storedAt: '10:00', donor: null,
    } });
    expect(api.patch).toHaveBeenCalledWith(endpoint + '/32', { data: { title: 'Ledger index', indexed: false, pages: 32 } });
    expect(await screen.findByRole('cell', { name: 'Updated register' })).toBeTruthy();
  });

  it('discards unchanged and canceled cells without submitting changes', async () => {
    await openView();
    const toggle = screen.getByTitle('Toggle edit mode');
    await fireEvent.click(toggle);
    await fireEvent.dblClick(cell('Shipping register'));
    await fireEvent.blur(screen.getByLabelText('Edit title for record 31'));
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
    await fireEvent.dblClick(cell('170'));
    const pages = screen.getByLabelText('Edit pages for record 31');
    await fireEvent.update(pages, '500');
    await fireEvent.keyDown(pages, { key: 'Escape' });
    expect(cell('170')).toBeTruthy();

    await fireEvent.dblClick(cell('Shipping register'));
    await fireEvent.update(screen.getByLabelText('Edit title for record 31'), 'Discarded');
    await fireEvent.click(toggle);
    expect(cell('Shipping register')).toBeTruthy();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('loads a legacy record array and ignores an invalid encoded filter', async () => {
    api.get.mockImplementation(async (url: string) => ({ data: url === endpoint ? [source] : { schema } }));
    await openView({ filters: '{legacy', fields: '["title"]' });
    expect(cell('Shipping register')).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith(endpoint, { params: { limit: 100 } });
    expect(screen.getByText('1 of 1 records')).toBeTruthy();
  });

  it('shows load errors and can refresh into an empty result', async () => {
    api.get.mockRejectedValueOnce(new Error('Schema unavailable')).mockRejectedValueOnce({ response: { data: { message: 'Dataset unavailable' } } });
    render(DatasetViewNode, { props });
    expect(await screen.findByText('Dataset unavailable')).toBeTruthy();
    records = [];
    await fireEvent.click(screen.getByTitle('Refresh'));
    expect(await screen.findByText('No records found')).toBeTruthy();
  });
});
