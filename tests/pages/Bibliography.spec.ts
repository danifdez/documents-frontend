import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import Bibliography from '@/pages/Bibliography.vue';
import type { BibliographyEntry } from '@/types/Bibliography';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/services/api', () => ({ default: api }));

const project = { id: 13, name: 'Research archive' };
const article = {
  id: 1, title: 'Computation and records', citeKey: 'hopper1952', entryType: 'journalArticle', year: '1952',
  creators: [{ creatorType: 'author', firstName: 'Grace', lastName: 'Hopper' }],
  journal: 'Scientific Memoirs', pages: '10–22', project: null as BibliographyEntry['project'], doi: '10.1234/records',
} satisfies Partial<BibliographyEntry>;
const book = {
  id: 2, title: 'Catalog practices', entryType: 'book', citeKey: 'open2026', creators: null as BibliographyEntry['creators'],
  project, sourceResource: { id: 16, name: 'catalog.pdf' },
} satisfies Partial<BibliographyEntry>;
const sources = [
  { id: 16, title: 'Catalog source', name: 'catalog.pdf', project },
  { id: 17, title: 'Annual figures', name: 'annual.pdf', project, publicationDate: '2024-08-20' },
  { id: 18, title: 'Acquisitions', name: 'acquisitions.pdf', project: { id: 31, name: 'Library' } },
];
const button = (name: string) => screen.getByRole('button', { name });

async function openBibliography(path = '/bibliography', initial: Partial<BibliographyEntry>[] = [article, book]) {
  const entries = [...initial];
  api.get.mockImplementation(async (url) => {
    if (url === '/bibliography' || url === '/bibliography/project/13') return { data: [...entries] };
    if (url === '/projects') return { data: [project] };
    if (url === '/projects/13') return { data: project };
    if (url === '/resources' || url === '/resources/project/13') return { data: sources };
    if (url === '/bibliography/export/bibtex') return { data: '@book{open2026}' };
    throw new Error(`Unexpected GET ${url}`);
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<p>Projects</p>' } },
      { path: '/bibliography', component: Bibliography },
      { path: '/project/:id', component: { template: '<p>Project</p>' } },
      { path: '/project/:id/bibliography', component: Bibliography },
      { path: '/resource/:id', component: { template: '<p>Resource</p>' } },
    ],
  });
  await router.push(path);
  render(Bibliography, { global: { plugins: [router] } });
  return entries;
}

beforeEach(() => vi.resetAllMocks());

