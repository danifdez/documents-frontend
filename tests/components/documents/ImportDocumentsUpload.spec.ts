import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ImportDocumentModal from '@/components/documents/ImportDocumentModal.vue';

const notification = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), warning: vi.fn() }));
vi.mock('@/composables/useNotification', () => ({ useNotification: () => notification }));
vi.mock('@/services/apiBase', () => ({ getApiBaseUrl: () => 'https://archive.example' }));
vi.mock('@/services/workspaceScope', () => ({ getAccessToken: () => 'fixture-token' }));

const button = (name: string) => screen.getByRole('button', { name });
const selectZone = () => screen.getByText('Click to select documents').parentElement!;
const uploaded = (name: string) => new File(['example content'], name, { type: 'text/plain' });

function openImporter(projectId = '8', threadId = '27') {
  const changed = vi.fn();
  const imported = vi.fn();
  render(ImportDocumentModal, {
    props: { modelValue: true, projectId, threadId, 'onUpdate:modelValue': changed, 'onDocuments:imported': imported },
  });
  return { changed, imported };
}

beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('bulk resource import', () => {
  it('uses Electron for picked desktop paths, skips duplicates, and reports each rejected file', async () => {
    const pick = vi.fn().mockResolvedValue([
      { path: '/test/a.pdf', name: 'a.pdf' },
      { path: '/test/a.pdf', name: 'a.pdf' },
      { path: '/test/remove.pdf', name: 'remove.pdf' },
      { path: '/test/missing.pdf', name: 'missing.pdf' },
      { path: '/test/unreadable.pdf', name: 'unreadable.pdf' },
    ]);
    const upload = vi.fn()
      .mockResolvedValueOnce({ resourceId: 11 })
      .mockResolvedValueOnce({ error: 'File no longer exists' })
      .mockRejectedValueOnce(new Error('Read failure'));
    vi.stubGlobal('electronAPI', { openMultipleFileDialog: pick, uploadDocument: upload });
    const { imported, changed } = openImporter();
    expect((button('Import Documents') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.click(selectZone());
    expect(await screen.findByRole('heading', { name: 'Selected Documents (4)' })).toBeTruthy();
    await fireEvent.click(within(screen.getByText('remove.pdf').closest('.border-b')!).getByTitle('Remove file'));
    await fireEvent.click(button('Import Documents'));
    await waitFor(() => expect(imported).toHaveBeenCalledTimes(1));
    expect(upload.mock.calls).toEqual([
      ['8', '/test/a.pdf'], ['8', '/test/missing.pdf'], ['8', '/test/unreadable.pdf'],
    ]);
    expect(notification.error).toHaveBeenCalledWith('Failed to import: missing.pdf', { title: 'File no longer exists' });
    expect(notification.error).toHaveBeenCalledWith('Error importing document: unreadable.pdf', { title: 'Read failure' });
    expect(notification.success).toHaveBeenCalledExactlyOnceWith('1 of 3 documents imported successfully');
    expect(notification.warning).toHaveBeenCalledExactlyOnceWith('2 documents could not be imported');
    expect(changed).toHaveBeenLastCalledWith(false);
  });

  it('uses a multipart request for browser file inputs with the chosen project and thread', async () => {
    vi.stubGlobal('electronAPI', undefined);
    const send = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ resourceId: 13 })))
      .mockResolvedValueOnce(new Response(null, { status: 413 }));
    vi.stubGlobal('fetch', send);
    const { imported } = openImporter();
    const input = screen.getByLabelText('Select Documents');
    await fireEvent.change(input, { target: { files: [uploaded('inventory.txt'), uploaded('large.txt')] } });
    expect(screen.getByRole('heading', { name: 'Selected Documents (2)' })).toBeTruthy();
    await fireEvent.click(button('Import Documents'));
    await waitFor(() => expect(imported).toHaveBeenCalledTimes(1));
    const [url, request] = send.mock.calls[0];
    expect(url).toBe('https://archive.example/resources/upload');
    expect(request.method).toBe('POST');
    expect(request.headers).toEqual({ Authorization: 'Bearer fixture-token' });
    expect(request.body.get('projectId')).toBe('8');
    expect(request.body.get('threadId')).toBe('27');
    expect(request.body.get('name')).toBe('inventory.txt');
    expect(request.body.get('file').name).toBe('inventory.txt');
    expect(notification.error).toHaveBeenCalledWith('Failed to import: large.txt', { title: 'Upload failed with status 413' });
  });

  it('reports an unavailable desktop picker and accepts files dropped within the zone', async () => {
    const pick = vi.fn().mockRejectedValue(new Error('Cannot open chooser'));
    vi.stubGlobal('electronAPI', { openMultipleFileDialog: pick });
    const send = vi.fn().mockRejectedValue(new Error('Connection closed'));
    vi.stubGlobal('fetch', send);
    openImporter('', '');

    const dropZone = selectZone();
    await fireEvent.click(dropZone);
    expect(notification.error).toHaveBeenCalledWith('Error selecting documents', expect.any(Object));
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(uploaded('dropped.txt'));
    await fireEvent.dragEnter(dropZone, { dataTransfer });
    expect(screen.getByText('Drop files here')).toBeTruthy();
    await fireEvent.dragLeave(dropZone, { dataTransfer });
    expect(screen.getByText('Click to select documents')).toBeTruthy();
    await fireEvent.drop(dropZone, { dataTransfer });
    expect(screen.getByText('dropped.txt')).toBeTruthy();
    await fireEvent.click(button('Import Documents'));
    await waitFor(() => expect(notification.error).toHaveBeenCalledWith('Failed to import: dropped.txt', {
      title: 'Failed to upload file via fetch: Connection closed',
    }));
    expect(send.mock.calls[0][1].body.has('projectId')).toBe(false);
    expect(send.mock.calls[0][1].body.has('threadId')).toBe(false);
  });
});
