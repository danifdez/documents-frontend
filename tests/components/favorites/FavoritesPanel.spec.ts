import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FavoritesPanel from '@/components/favorites/FavoritesPanel.vue';
import { useProjectStore } from '@/store/projectStore';
import type { Favorite } from '@/types/Favorite';
import type { FavoriteCategory } from '@/types/FavoriteCategory';
import type { Project } from '@/types/Project';

const { api, notify } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }, notify: vi.fn(),
}));
vi.mock('@/services/api', () => ({ default: api }));
vi.mock('@/composables/useNotification', () => ({ useNotification: () => ({ error: notify }) }));

const project: Project = { id: 7, name: 'Archives', description: null, status: 'active', createdAt: '', updatedAt: '' };
const root: FavoriteCategory = { id: 1, name: 'Research', parentId: null };
const child: FavoriteCategory = { id: 2, name: 'Reference', parentId: root.id };
const empty: FavoriteCategory = { id: 3, name: 'Maps', parentId: null };
const journal: Favorite = { id: 21, title: 'Journal', url: 'https://www.journal.example/articles', categoryId: root.id };
const index: Favorite = { id: 22, title: 'Archive index', url: 'https://archives.example/index', categoryId: child.id };
const orphan: Favorite = { id: 23, title: '', url: 'legacy-bookmark', categoryId: null };
let favorites: Favorite[];
let categories: FavoriteCategory[];

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const category = (name: string) => within(button(name).parentElement!);
const favorite = (name: string) => within(screen.getByText(name, { exact: true }).closest('button')!.parentElement!);
const field = (name: string) => screen.getByLabelText(name, { exact: true }) as HTMLInputElement;
const select = (name: string) => screen.getByLabelText(name, { exact: true }) as HTMLSelectElement;
const edit = () => within(button('Save').parentElement!.parentElement!);

async function openPanel(assigned: Project | null = project) {
  const pinia = createPinia();
  const store = useProjectStore(pinia);
  store.setCurrentProject(assigned);
  const view = render(FavoritesPanel, { props: { modelValue: false }, global: { plugins: [pinia] } });
  await view.rerender({ modelValue: true });
  return { view, store };
}

