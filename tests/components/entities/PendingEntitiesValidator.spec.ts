import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PendingEntitiesValidator from '@/components/entities/PendingEntitiesValidator.vue';
import type { PendingEntity } from '@/services/entities/usePendingEntities';

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/services/api', () => ({ default: api }));

const place = { id: 1, name: 'LOCATION' };
const person = { id: 2, name: 'PERSON' };
const base: PendingEntity = {
  id: 1, resourceId: 15, name: 'London', entityType: place, scope: 'document',
  aliases: null, translations: { es: 'Londres', fr: 'Londres (FR)' },
  contextSelection: { text: 'Letters from London', startOffset: 13 },
  status: 'pending', createdAt: '', updatedAt: '',
};
const institute: PendingEntity = { ...base, id: 2, name: 'Royal Archives', entityType: null, translations: null };
const author: PendingEntity = { ...base, id: 3, name: 'Jane Austin', entityType: person, isConfirmed: true, translations: null };
const match = { id: 64, name: 'London archives', entityType: place, description: 'Verified record' };
const button = (name: string) => screen.getByRole('button', { name });
const input = (name: string) => screen.getByLabelText(name) as HTMLInputElement;
const row = (name: string) => within(screen.getByText(name, { exact: true }).parentElement!.parentElement!);
const confirm = (name: string) => within(
  screen.getByRole('heading', { name }).parentElement!.parentElement!,
);
let entities: PendingEntity[];
let exactMatch: typeof match | null;

async function openValidator(props: { displayMode?: 'extracted' | 'translated'; resourceLanguage?: string; targetLanguage?: string } = {}) {
  const view = render(PendingEntitiesValidator, { props: { resourceId: '15', ...props } });
  await screen.findByText(institute.name);
  return view;
}

