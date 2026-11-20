import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { reactive } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EntitiesList from '@/components/entities/EntitiesList.vue';
import type { ResourceListEntity } from '@/services/resources/useResourceDetails';

const { api, toast } = vi.hoisted(() => ({
  api: { get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/services/api', () => ({ default: api }));
vi.mock('@/composables/useNotification', () => ({ useNotification: () => toast }));

const london: ResourceListEntity = {
  id: 2, name: 'London', translations: { es: 'Londres', fr: 'Londres français' },
  entityType: { id: 22, name: 'LOCATION' }, aliases: [{ locale: 'en', value: 'Londinium' }],
};
const author: ResourceListEntity = { id: 3, name: 'Grace Parker', type: 'PERSON', description: 'Letter author' };
const target = { id: 8, name: 'Greater London', type: 'LOCATION' };
const row = (name: string) => within(screen.getByTitle(`Click to highlight ${name} in the document`).parentElement!);
const button = (name: string) => screen.getByRole('button', { name });
const dialog = (name: string) => within(screen.getByRole('heading', { name }).parentElement!.parentElement!);

function openList(entities = [london, author]) {
  return render(EntitiesList, { props: { resourceId: '17', entities: reactive(structuredClone(entities)) } });
}

beforeEach(() => {
  vi.resetAllMocks();
  api.patch.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({ data: {} });
  api.post.mockResolvedValue({ data: target });
  api.get.mockResolvedValue({ data: [london, target] });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('confirmed entities for a resource', () => {
  it('filters across aliases, translations and types and emits the underlying entity for highlighting', async () => {
    const view = openList();
    const search = screen.getByRole('textbox', { name: 'Search entities' });
    for (const query of ['londinium', '  LONDRES  ', 'location', 'London']) {
      await fireEvent.update(search, query);
      expect(screen.getByText(london.name)).toBeTruthy();
      expect(screen.queryByText(author.name)).toBeNull();
    }
    await view.rerender({ displayMode: 'translated', targetLanguage: 'es' });
    const entry = screen.getByTitle('Click to highlight Londres in the document');
    await fireEvent.click(entry);
    expect(view.emitted()['entity:highlight']).toEqual([[london]]);
    await view.rerender({ displayMode: 'extracted', resourceLanguage: 'fr' });
    expect(screen.getByText('Londres français')).toBeTruthy();
    await fireEvent.update(search, 'unknown');
    expect(screen.getByText('No entities match your search')).toBeTruthy();
    await view.rerender({ entities: [] });
    expect(screen.getByText('No entities found')).toBeTruthy();
  });

  it('restores canceled edits and saves name or description changes through the entity endpoint', async () => {
    openList();
    await fireEvent.click(row(author.name).getByTitle('Edit'));
    await fireEvent.update(screen.getByLabelText('Name'), 'Draft name');
    await fireEvent.click(button('Cancel'));
    expect(screen.getByText(author.name)).toBeTruthy();
    expect(api.patch).not.toHaveBeenCalled();

    await fireEvent.click(row(author.name).getByTitle('Edit'));
    await fireEvent.update(screen.getByLabelText('Name'), 'Grace M. Parker');
    await fireEvent.update(screen.getByLabelText('Description'), '  ');
    await fireEvent.click(button('Done'));
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/entities/3', { name: 'Grace M. Parker' });
    expect(await screen.findByText('Grace M. Parker')).toBeTruthy();
    expect(toast.success).toHaveBeenCalledWith('Entity updated successfully');
  });

  it('removes a resource association only after confirmation and reports a rejected request', async () => {
    const view = openList();
    const action = row(author.name).getByTitle('Remove');
    await fireEvent.click(action);
    await fireEvent.click(dialog('Remove Entity').getByRole('button', { name: 'Cancel' }));
    expect(api.delete).not.toHaveBeenCalled();
    api.delete.mockRejectedValueOnce(new Error('Association unavailable'));
    await fireEvent.click(action);
    await fireEvent.click(dialog('Remove Entity').getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to remove entity from resource'));
    expect(view.emitted()['entity:removed']).toBeUndefined();

    await fireEvent.click(action);
    await fireEvent.click(dialog('Remove Entity').getByRole('button', { name: 'Remove' }));
    expect(api.delete).toHaveBeenLastCalledWith('/resources/17/entities/3');
    await waitFor(() => expect(view.emitted()['entity:removed']).toEqual([[3]]));
  });

  it('debounces target lookup, excludes the source from results and emits the merged record', async () => {
    const view = openList();
    await fireEvent.click(row(london.name).getByTitle('Merge'));
    const search = screen.getByLabelText('Search target entity');
    const mergeForm = within(search.closest('div')!.parentElement!);
    expect((mergeForm.getByRole('button', { name: 'Merge' }) as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.update(search, 'Great');
    await fireEvent.update(search, 'Greater London');
    expect(api.get).not.toHaveBeenCalled();
    await fireEvent.click(await mergeForm.findByRole('button', { name: /Greater London/ }));
    expect(api.get).toHaveBeenCalledExactlyOnceWith('/entities/search?q=Greater%20London');
    expect(mergeForm.queryByRole('button', { name: /^London/ })).toBeNull();
    await fireEvent.click(mergeForm.getByRole('button', { name: 'Merge' }));
    await fireEvent.click(dialog('Merge Entity').getByRole('button', { name: 'Cancel' }));
    expect(api.post).not.toHaveBeenCalled();
    await fireEvent.click(mergeForm.getByRole('button', { name: 'Merge' }));
    await fireEvent.click(dialog('Merge Entity').getByRole('button', { name: 'Merge' }));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/entities/2/merge/8');
    await waitFor(() => expect(view.emitted()['entity:merged']).toEqual([[2, target]]));
    expect(toast.success).toHaveBeenCalledWith('Entity "London" merged into "Greater London"');
  });
});
