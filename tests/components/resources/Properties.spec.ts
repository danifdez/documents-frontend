import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import Properties from '@/components/resources/Properties.vue';
import type { Resource } from '@/services/resources/useResource';

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/services/api', () => ({ default: api }));

const archive = { id: 3, name: 'Archives' };
const index = { id: 4, name: 'Indexing' };
const types = [{ id: 1, name: 'Journal' }, { id: 2, name: 'Map' }];
const alex = { id: 11, name: 'Alex Reed' };
const sam = { id: 12, name: 'Sam Mills' };
const sally = { id: 13, name: 'Sally Evans' };
const resource: Resource = {
  id: 17, title: 'Acquisition report', project: archive, type: { id: 1 }, authors: [alex],
  language: 'en', fileSize: '1536', pages: 12, originalName: 'report.pdf', relatedTo: 42,
};
const authorsInput = () => screen.getByRole('textbox', { name: 'Resource authors' }) as HTMLInputElement;
const select = (name: string) => screen.getByRole('combobox', { name }) as HTMLSelectElement;
const row = (name: string) => within(screen.getByText(name, { exact: true }).parentElement!);

async function openProperties(overrides: Partial<Resource> = {}) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/resource/:id', component: Properties }] });
  await router.push('/resource/17');
  const data = reactive({ ...resource, ...overrides });
  const view = render(Properties, { props: { resource: data }, global: { plugins: [router] } });
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/resource-types'));
  return { data, view };
}

beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockImplementation(async (path: string) => {
    if (path === '/resource-types') return { data: types };
    if (path === '/projects') return { data: [archive, index] };
    if (path === '/authors') return { data: [alex, sam, sally] };
    if (path === '/authors?name=Alex%20Reed') return { data: [alex] };
    if (path === '/authors?name=Sam%20Mills') return { data: [sam] };
    if (path === '/authors?name=Taylor%20James') return { data: [] };
    throw new Error(`Unexpected GET ${path}`);
  });
  api.patch.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({ data: {} });
  api.post.mockResolvedValue({ data: { id: 15, name: 'Taylor James' } });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('resource properties', () => {
  it('displays type and language names, file size and the linked resource', async () => {
    await openProperties();
    expect(await screen.findByText('Journal')).toBeTruthy();
    expect(row('Language').getByText('English')).toBeTruthy();
    expect(row('Size').getByText('1.50 KB')).toBeTruthy();
    expect(row('Pages').getByText('12')).toBeTruthy();
    expect(row('File').getByText('report.pdf')).toBeTruthy();
    expect(screen.getByRole('link', { name: '42' }).getAttribute('href')).toBe('/resource/42');
  });

  it.each([
    { fileSize: 75, expected: '75 bytes' },
    { fileSize: 2 * 1024 ** 2, expected: '2 MB' },
    { fileSize: 'unavailable', expected: '' },
  ])('displays the expected size label for $fileSize', async ({ fileSize, expected }) => {
    await openProperties({ fileSize, pages: 0, language: 'unknown-lang' });
    expect(screen.queryByText('Pages')).toBeNull();
    expect(row('Language').getByText('unknown-lang')).toBeTruthy();
    expect(screen.getByText('Size').nextElementSibling?.textContent).toBe(expected);
  });

  it('assigns to a different project, emits the updated resource, and supports clearing the assignment', async () => {
    const { view, data } = await openProperties();
    await fireEvent.dblClick(screen.getByText(archive.name));
    expect(await screen.findByRole('option', { name: index.name })).toBeTruthy();
    expect(select('Resource project').value).toBe('3');
    await fireEvent.update(select('Resource project'), '4');
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/resources/17/assign', { projectId: 4 });
    await waitFor(() => expect(data.project).toEqual(index));
    expect(view.emitted()['project:assigned']).toHaveLength(1);

    await fireEvent.dblClick(await screen.findByText(index.name));
    await fireEvent.update(select('Resource project'), '');
    expect(api.patch).toHaveBeenLastCalledWith('/resources/17', { project: null });
    expect(await screen.findByText('Pending (unassigned)')).toBeTruthy();
  });

  it('shows the original type after canceling and updates the new type when selected', async () => {
    const { data } = await openProperties();
    await fireEvent.dblClick(await screen.findByText('Journal'));
    const original = select('Resource type');
    expect(original.value).toBe('1');
    await fireEvent.keyUp(original, { key: 'Escape' });
    expect(screen.getByText('Journal')).toBeTruthy();
    expect(api.patch).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 110));
    await fireEvent.dblClick(screen.getByText('Journal'));
    await fireEvent.update(select('Resource type'), '2');
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/resources/17', { type: '2' });
    await waitFor(() => expect(data.type).toBe('2'));
    expect(await screen.findByText('Map', { selector: 'span' }, { timeout: 2000 })).toBeTruthy();
  });

  it('edits scalar fields inline and maps an empty value to null', async () => {
    const { data } = await openProperties();
    await fireEvent.dblClick(screen.getByText('Acquisition report'));
    const input = screen.getByRole('textbox', { name: 'Enter title...' });
    await fireEvent.update(input, 'Metadata digest');
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(api.patch).toHaveBeenCalledWith('/resources/17', { title: 'Metadata digest' });
    expect(await screen.findByText('Metadata digest')).toBeTruthy();

    await fireEvent.dblClick(screen.getByText('English'));
    await fireEvent.update(select('Click to edit'), 'es');
    expect(api.patch).toHaveBeenCalledWith('/resources/17', { language: 'es' });
    expect(await screen.findByText('Spanish')).toBeTruthy();

    await fireEvent.dblClick(screen.getByText('Metadata digest'));
    const empty = screen.getByRole('textbox', { name: 'Enter title...' });
    await fireEvent.update(empty, '');
    await fireEvent.blur(empty);
    expect(api.patch).toHaveBeenLastCalledWith('/resources/17', { title: null });
    expect(data.title).toBeNull();
  });

  it('uses keyboard autocomplete, preserves other authors, and saves a newly entered author', async () => {
    const { data } = await openProperties();
    await fireEvent.dblClick(screen.getByText(alex.name));
    const input = authorsInput();
    expect(input.value).toBe(alex.name);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/authors'));
    await fireEvent.update(input, 'Alex Reed, Sa');
    await screen.findByText(sam.name);
    await fireEvent.keyDown(input, { key: 'ArrowUp' });
    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(input.value).toBe('Alex Reed, Sam Mills');
    await fireEvent.update(input, 'Alex Reed, Sam Mills, Taylor James, ');
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/resources/17/authors');
    await waitFor(() => expect(data.authors?.map((author) => author.name)).toEqual([alex.name, sam.name, 'Taylor James']));
    expect(api.post).toHaveBeenCalledWith('/authors', { name: 'Taylor James' });
    for (const id of [11, 12, 15]) expect(api.post).toHaveBeenCalledWith(`/resources/17/authors/${id}`);
  });

  it('does not change authors when edits are canceled or when the order is unchanged', async () => {
    await openProperties({ authors: [alex, sam] });
    await fireEvent.dblClick(screen.getByText('Alex Reed, Sam Mills'));
    await fireEvent.update(authorsInput(), 'Sam Mills, Alex Reed, ');
    await fireEvent.keyDown(authorsInput(), { key: 'Enter' });
    expect(screen.queryByRole('textbox', { name: 'Resource authors' })).toBeNull();
    await fireEvent.dblClick(screen.getByText('Alex Reed, Sam Mills'));
    await fireEvent.update(authorsInput(), 'Cancelled entry');
    await fireEvent.keyUp(authorsInput(), { key: 'Escape' });
    expect(screen.getByText('Alex Reed, Sam Mills')).toBeTruthy();
    expect(api.delete).not.toHaveBeenCalled();
  });
});