beforeEach(() => {
  vi.resetAllMocks();
  entities = [base, institute, author];
  exactMatch = null;
  api.get.mockImplementation(async (url: string) => {
    if (url === '/pending-entities/resource/15') return { data: structuredClone(entities) };
    if (url === '/entity-types') return { data: [place, person] };
    if (url === '/entities/search/exact') return { data: exactMatch };
    if (url.startsWith('/entities/by-resource/15')) {
      return { data: { document: [], project: [match], global: [] } };
    }
    if (url === '/entities/64') return { data: match };
    if (url === '/pending-entities/1') return { data: base };
    throw new Error(`Unexpected GET ${url}`);
  });
  api.post.mockResolvedValue({ data: { success: true } });
  api.put.mockResolvedValue({ data: {} });
  api.patch.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({ data: {} });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('resource entity validation', () => {
  it('shows confirmation progress and emits the original context when highlighting an entity', async () => {
    const view = await openValidator();
    expect(screen.getByText('1/3')).toBeTruthy();
    expect(row('London').getByText('LOCATION')).toBeTruthy();
    expect(row(author.name).getByTitle('Confirmed')).toBeTruthy();
    await fireEvent.click(row('London').getByTitle('Highlight'));
    expect(view.emitted()['entity:highlight']).toEqual([[expect.objectContaining({
      id: base.id, contextSelection: base.contextSelection,
    })]]);
  });

  it('shows and saves the translation for the selected display language', async () => {
    const view = await openValidator({ displayMode: 'translated', resourceLanguage: 'fr', targetLanguage: 'es' });
    await fireEvent.click(screen.getByText('Londres'));
    expect(input('ES').value).toBe('Londres');
    await fireEvent.update(input('ES'), 'Londres moderno');
    await waitFor(() => expect(api.put).toHaveBeenCalledExactlyOnceWith('/pending-entities/1', {
      translations: { es: 'Londres moderno', fr: 'Londres (FR)' },
    }), { timeout: 1800 });
    await view.rerender({ displayMode: 'extracted', resourceLanguage: 'fr' });
    expect(input('FR').value).toBe('Londres (FR)');
  });

  it('adds to the resource and clears an unfinished add form on cancel', async () => {
    await openValidator();
    await fireEvent.click(screen.getByTitle('Add entity'));
    expect((button('Add') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.update(input('New entity name'), 'Discarded');
    await fireEvent.click(button('Cancel'));
    await fireEvent.click(screen.getByTitle('Add entity'));
    expect(input('New entity name').value).toBe('');
    const created = { ...institute, id: 4, name: 'Dublin', entityType: place };
    api.post.mockResolvedValueOnce({ data: created });
    await fireEvent.update(input('New entity name'), created.name);
    await fireEvent.update(screen.getByLabelText('New entity type'), '1');
    await fireEvent.click(button('Add'));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/pending-entities', {
      resourceId: 15, name: 'Dublin', entityTypeId: 1, scope: 'document',
    });
    expect(await screen.findByText(created.name)).toBeTruthy();
  });

  it('coalesces metadata edits and restores the snapshot when canceled', async () => {
    await openValidator();
    await fireEvent.click(screen.getByText('London'));
    await fireEvent.update(input('Description'), 'First draft');
    await fireEvent.update(input('Description'), 'Source-index spelling');
    await fireEvent.update(screen.getByLabelText('Scope'), 'project');
    expect(api.put).not.toHaveBeenCalled();
    await waitFor(() => expect(api.put).toHaveBeenCalledExactlyOnceWith('/pending-entities/1', {
      name: 'London', description: 'Source-index spelling', entityTypeId: 1, scope: 'project', aliases: [],
    }), { timeout: 1800 });
    await fireEvent.click(button('Cancel'));
    expect(api.put).toHaveBeenLastCalledWith('/pending-entities/1', {
      name: 'London', description: undefined, entityTypeId: 1, scope: 'document', aliases: [],
    });
    expect(await screen.findByText('London')).toBeTruthy();
  });

  it('updates a confirmed entity through the library endpoint', async () => {
    await openValidator();
    await fireEvent.click(screen.getByText(author.name));
    await fireEvent.update(input('Description'), 'Letter author');
    await waitFor(() => expect(api.patch).toHaveBeenCalledExactlyOnceWith('/entities/3', {
      name: author.name, description: 'Letter author',
    }), { timeout: 1800 });
    expect(api.put).not.toHaveBeenCalled();
  });

  it('retranslates a renamed pending entity after checking for a library duplicate', async () => {
    await openValidator({ resourceLanguage: 'fr' });
    await fireEvent.click(screen.getByText(institute.name));
    api.post.mockImplementationOnce(async () => {
      entities = [base, { ...institute, name: 'National Archives', translations: { es: 'Archivo Nacional' } }, author];
      return { data: {} };
    });
    await fireEvent.update(input('Name (EN)'), 'National Archives');
    await waitFor(() => expect(api.post).toHaveBeenCalledExactlyOnceWith('/pending-entities/2/retranslate', {
      newName: 'National Archives', currentLanguage: 'en', resourceLanguage: 'fr', targetLanguage: 'es',
    }), { timeout: 1800 });
    expect(api.get).toHaveBeenCalledWith('/entities/search/exact', { params: { name: 'National Archives' } });
    expect(api.put).toHaveBeenCalledWith('/pending-entities/2', expect.objectContaining({ name: 'National Archives' }));
  });

  it.each([institute.name, match.name])('blocks a duplicate rename to %s and preserves the original name on cancel', async (name) => {
    await openValidator();
    exactMatch = name === match.name ? match : null;
    await fireEvent.click(screen.getByText('London'));
    await fireEvent.update(input('Name (EN)'), name);
    await screen.findByRole('heading', { name: 'Duplicate Entity Detected' }, { timeout: 1800 });
    expect(api.put).not.toHaveBeenCalled();
    await fireEvent.click(confirm('Duplicate Entity Detected').getByRole('button', { name: 'Cancel' }));
    expect(input('Name (EN)').value).toBe('London');
  });

  it('confirms a pending entity individually and confirms the remaining collection in bulk', async () => {
    const view = await openValidator();
    await fireEvent.click(row(base.name).getByTitle('Confirm entity'));
    expect(api.post).toHaveBeenCalledWith('/pending-entities/1/confirm');
    await waitFor(() => expect(screen.queryByText(base.name)).toBeNull());
    api.post.mockImplementationOnce(async () => {
      entities = [];
      return { data: { confirmed: 1, errors: [] } };
    });
    await fireEvent.click(button('Confirm All'));
    expect(api.post).toHaveBeenLastCalledWith('/pending-entities/resource/15/confirm');
    expect(await screen.findByText('No pending entities to validate')).toBeTruthy();
    expect((button('Confirm All') as HTMLButtonElement).disabled).toBe(true);
    expect(view.emitted()['entities:confirmed']).toHaveLength(2);
  });

  it.each([
    [institute.name, 'Delete', 'Delete Entity', 2],
    [author.name, 'Remove', 'Remove Entity', 3],
  ])('requires confirmation before removing %s from this resource', async (name, action, title, id) => {
    await openValidator();
    await fireEvent.click(row(name).getByTitle(action));
    await fireEvent.click(confirm(title).getByRole('button', { name: 'Cancel' }));
    expect(api.delete).not.toHaveBeenCalled();
    await fireEvent.click(row(name).getByTitle(action));
    await fireEvent.click(confirm(title).getByRole('button', { name: action }));
    expect(api.delete).toHaveBeenCalledExactlyOnceWith(`/pending-entities/${id}`);
    await waitFor(() => expect(screen.queryByText(name)).toBeNull());
  });

  it('merges into a confirmed entity with the selected alias scope and supports undo', async () => {
    await openValidator();
    await fireEvent.click(row(base.name).getByTitle('Merge'));
    const search = screen.getByLabelText('Target Entity');
    await fireEvent.update(search, 'London');
    expect(api.get).toHaveBeenCalledWith('/entities/by-resource/15?term=London');
    await fireEvent.click(await screen.findByText(match.name));
    await fireEvent.update(screen.getByLabelText('Alias Scope'), 'project');
    api.post.mockResolvedValueOnce({ data: {
      pending: { id: base.id, status: 'merged', mergedTargetType: 'confirmed', mergedTargetId: match.id },
    } });
    await fireEvent.click(confirm('Merge Entity as Alias').getByRole('button', { name: 'Merge' }));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/pending-entities/1/merge', {
      targetType: 'confirmed', targetId: match.id, aliasScope: 'project',
    });
    await fireEvent.click(await screen.findByTitle('Undo merge'));
    await fireEvent.click(button('Yes, Cancel Merge'));
    expect(api.post).toHaveBeenLastCalledWith('/pending-entities/1/cancel-merge');
    await waitFor(() => expect(row(base.name).queryByTitle('Undo merge')).toBeNull());
  });
});
