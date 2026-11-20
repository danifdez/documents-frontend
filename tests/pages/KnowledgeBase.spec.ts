import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import KnowledgeBase from '@/pages/KnowledgeBase.vue';
import KnowledgeEntryEdit from '@/pages/KnowledgeEntryEdit.vue';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/services/api', () => ({ default: api }));

const entry = {
  id: 4, title: 'Collections', content: '<p>Research notes</p>', summary: 'Acquisition policy',
  tags: ['archive'], isDefinition: false, updatedAt: '2026-01-15',
};
const other = { ...entry, id: 5, title: 'Reading rooms', summary: 'Access requirements', tags: [] as string[], isDefinition: true };
const entityType = { id: 9, name: 'Institution' };
const institution = { id: 27, name: 'Archive & Library', entityType };
const button = (name: string) => screen.getByRole('button', { name });
const titleInput = () => screen.getByRole('textbox', { name: 'Entry title' }) as HTMLInputElement;

async function openKnowledge(path = '/knowledge-base') {
  const entries = [entry, other];
  api.get.mockImplementation(async (url) => {
    if (url === '/knowledge-entries') return { data: entries.map((item) => structuredClone(item)) };
    if (url === '/knowledge-entries/4') return { data: structuredClone(entry) };
    if (url === '/knowledge-entries/5') return { data: structuredClone(other) };
    if (url === '/knowledge-entries/6') return { data: { ...entry, id: 6, title: 'Nueva entrada' } };
    if (url === '/entity-types') return { data: [entityType] };
    if (url === '/bibliography/global') return { data: [] };
    if (url === '/entities/search?q=Archive%20%26%20Library') return { data: [institution] };
    throw new Error(`Unexpected GET ${url}`);
  });

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/knowledge-base', component: KnowledgeBase },
      { path: '/knowledge-base/:id', component: KnowledgeEntryEdit },
    ],
  });
  await router.push(path);
  render(RouterView, { global: { plugins: [router, createPinia()] } });
  return { router, entries };
}

beforeEach(() => {
  vi.resetAllMocks();
  api.patch.mockResolvedValue({ data: {} });
});

