import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WorkingFolderPanel from '@/components/assistant/WorkingFolderPanel.vue';
import type { IndexedFile } from '@/services/indexedFiles/useIndexedFiles';

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
vi.mock('@/services/api', () => ({ default: api }));

const base = '/assistants/12/indexed-files';
const now = Date.UTC(2025, 4, 2, 12);
const notes: IndexedFile = {
  id: 20, filename: 'notes.MD', filePath: '/test/archive/notes.MD', mimeType: 'text/markdown', size: 48,
  mtime: new Date(now).toISOString(), createdAt: '', updatedAt: '', hasExtractedText: true,
};
function file(id: number, filename: string, size: number, minutes: number): IndexedFile {
  return { ...notes, id, filename, size, mtime: new Date(now - minutes * 60000).toISOString(), hasExtractedText: null };
}
const pdf = file(21, 'catalogue.pdf', 2 * 1024 * 1024, 61);
const manifest = file(22, 'manifest.json', 1536, 6);
const image = file(23, 'photo.png', 2048, 60 * 25);
const uploaded = file(24, 'sample.csv', 3584, 1);

const initialProps = { show: true, ownerType: 'assistant' as const, ownerId: 12, folderScope: '/test/archive' };
const button = (name: string) => screen.getByRole('button', { name });
const fileRow = (filename: string) => within(screen.getByTitle(filename).parentElement!.parentElement!);
const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;
let list: IndexedFile[];

