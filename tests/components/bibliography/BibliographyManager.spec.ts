import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import BibliographyManager from '@/components/bibliography/BibliographyManager.vue';

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('@/services/api', () => ({ default: api }));

const project = { id: 11, name: 'Collections' };
const globalReference = {
  id: 1, entryType: 'journalArticle', title: 'Archival methods', citeKey: 'rivera2026', year: '2026',
  creators: [{ creatorType: 'author', firstName: 'Eva', lastName: 'Rivera' }, { creatorType: 'author', name: 'Museum staff' }],
};
const projectReference = {
  id: 2, entryType: 'book', title: 'Guide to manuscripts', citeKey: 'catalogue2025', project,
  creators: [{ creatorType: 'editor', firstName: 'Lou', lastName: 'Arden' }],
  sourceResource: { id: 30, name: 'Printed guide' },
};
const resources = [
  { id: 30, name: 'Printed guide', project },
  { id: 31, name: 'Notebook index', publicationDate: '2024-07-01', project },
  { id: 32, name: 'Map series', project: { id: 12, name: 'Maps' } },
];
const bibtex = '@book{collection2026, title={Collection review}}';
const button = (name: string | RegExp) => screen.getByRole('button', { name });
let entries: Array<typeof globalReference | typeof projectReference | Record<string, unknown>>;

async function openBibliography(projectId?: number, query = '', fullScreen = true) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/bibliography', component: BibliographyManager }, { path: '/resource/:id', component: { template: '<div />' } }],
  });
  await router.push('/bibliography' + query);
  return render(BibliographyManager, { props: { projectId, fullScreen }, global: { plugins: [router] } });
}

beforeEach(() => {
  vi.resetAllMocks();
  entries = structuredClone([globalReference, projectReference]);
  api.get.mockImplementation(async (path) => {
    if (path === '/bibliography' || path === '/bibliography/project/11') return { data: JSON.parse(JSON.stringify(entries)) };
    if (path === '/projects') return { data: [project] };
    if (path === '/resources' || path === '/resources/project/11') return { data: resources };
    if (path === '/bibliography/export/bibtex') return { data: bibtex };
    throw new Error(`Unexpected GET ${path}`);
  });
});

afterEach(() => vi.restoreAllMocks());