beforeEach(() => {
  vi.resetAllMocks();
  favorites = [journal, index, orphan];
  categories = [root, child, empty];
  api.get.mockImplementation(async (url: string) => {
    if (url === '/favorites/project/7') return { data: [...favorites] };
    if (url === '/favorite-categories/project/7') return { data: [...categories] };
    if (url.endsWith('/8')) return { data: [] };
    throw new Error(`Unexpected GET ${url}`);
  });
  api.post.mockResolvedValue({ data: {} });
  api.patch.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({ data: {} });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('project favorites', () => {
  it('asks for a project before requesting favorites and closes when the project is cleared', async () => {
    const { view, store } = await openPanel(null);
    expect(screen.getByText('Select a project to manage its favorites.')).toBeTruthy();
    expect(api.get).not.toHaveBeenCalled();
    store.setCurrentProject(project);
    expect(await screen.findByText(journal.title)).toBeTruthy();
    store.clearCurrentProject();
    await waitFor(() => expect(view.emitted()['update:modelValue']).toEqual([[false]]));
  });

  it('counts and filters a category tree and keeps uncategorized favorites available', async () => {
    await openPanel();
    await screen.findByText(journal.title);
    expect(category(root.name).getByText('2')).toBeTruthy();
    expect(category(child.name).getByText('1')).toBeTruthy();
    expect(screen.getByText('journal.example')).toBeTruthy();
    await fireEvent.click(button(root.name));
    expect(screen.getByText(index.title)).toBeTruthy();
    expect(screen.queryAllByText(orphan.url)).toHaveLength(0);
    expect(select('Favorite category').value).toBe('1');
    expect(within(select('Favorite category')).getByRole('option', { name: 'Research / Reference' })).toBeTruthy();
    await fireEvent.click(button(child.name));
    expect(screen.queryByText(journal.title)).toBeNull();
    expect(screen.getByText(index.title)).toBeTruthy();
    await fireEvent.click(button(/Uncategorized/));
    expect(screen.queryByText(index.title)).toBeNull();
    expect(screen.getAllByText(orphan.url)).toHaveLength(2);
    await fireEvent.click(button(empty.name));
    expect(screen.getByText('No favorites here yet')).toBeTruthy();
  });

  it('opens a saved URL in a separate context', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    await openPanel();
    await fireEvent.click(await screen.findByText(journal.title));
    expect(open).toHaveBeenCalledExactlyOnceWith(journal.url, '_blank', 'noopener,noreferrer');
  });

  it('trims a new favorite and assigns it to the currently selected category', async () => {
    await openPanel();
    await screen.findByText(journal.title);
    await fireEvent.click(button(child.name));
    expect((button('Add') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.update(field('Favorite URL'), '  https://new.example/  ');
    await fireEvent.update(field('Favorite title (optional)'), '  Manuscripts  ');
    api.post.mockImplementationOnce(async () => {
      favorites.push({ id: 24, url: 'https://new.example/', title: 'Manuscripts', categoryId: child.id });
      return { data: {} };
    });
    await fireEvent.click(button('Add'));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/favorites', {
      url: 'https://new.example/', title: 'Manuscripts', projectId: 7, categoryId: 2,
    });
    expect(await screen.findByText('Manuscripts')).toBeTruthy();
    expect(field('Favorite URL').value).toBe('');
  });

  it('preserves a favorite when editing is canceled, then supports recategorizing and removing it', async () => {
    await openPanel();
    await screen.findByText(journal.title);
    await fireEvent.click(favorite(journal.title).getByTitle('Edit'));
    await fireEvent.update(edit().getByLabelText('Favorite title'), 'Draft title');
    await fireEvent.click(button('Cancel'));
    expect(api.patch).not.toHaveBeenCalled();

    await fireEvent.click(favorite(journal.title).getByTitle('Edit'));
    await fireEvent.update(edit().getByLabelText('Favorite title'), '  Updated journal ');
    await fireEvent.update(edit().getByLabelText('Favorite category'), '');
    api.patch.mockImplementationOnce(async () => {
      favorites = [{ ...journal, title: 'Updated journal', categoryId: null }, index, orphan];
      return { data: {} };
    });
    await fireEvent.click(button('Save'));
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/favorites/21', {
      url: journal.url, title: 'Updated journal', categoryId: null,
    });
    await screen.findByText('Updated journal');
    await fireEvent.click(button(/Uncategorized/));
    api.delete.mockImplementationOnce(async () => {
      favorites = [index, orphan];
      return { data: {} };
    });
    await fireEvent.click(favorite('Updated journal').getByTitle('Remove'));
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/favorites/21');
    await waitFor(() => expect(screen.queryByText('Updated journal')).toBeNull());
  });

  it('creates root and child categories and persists a trimmed rename', async () => {
    await openPanel();
    await screen.findByText(journal.title);
    await fireEvent.click(button('New Category'));
    await fireEvent.keyDown(field('New category name'), { key: 'Escape' });
    expect(api.post).not.toHaveBeenCalled();

    await fireEvent.click(button('New Category'));
    await fireEvent.update(field('New category name'), '  Atlases  ');
    api.post.mockImplementationOnce(async () => {
      categories.push({ id: 4, name: 'Atlases', parentId: null });
      return { data: {} };
    });
    await fireEvent.keyDown(field('New category name'), { key: 'Enter' });
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/favorite-categories', { projectId: 7, name: 'Atlases', parentId: null });
    await screen.findByRole('button', { name: 'Atlases' });

    await fireEvent.click(category(root.name).getByTitle('Add subcategory'));
    await fireEvent.update(field('New subcategory name'), ' Surveys ');
    api.post.mockImplementationOnce(async () => {
      categories.push({ id: 5, name: 'Surveys', parentId: root.id });
      return { data: {} };
    });
    await fireEvent.keyDown(field('New subcategory name'), { key: 'Enter' });
    expect(api.post).toHaveBeenLastCalledWith('/favorite-categories', { projectId: 7, name: 'Surveys', parentId: 1 });

    await fireEvent.click(category(child.name).getByTitle('Rename'));
    expect(field('Subcategory name').value).toBe(child.name);
    await fireEvent.update(field('Subcategory name'), ' Updated reference ');
    await fireEvent.keyDown(field('Subcategory name'), { key: 'Enter' });
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/favorite-categories/2', { name: 'Updated reference' });
  });

  it('returns to all favorites when the active category is removed', async () => {
    await openPanel();
    await screen.findByText(journal.title);
    await fireEvent.click(button(empty.name));
    expect(screen.getByText('No favorites here yet')).toBeTruthy();
    api.delete.mockImplementationOnce(async () => {
      categories = [root, child];
      return { data: {} };
    });
    await fireEvent.click(category(empty.name).getByTitle('Delete'));
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/favorite-categories/3');
    expect(await screen.findByText(journal.title)).toBeTruthy();
    expect(screen.queryByRole('button', { name: empty.name })).toBeNull();
  });

  it('preserves the pending favorite when creation fails and closes through the header', async () => {
    const { view } = await openPanel();
    await screen.findByText(journal.title);
    api.post.mockRejectedValueOnce(new Error('Offline'));
    await fireEvent.update(field('Favorite URL'), 'https://new.example/');
    await fireEvent.click(button('Add'));
    expect(notify).toHaveBeenCalledExactlyOnceWith('Failed to add favorite');
    expect(field('Favorite URL').value).toBe('https://new.example/');
    await fireEvent.click(button('Close favorites'));
    expect(view.emitted()['update:modelValue']).toEqual([[false]]);
  });
});
