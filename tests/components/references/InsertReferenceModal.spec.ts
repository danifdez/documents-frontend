import { fireEvent, render, screen } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InsertReferenceModal from '@/components/references/InsertReferenceModal.vue';
import type { BibliographyEntry } from '@/types/Bibliography';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/services/api', () => ({ default: { get } }));

const authors = [
  { creatorType: 'author', firstName: 'Sofia', lastName: 'Moreno' },
  { creatorType: 'author', name: 'City Archives' },
];
const local = { id: 7, title: 'Guide to registries', citeKey: 'catalogue', year: '2025', entryType: 'book', creators: authors } as BibliographyEntry;
const second = { ...local, id: 8, title: 'Supplement', citeKey: 'appendix', year: '2026' };
const lookup = () => screen.getByRole('textbox', { name: 'Search references' });
const tab = (name: string) => screen.getByRole('button', { name });

function open(context = 'document') {
  const select = vi.fn();
  const changed = vi.fn();
  const view = render(InsertReferenceModal, { props: {
    modelValue: true, context, entries: [local, second], citationStyle: 'ieee',
    existingRefIds: ['6', '7'], onSelect: select, 'onUpdate:modelValue': changed,
  } });
  return { view, select, changed };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  get.mockResolvedValue({ data: [] });
});
afterEach(() => vi.useRealTimers());

describe('searching and inserting references', () => {
  it('merges local and API bibliography without duplicating IDs and preserves the citation number', async () => {
    get.mockResolvedValueOnce({ data: [
      { id: '7', type: 'bibliography', name: local.title, meta: { creators: authors, year: '2025', journal: 'Archive bulletin' } },
    ] });
    const { select, changed } = open();
    await fireEvent.update(lookup(), 'M');
    expect(screen.getByText('Type at least 2 characters.')).toBeTruthy();
    await vi.advanceTimersByTimeAsync(400);
    expect(get).not.toHaveBeenCalled();
    await fireEvent.update(lookup(), 'Moreno');
    expect(screen.getByText(local.title)).toBeTruthy();
    expect(screen.getByText(second.title)).toBeTruthy();
    await vi.advanceTimersByTimeAsync(400);
    expect(get).toHaveBeenCalledExactlyOnceWith('/reference/search', { params: { q: 'Moreno' } });
    expect(screen.getAllByText(local.title)).toHaveLength(1);
    expect(screen.getByText(/Moreno, Sofia & City Archives.*Archive bulletin/)).toBeTruthy();
    await fireEvent.click(screen.getByText(local.title));
    expect(select).toHaveBeenCalledExactlyOnceWith({ refId: '7', refType: 'bibliography', label: '[2]', displayMode: 'citation' });
    expect(changed).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('filters scoped references and uses a quoted annotation as the label for a mark', async () => {
    get.mockImplementation(async (_route, { params }) => ({ data: params.type === 'mark' ? [
      { id: '91', type: 'mark', name: 'Review mark', content: 'The ledger has six entries.' },
      { id: '7', type: 'doc', name: 'Report from the archive' },
    ] : [] }));
    const { select } = open('knowledge');
    expect(screen.queryByRole('button', { name: 'Documents' })).toBeNull();
    await fireEvent.update(lookup(), 'ledger');
    await vi.advanceTimersByTimeAsync(400);
    expect(screen.getByText('No results found.')).toBeTruthy();
    await fireEvent.click(tab('Marks'));
    await vi.advanceTimersByTimeAsync(0);
    expect(get).toHaveBeenLastCalledWith('/reference/search', { params: { q: 'ledger', type: 'mark' } });
    expect(screen.queryByText('Report from the archive')).toBeNull();
    await fireEvent.click(screen.getByText('The ledger has six entries.'));
    expect(select).toHaveBeenCalledExactlyOnceWith({
      refId: '91', refType: 'mark', label: 'The ledger has six entries.', displayMode: 'quote-citation',
    });
  });

  it('recovers from a remote search error and formats a new citation from search metadata', async () => {
    get.mockRejectedValueOnce(new Error('Search unavailable')).mockResolvedValueOnce({ data: [
      { id: '20', type: 'bibliography', name: 'Catalogue of maps', meta: { creators: [{ creatorType: 'author', lastName: 'Cheng' }], year: '2024' } },
    ] });
    const { select } = open();
    await fireEvent.update(lookup(), 'maps');
    await vi.advanceTimersByTimeAsync(400);
    expect(screen.getByText('No results found.')).toBeTruthy();
    await fireEvent.click(tab('Bibliography'));
    await vi.advanceTimersByTimeAsync(0);
    await fireEvent.click(screen.getByText('Catalogue of maps'));
    expect(select).toHaveBeenCalledExactlyOnceWith({
      refId: '20', refType: 'bibliography', label: '[3]', displayMode: 'citation',
    });
  });
});