async function openFolder() {
  const view = render(WorkingFolderPanel, { props: initialProps });
  await screen.findByTitle(notes.filename);
  return view;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(Date, 'now').mockReturnValue(now);
  list = [notes, pdf, manifest, image];
  api.get.mockImplementation(async (url: string) => {
    if ([base, '/agents/15/indexed-files'].includes(url)) return { data: [...list] };
    if (url === `${base}/20/content`) return { data: { content: 'Original note' } };
    throw new Error(`Unexpected GET ${url}`);
  });
  api.post.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({ data: {} });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('assistant working folder', () => {
  it('prompts for setup and removes file actions when the working folder is unset', async () => {
    const view = render(WorkingFolderPanel, { props: { ...initialProps, folderScope: null } });
    expect(screen.getByText(/Choose a working folder/)).toBeTruthy();
    expect(screen.queryByTitle('Create text file')).toBeNull();
    expect(api.get).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByTitle('Close'));
    expect(view.emitted()['update:show']).toEqual([[false]]);
  });

  it('lists indexed files with their sizes and relative modification times', async () => {
    await openFolder();
    expect(screen.getByText('4 files · create or drop files')).toBeTruthy();
    expect(fileRow(notes.filename).getByText('48 B')).toBeTruthy();
    expect(fileRow(notes.filename).getByText('just now')).toBeTruthy();
    expect(fileRow(pdf.filename).getByText('2.0 MB')).toBeTruthy();
    expect(fileRow(pdf.filename).getByText('1 h ago')).toBeTruthy();
    expect(fileRow(pdf.filename).getByText(/Indexing/)).toBeTruthy();
    expect(fileRow(manifest.filename).getByText('1.5 KB')).toBeTruthy();
    expect(fileRow(manifest.filename).getByText('6 min ago')).toBeTruthy();
    expect(fileRow(image.filename).getByText('1 d ago')).toBeTruthy();
    expect(fileRow(pdf.filename).queryByTitle(`Edit ${pdf.filename}`)).toBeNull();
  });

  it('scans the folder and reloads the index for the selected conversation owner', async () => {
    const view = await openFolder();
    list = [];
    await view.rerender({ ownerType: 'agent', ownerId: 15 });
    expect(await screen.findByText(/No files yet/)).toBeTruthy();
    api.post.mockImplementationOnce(async () => {
      list = [uploaded];
      return { data: { status: 'done', added: 1 } };
    });
    await fireEvent.click(screen.getByTitle('Rescan folder'));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/agents/15/indexed-files/reconcile');
    expect(await screen.findByTitle(uploaded.filename)).toBeTruthy();
    expect(screen.getByText('1 file · create or drop files')).toBeTruthy();
  });

  it('validates filenames and creates a UTF-8 file without overwriting existing data', async () => {
    await openFolder();
    await fireEvent.click(screen.getByTitle('Create text file'));
    await fireEvent.click(button('Create'));
    expect(screen.getByText('Enter a filename.')).toBeTruthy();
    await fireEvent.update(field('Filename'), 'picture.png');
    await fireEvent.click(button('Create'));
    expect(screen.getByText('Use a supported UTF-8 text file extension.')).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();

    api.post.mockImplementationOnce(async () => {
      list.push(uploaded);
      return { data: uploaded };
    });
    await fireEvent.update(field('Filename'), ' sample.csv ');
    await fireEvent.update(field('Content'), 'name,value\nbook,1');
    await fireEvent.click(button('Create'));
    expect(api.post).toHaveBeenCalledExactlyOnceWith(base, {
      filename: 'sample.csv', content: 'name,value\nbook,1', overwrite: false,
    });
    expect(await screen.findByTitle(uploaded.filename)).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Create text file' })).toBeNull());
  });

  it('loads an editable file, keeps its filename read-only, and submits the changed content', async () => {
    await openFolder();
    await fireEvent.click(screen.getByTitle(`Edit ${notes.filename}`));
    const content = await screen.findByLabelText('Content') as HTMLTextAreaElement;
    expect(api.get).toHaveBeenCalledWith(`${base}/20/content`);
    expect(field('Filename').readOnly).toBe(true);
    expect(content.value).toBe('Original note');
    await fireEvent.update(content, 'Updated note');
    api.post.mockRejectedValueOnce({ response: { data: { error: 'Could not lock notes.MD' } } });
    await fireEvent.click(button('Save'));
    expect(await screen.findByText('Could not lock notes.MD')).toBeTruthy();
    expect(content.value).toBe('Updated note');

    await fireEvent.click(button('Save'));
    expect(api.post).toHaveBeenLastCalledWith(base, { filename: notes.filename, content: 'Updated note', overwrite: true });
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Edit text file' })).toBeNull());
  });

  it.each([
    { response: { data: { derivedFromExtraction: true, content: 'extracted' } }, expected: 'This file can only be edited in its native application.' },
    { response: new Error('Read failed'), expected: 'Read failed' },
  ])('reports unavailable file content as $expected', async ({ response, expected }) => {
    await openFolder();
    if (response instanceof Error) api.get.mockRejectedValueOnce(response);
    else api.get.mockResolvedValueOnce(response);
    await fireEvent.click(screen.getByTitle(`Edit ${notes.filename}`));
    expect(await screen.findByText(expected)).toBeTruthy();
    await fireEvent.click(button('Cancel'));
    expect(screen.queryByRole('heading', { name: 'Edit text file' })).toBeNull();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('uploads a dropped file and reloads the indexed list', async () => {
    await openFolder();
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File(['row,value'], uploaded.filename, { type: 'text/csv' }));
    api.post.mockImplementationOnce(async () => {
      list.push(uploaded);
      return { data: uploaded };
    });
    const panel = screen.getByRole('complementary');
    await fireEvent.dragOver(panel, { dataTransfer });
    expect(screen.getByText('Drop to add to the working folder')).toBeTruthy();
    await fireEvent.drop(panel, { dataTransfer });
    const [[url, payload]] = api.post.mock.calls as [[string, FormData]];
    expect(url).toBe(`${base}/upload`);
    expect(payload.get('filename')).toBe(uploaded.filename);
    expect(payload.get('file')).toMatchObject({ size: 9, type: 'text/csv' });
    expect(await screen.findByTitle(uploaded.filename)).toBeTruthy();
  });

  it('opens a file through the desktop bridge, surfaces an error, and reveals the file in its folder', async () => {
    const openPath = vi.fn().mockResolvedValue({ ok: false, error: 'No application configured' });
    const showItemInFolder = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('shellOps', { openPath, showItemInFolder });
    const notify = vi.fn();
    vi.stubGlobal('alert', notify);
    await openFolder();
    await fireEvent.click(fileRow(notes.filename).getByTitle('Open file'));
    expect(openPath).toHaveBeenCalledExactlyOnceWith(notes.filePath);
    expect(notify).toHaveBeenCalledExactlyOnceWith('No application configured');
    await fireEvent.click(fileRow(notes.filename).getByTitle('Show in folder'));
    expect(showItemInFolder).toHaveBeenCalledExactlyOnceWith(notes.filePath);
  });

  it('deletes only the file named in the confirmation', async () => {
    await openFolder();
    await fireEvent.click(fileRow(pdf.filename).getByTitle('Delete file'));
    expect(screen.getByRole('heading', { name: 'Delete file?' }).parentElement?.querySelector('code')?.textContent).toBe(pdf.filename);
    await fireEvent.click(button('Cancel'));
    expect(api.delete).not.toHaveBeenCalled();
    await fireEvent.click(fileRow(pdf.filename).getByTitle('Delete file'));
    await fireEvent.click(button('Delete'));
    expect(api.delete).toHaveBeenCalledExactlyOnceWith(`${base}/21`);
    await waitFor(() => expect(screen.queryByTitle(pdf.filename)).toBeNull());
    expect(screen.getByTitle(notes.filename)).toBeTruthy();
  });
});
