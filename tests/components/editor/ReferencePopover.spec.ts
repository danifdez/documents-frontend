import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReferencePopover from '@/components/editor/ReferencePopover.vue';
import type { BibliographyEntry } from '@/types/Bibliography';

const { api, push, update } = vi.hoisted(() => ({
  api: { get: vi.fn() }, push: vi.fn(), update: vi.fn(),
}));
vi.mock('@/services/api', () => ({ default: api }));
vi.mock('@/router', () => ({ default: { push } }));

const article = {
  id: 18, entryType: 'journalArticle', title: 'Cataloguing Inland Trade', year: '1918',
  creators: [
    { creatorType: 'author', firstName: 'Ada', lastName: 'Parker' },
    { creatorType: 'author', name: 'City Archive' },
  ],
  journal: 'Historical Review', publisher: 'Arc Press', volume: '5', number: '4', pages: '13–19',
  doi: '10.1000/archive', url: 'https://review.example/archive',
  project: { id: 2, name: 'Research' }, sourceResource: { id: 8, name: 'Scan' },
} as BibliographyEntry;
const type = {
  refId: '18', refType: 'bibliography', label: '[5]', displayMode: 'citation', citeStyle: 'ieee',
  getEntries: () => [article], onUpdateAttrs: update,
};
const button = (name: string) => screen.getByRole('button', { name });
let response: Record<string, unknown>;

function openReference(props: Partial<typeof type> = {}) {
  return render(ReferencePopover, { props: { ...type, ...props } });
}