describe('bibliography workflows', () => {
  it('opens a reference from the route and filters scoped entries by contributor or citation key', async () => {
    await openBibliography(11, '?entry=1');
    expect(await screen.findByRole('heading', { name: globalReference.title })).toBeTruthy();
    expect(screen.getByText(/Rivera, Eva \(author\); Museum staff/)).toBeTruthy();
    await fireEvent.click(button('Proyecto'));
    const search = screen.getByRole('textbox', { name: 'Search bibliography' });
    expect(screen.getByText(projectReference.title)).toBeTruthy();

    await fireEvent.update(search, 'catalogue2025');
    expect(screen.getByText(projectReference.title)).toBeTruthy();
    await fireEvent.update(search, 'Rivera');
    expect(screen.getByText('No hay entradas bibliográficas.')).toBeTruthy();
    await fireEvent.click(button('Globales'));
    expect(screen.getAllByText(globalReference.title)).toHaveLength(2);
    expect(screen.queryByText(projectReference.title)).toBeNull();
  });

  it('creates a conference reference with type-specific details and only populated creators', async () => {
    await openBibliography(11);
    await screen.findByText(globalReference.title);
    api.post.mockImplementation(async (_path, payload) => {
      const entry = { id: 14, ...payload, project };
      entries.push(entry);
      return { data: entry };
    });
    await fireEvent.click(button('+ Añadir'));
    await fireEvent.update(screen.getByLabelText('Tipo de elemento'), 'conferencePaper');
    await fireEvent.update(screen.getByLabelText('Título *'), 'Indexing field notes');
    await fireEvent.update(screen.getByLabelText('Título de las actas'), 'Proceedings on cataloguing');
    await fireEvent.update(screen.getByLabelText('Nombre del congreso'), 'Collections 2026');
    await fireEvent.click(button('+ Autor'));
    await fireEvent.click(button('+ Editor'));
    await fireEvent.update(screen.getAllByRole('textbox', { name: 'Last name' })[0], 'Mora');
    await fireEvent.update(screen.getAllByRole('textbox', { name: 'First name' })[0], 'Irene');
    await fireEvent.click(button('Add entry'));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/bibliography', expect.objectContaining({
      entryType: 'conferencePaper', title: 'Indexing field notes', booktitle: 'Proceedings on cataloguing',
      conferenceName: 'Collections 2026', projectId: 11,
      creators: [{ creatorType: 'author', firstName: 'Irene', lastName: 'Mora' }],
    }));
    expect(await screen.findByRole('heading', { name: 'Indexing field notes' })).toBeTruthy();
  });

  it('assigns a global reference to a project, restores it to global and deletes it', async () => {
    await openBibliography();
    await fireEvent.click(await screen.findByText(globalReference.title));
    api.patch.mockImplementation(async (path) => {
      entries[0] = path.endsWith('/make-global') ? globalReference : { ...globalReference, project };
      return { data: entries[0] };
    });
    api.delete.mockImplementation(async () => {
      entries.shift();
      return { data: {} };
    });

    await fireEvent.click(button('Asignar a proyecto'));
    const destination = screen.getByRole('combobox', { name: 'Destination project' });
    await fireEvent.update(destination, '11');
    expect(api.patch).toHaveBeenLastCalledWith('/bibliography/1/assign-project', { projectId: 11 });
    await fireEvent.click(await screen.findByRole('button', { name: 'Hacer global' }));
    expect(api.patch).toHaveBeenLastCalledWith('/bibliography/1/make-global');
    await screen.findByRole('button', { name: 'Asignar a proyecto' });

    await fireEvent.click(button('Eliminar'));
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/bibliography/1');
    await waitFor(() => expect(screen.queryByText(globalReference.title)).toBeNull());
  });

  it('imports only a resource missing from the library and filters resource choices by project and name', async () => {
    await openBibliography();
    const imported = { id: 3, title: 'Notebook index', entryType: 'report', sourceResource: resources[1] };
    api.post.mockImplementation(async () => {
      entries.push(imported);
      return { data: imported };
    });
    await fireEvent.click(await screen.findByRole('button', { name: /Añadir desde recursos/ }));
    expect(screen.queryByText('Printed guide')).toBeNull();
    expect(screen.getByText('Map series')).toBeTruthy();
    await fireEvent.update(screen.getByRole('combobox', { name: 'Filter resources by project' }), '11');
    expect(screen.queryByText('Map series')).toBeNull();
    const search = screen.getByRole('textbox', { name: 'Search resources by title' });
    await fireEvent.update(search, 'missing');
    expect(screen.getByText('No hay resultados para los filtros aplicados.')).toBeTruthy();
    await fireEvent.update(search, 'note');
    const row = screen.getByText('Notebook index').parentElement!.parentElement!;
    await fireEvent.click(within(row).getByRole('button', { name: 'Añadir' }));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/bibliography/import/resource/31', {});
    expect(await screen.findByRole('heading', { name: 'Notebook index' })).toBeTruthy();
  });

  it('imports a BibTeX file and exports the project references as a named download', async () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:bibliography');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const save = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    api.post.mockResolvedValue({ data: [] });
    await openBibliography(11, '', false);
    await fireEvent.click(button('Importar .bib'));
    expect((button('Importar') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.change(screen.getByLabelText('Import BibTeX file'), {
      target: { files: [new File([bibtex], 'references.bib', { type: 'text/plain' })] },
    });
    await waitFor(() => expect((button('Importar') as HTMLButtonElement).disabled).toBe(false));
    await fireEvent.click(button('Importar'));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/bibliography/import/bibtex', { bibtex, projectId: 11 });
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Importar BibTeX' })).toBeNull());

    await fireEvent.click(button('Exportar .bib'));
    expect(api.get).toHaveBeenCalledWith('/bibliography/export/bibtex', { params: { projectId: '11' }, responseType: 'text' });
    expect(await (create.mock.calls[0][0] as Blob).text()).toBe(bibtex);
    expect((save.mock.contexts[0] as HTMLAnchorElement).download).toBe('bibliography.bib');
    expect(revoke).toHaveBeenCalledWith('blob:bibliography');
  });
});