describe('bibliography', () => {
  it('opens the entry from the route and filters project and global references', async () => {
    await openBibliography('/project/13/bibliography?entry=2');
    expect(await screen.findByRole('heading', { name: book.title })).toBeTruthy();
    expect(screen.getByRole('link', { name: /catalog.pdf/ }).getAttribute('href')).toBe('/resource/16');
    expect(screen.getByRole('link', { name: project.name }).getAttribute('href')).toBe('/project/13');

    await fireEvent.click(button('Globales'));
    const search = screen.getByRole('textbox', { name: 'Search bibliography' });
    await fireEvent.update(search, 'HOPPER');
    expect(screen.getByText(article.title)).toBeTruthy();
    await fireEvent.click(screen.getByText(article.title));
    expect(screen.getByRole('heading', { name: article.title })).toBeTruthy();
    expect(screen.getByText('Hopper, Grace (author)')).toBeTruthy();
    expect(screen.getByText(article.doi)).toBeTruthy();

    await fireEvent.update(search, '');
    await fireEvent.click(button('Proyecto'));
    expect(screen.queryByText(book.title)).toBeTruthy();
    expect(screen.queryAllByText(article.title)).toHaveLength(1);
  });

  it('creates a project entry from the form, patches its title and removes it', async () => {
    const entries = await openBibliography('/project/13/bibliography');
    await screen.findByText(article.title);
    api.post.mockImplementation(async (_, payload: Partial<BibliographyEntry>) => {
      const created = { ...payload, id: 3, project };
      entries.push(created);
      return { data: created };
    });
    api.patch.mockImplementation(async (_, payload: Partial<BibliographyEntry>) => {
      const changed = { ...entries[2], ...payload };
      entries.splice(2, 1, changed);
      return { data: changed };
    });
    api.delete.mockImplementation(async () => {
      entries.pop();
      return { data: {} };
    });

    await fireEvent.click(button('+ Añadir'));
    await fireEvent.update(screen.getByLabelText('Tipo de elemento'), 'book');
    await fireEvent.update(screen.getByPlaceholderText('Título del trabajo'), 'Reading rooms');
    await fireEvent.update(screen.getByLabelText('Clave BibTeX'), 'rooms2026');
    const add = button('Add entry') as HTMLButtonElement;
    await fireEvent.submit(add.form!);
    expect(await screen.findByRole('heading', { name: 'Reading rooms' })).toBeTruthy();
    expect(api.post).toHaveBeenCalledWith('/bibliography', expect.objectContaining({
      title: 'Reading rooms', entryType: 'book', citeKey: 'rooms2026', projectId: 13,
    }));

    await fireEvent.click(button('Editar'));
    await fireEvent.update(screen.getByPlaceholderText('Título del trabajo'), 'Open reading rooms');
    await fireEvent.submit((button('Save changes') as HTMLButtonElement).form!);
    expect(await screen.findByRole('heading', { name: 'Open reading rooms' })).toBeTruthy();
    expect(api.patch).toHaveBeenCalledWith('/bibliography/3', expect.objectContaining({ title: 'Open reading rooms' }));

    await fireEvent.click(button('Eliminar'));
    await waitFor(() => expect(screen.queryByText('Open reading rooms')).toBeNull());
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/bibliography/3');
    expect(screen.getByText(article.title)).toBeTruthy();
  });

  it('imports an unreferenced resource after filtering out an existing source and a different project', async () => {
    const entries = await openBibliography();
    const imported = { id: 3, title: 'Annual publication', entryType: 'report', sourceResource: sources[1], project };
    api.post.mockImplementation(async () => {
      entries.push(imported);
      return { data: imported };
    });
    await fireEvent.click(await screen.findByRole('button', { name: /Añadir desde recursos/ }));
    expect(screen.queryByText('Catalog source')).toBeNull();
    expect(screen.getByText('Acquisitions')).toBeTruthy();
    await fireEvent.update(screen.getByRole('combobox', { name: 'Filter resources by project' }), '13');
    expect(screen.queryByText('Acquisitions')).toBeNull();
    await fireEvent.update(screen.getByRole('textbox', { name: 'Search resources by title' }), 'not present');
    expect(screen.getByText('No hay resultados para los filtros aplicados.')).toBeTruthy();
    await fireEvent.update(screen.getByRole('textbox', { name: 'Search resources by title' }), 'ANNUAL');
    expect(screen.getByText('Annual figures')).toBeTruthy();

    await fireEvent.click(button('Añadir'));
    expect(await screen.findByRole('heading', { name: imported.title })).toBeTruthy();
    expect(api.post).toHaveBeenCalledWith('/bibliography/import/resource/17', {});
  });

  it('reads a BibTeX file and sends its contents to the current project', async () => {
    await openBibliography('/project/13/bibliography');
    const tex = '@book{archive, title={Reading rooms}}';
    api.post.mockResolvedValue({ data: [] });
    await fireEvent.click(button('Importar .bib'));
    expect((button('Importar') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.change(screen.getByLabelText('Import BibTeX file'), {
      target: { files: [new File([tex], 'archive.bib', { type: 'text/plain' })] },
    });
    await waitFor(() => expect((button('Importar') as HTMLButtonElement).disabled).toBe(false));
    await fireEvent.click(button('Importar'));
    expect(api.post).toHaveBeenCalledWith('/bibliography/import/bibtex', { bibtex: tex, projectId: 13 });
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Importar BibTeX' })).toBeNull());
  });
});