beforeEach(() => {
  vi.resetAllMocks();
  response = {};
  api.get.mockImplementation(async () => ({ data: response }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('editor reference popover', () => {
  it('formats a bibliography badge, shows metadata, and updates both the style and stored label', async () => {
    const view = openReference();
    const badge = await screen.findByText('[5]');
    vi.spyOn(badge, 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 80, 20, 10));
    await fireEvent.click(badge);
    expect(screen.getByText(article.title!)).toBeTruthy();
    const entryLink = screen.getByRole('link', { name: 'Go to entry' });
    await waitFor(() => expect(entryLink.closest<HTMLElement>('.ref-popover')?.style.top).toBe('96px'));
    expect(screen.getByText('Parker, Ada; City Archive')).toBeTruthy();
    expect(screen.getByText('Historical Review')).toBeTruthy();
    expect(screen.getByText('Vol. 5(4)')).toBeTruthy();
    expect(screen.getByRole('link', { name: article.doi! }).getAttribute('href')).toBe('https://doi.org/10.1000/archive');
    expect(screen.queryByRole('link', { name: article.url! })).toBeNull();
    expect(api.get).not.toHaveBeenCalled();

    await fireEvent.click(button('VANCOUVER'));
    expect(update).toHaveBeenLastCalledWith({ 'data-cite-style': 'vancouver', 'data-label': '(5)' });
    await fireEvent.click(button('Full'));
    expect(update).toHaveBeenLastCalledWith({ 'data-display-mode': 'full' });
    await view.rerender({ displayMode: 'full', citeStyle: 'vancouver' });
    expect(screen.getByText(/5\. Parker A, City Archive \. Cataloguing Inland Trade/)).toBeTruthy();
    await fireEvent.click(entryLink);
    expect(push).toHaveBeenCalledExactlyOnceWith('/project/2/bibliography?entry=18');
  });

  it('loads bibliography URLs for entries without a DOI and links to their source', async () => {
    openReference({ getEntries: () => [{ ...article, doi: null, creators: [] }] });
    await fireEvent.click(await screen.findByText('[5]'));
    expect(screen.getByRole('link', { name: article.url! }).getAttribute('href')).toBe(article.url);
    await fireEvent.click(screen.getByRole('link', { name: 'View resource: Scan' }));
    expect(push).toHaveBeenCalledExactlyOnceWith('/resource/8');
  });

  it('loads a resource on first open, displays its metadata, and reuses the result after dismissal', async () => {
    response = {
      title: 'Ship List', author: 'Mary Evans', publicationDate: '1921-05-01', type: 'Ledger',
      url: 'https://archive.example/records',
    };
    const view = openReference({ refType: 'resource', label: 'Source', refId: '40' });
    const badge = screen.getByText('Source');
    expect(api.get).not.toHaveBeenCalled();
    await fireEvent.click(badge);
    expect(await screen.findByText('Mary Evans')).toBeTruthy();
    expect(screen.getByText('1921')).toBeTruthy();
    expect(screen.getByText('Ledger')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'https://archive.example/records' })).toBeTruthy();
    expect(api.get).toHaveBeenCalledExactlyOnceWith('/resources/40');
    await fireEvent.click(button('Title'));
    expect(update).toHaveBeenCalledExactlyOnceWith({ 'data-display-mode': 'title' });
    await fireEvent.click(document.body);
    expect(screen.queryByText('Mary Evans')).toBeNull();
    await view.rerender({ displayMode: 'title' });
    const rendered = within(view.container).getByRole('button');
    expect(rendered.textContent).toBe('Ship List');
    await fireEvent.click(rendered);
    await fireEvent.click(screen.getByRole('link', { name: 'Go to resource' }));
    expect(push).toHaveBeenCalledExactlyOnceWith('/resource/40');
    expect(api.get).toHaveBeenCalledOnce();
  });

  it.each([
    {
      refType: 'doc', path: '/docs/41', dest: '/document/41', link: 'Go to document',
      record: { name: 'Field Notes', project: { name: 'Archives' } }, metadata: 'Archives',
    },
    {
      refType: 'knowledge', path: '/knowledge-entries/41', dest: '/knowledge-base/41', link: 'Go to KB entry',
      record: { title: 'Oxford', summary: 'Administrative center', tags: ['Place', 'History'] }, metadata: 'Administrative center',
    },
  ])('opens the referenced $refType and navigates with its real identifier', async ({ refType, path, dest, link, record, metadata }) => {
    response = record;
    openReference({ refType, refId: '41', label: 'Ref 41' });
    await fireEvent.click(screen.getByText('Ref 41'));
    expect(await screen.findByText(metadata)).toBeTruthy();
    await fireEvent.click(screen.getByRole('link', { name: link }));
    expect(api.get).toHaveBeenCalledExactlyOnceWith(path);
    expect(push).toHaveBeenCalledExactlyOnceWith(dest);
  });

  it.each([
    { source: { resource: { id: 8, title: 'Pamphlet' } }, parent: 'Pamphlet', dest: '/resource/8' },
    { source: { doc: { id: 9, name: 'Draft report' } }, parent: 'Draft report', dest: '/document/9' },
  ])('prefetches the mark and renders its quote and $parent reference', async ({ source, parent, dest }) => {
    response = { content: 'The book is bound in vellum', note: 'Preservation note', ...source };
    const view = openReference({ refType: 'mark', refId: '21', label: 'Mark 21', displayMode: 'quote-citation' });
    expect(await screen.findByText(parent)).toBeTruthy();
    expect(view.container.textContent).toContain('"The book is bound in vellum"');
    await fireEvent.click(within(view.container).getByRole('button'));
    expect(screen.getByText('Preservation note')).toBeTruthy();
    await fireEvent.click(button('Citation'));
    expect(update).toHaveBeenCalledWith({ 'data-display-mode': 'citation' });
    await fireEvent.click(screen.getByRole('link', { name: new RegExp(parent) }));
    expect(push).toHaveBeenCalledExactlyOnceWith(dest);
    expect(api.get).toHaveBeenCalledExactlyOnceWith('/marks/21');
  });

  it('shows a fallback when loading fails and retries the detail on reopening', async () => {
    const request = Promise.withResolvers<never>();
    api.get.mockReturnValueOnce(request.promise);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    openReference({ refType: 'doc', refId: '77', label: 'Lost record' });
    const badge = screen.getByText('Lost record');
    await fireEvent.click(badge);
    expect(screen.getByText('Loading...')).toBeTruthy();
    request.reject(new Error('temporary offline'));
    expect(await screen.findByText('Could not load information.')).toBeTruthy();
    await fireEvent.click(button('×'));
    response = { name: 'Available again' };
    await fireEvent.click(badge);
    expect(await screen.findByText('Available again')).toBeTruthy();
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    error.mockRestore();
  });
});