describe('knowledge base', () => {
  it('searches by summary and opens the matching entry from the list', async () => {
    const { router } = await openKnowledge();
    expect(await screen.findByRole('heading', { name: 'Collections' })).toBeTruthy();
    expect(screen.getByText('archive')).toBeTruthy();
    const search = screen.getByRole('textbox', { name: 'Buscar entradas...' });
    await fireEvent.update(search, ' access REQUIREMENTS ');
    expect(screen.queryByRole('heading', { name: 'Collections' })).toBeNull();
    expect(screen.getByText('1 entradas')).toBeTruthy();
    await fireEvent.click(screen.getByRole('heading', { name: 'Reading rooms' }));
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/knowledge-base/5'));
    await waitFor(() => expect(titleInput().value).toBe('Reading rooms'));
  });

  it('opens the newly created entry by the id returned by the backend', async () => {
    const { router } = await openKnowledge();
    await screen.findByRole('heading', { name: 'Collections' });
    api.post.mockResolvedValue({ data: { id: 6 } });
    await fireEvent.click(button('Nueva entrada'));
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/knowledge-base/6'));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/knowledge-entries', { title: 'Nueva entrada' });
    await waitFor(() => expect(titleInput().value).toBe('Nueva entrada'));
  });

  it('persists edited metadata and manages tags without adding duplicates', async () => {
    await openKnowledge('/knowledge-base/4');
    await waitFor(() => expect(titleInput().value).toBe(entry.title));
    api.patch.mockClear();
    const savedTags: string[][] = [];
    api.patch.mockImplementation(async (_url, payload: { tags?: string[] }) => {
      if (payload.tags) savedTags.push([...payload.tags]);
      return { data: {} };
    });
    const title = await screen.findByRole('textbox', { name: 'Entry title' });
    await fireEvent.update(title, 'Collections policy');
    await fireEvent.blur(title);
    const summary = screen.getByRole('textbox', { name: 'Entry summary' });
    await fireEvent.update(summary, 'Welcoming donations');
    await fireEvent.keyDown(summary, { key: 'Enter' });
    const definition = screen.getByRole('switch', { name: 'Definition' });
    await fireEvent.click(definition);
    expect(definition.getAttribute('aria-checked')).toBe('true');

    await fireEvent.click(button('Etiqueta'));
    await fireEvent.update(screen.getByRole('textbox', { name: 'New tag' }), '  donations ');
    await fireEvent.keyDown(screen.getByRole('textbox', { name: 'New tag' }), { key: 'Enter' });
    await fireEvent.click(button('Etiqueta'));
    await fireEvent.update(screen.getByRole('textbox', { name: 'New tag' }), 'donations');
    await fireEvent.keyDown(screen.getByRole('textbox', { name: 'New tag' }), { key: 'Enter' });
    expect(screen.getAllByText('donations')).toHaveLength(1);

    await fireEvent.click(within(screen.getByText('archive')).getByRole('button', { name: '×' }));
    expect(api.patch.mock.calls.slice(0, 3)).toEqual([
      ['/knowledge-entries/4', { title: 'Collections policy' }],
      ['/knowledge-entries/4', { summary: 'Welcoming donations' }],
      ['/knowledge-entries/4', { isDefinition: true }],
    ]);
    expect(savedTags).toEqual([['archive', 'donations'], ['donations']]);
  });

  it('finds, links and unlinks an existing entity', async () => {
    await openKnowledge('/knowledge-base/4');
    await screen.findByRole('textbox', { name: 'Entry title' });
    await fireEvent.click(button('Vincular entidad'));
    await fireEvent.update(screen.getByRole('textbox', { name: 'Search entities' }), ' Archive & Library ');
    await fireEvent.click(await screen.findByText(institution.name));
    expect(api.get).toHaveBeenCalledWith('/entities/search?q=Archive%20%26%20Library');
    expect(api.patch).toHaveBeenCalledWith('/knowledge-entries/4', { entityId: 27 });
    expect(screen.queryByRole('textbox', { name: 'Search entities' })).toBeNull();

    const linked = screen.getByText(institution.name);
    await fireEvent.click(within(linked).getByRole('button', { name: '×' }));
    expect(api.patch).toHaveBeenLastCalledWith('/knowledge-entries/4', { entityId: null });
    expect(button('Vincular entidad')).toBeTruthy();
  });

  it('uses the entry metadata to create an entity and permits retrying a failed creation', async () => {
    const created = { id: 28, name: entry.title, entityType };
    api.post.mockRejectedValueOnce(new Error('Entity service unavailable')).mockResolvedValueOnce({ data: created });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await openKnowledge('/knowledge-base/4');
      await screen.findByRole('textbox', { name: 'Entry title' });
      await fireEvent.click(button('Vincular entidad'));
      await fireEvent.click(button('+ Crear nueva entidad'));
      expect((button('Crear') as HTMLButtonElement).disabled).toBe(true);

      await fireEvent.update(screen.getByLabelText('New entity type'), String(entityType.id));
      await fireEvent.click(button('Crear'));
      await waitFor(() => expect(consoleError).toHaveBeenCalled());
      expect(api.patch.mock.calls.some(([, payload]) => 'entityId' in payload)).toBe(false);
      await fireEvent.click(button('Crear'));

      await screen.findByText(created.name);
      expect(api.post.mock.calls).toEqual([
        ['/entities', { name: entry.title, entityTypeId: entityType.id, description: entry.summary }],
        ['/entities', { name: entry.title, entityTypeId: entityType.id, description: entry.summary }],
      ]);
      expect(api.patch).toHaveBeenCalledWith('/knowledge-entries/4', { entityId: created.id });
      expect(screen.queryByLabelText('New entity type')).toBeNull();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('removes an entry only after confirmation and returns to the index', async () => {
    const { router, entries } = await openKnowledge('/knowledge-base/4');
    api.delete.mockImplementation(async () => { entries.shift(); return { data: {} }; });
    await screen.findByRole('textbox', { name: 'Entry title' });

    await fireEvent.click(screen.getByTitle('Eliminar entrada'));
    await fireEvent.click(button('Cancelar'));
    expect(api.delete).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByTitle('Eliminar entrada'));
    await fireEvent.click(button('Eliminar'));
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/knowledge-base'));
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/knowledge-entries/4');
    expect(await screen.findByRole('heading', { name: 'Reading rooms' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Collections' })).toBeNull();
  });
});
