import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ImportDocumentModal from '@/components/documents/ImportDocumentModal.vue';

const { notification } = vi.hoisted(() => ({
  notification: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
}));
vi.mock('@/composables/useNotification', () => ({ useNotification: () => notification }));
vi.mock('@/services/apiBase', () => ({ getApiBaseUrl: () => 'https://workspace.example' }));
vi.mock('@/services/workspaceScope', () => ({ getAccessToken: () => 'fake-test-token' }));

const open = vi.fn();
const upload = vi.fn();
const fetch = vi.fn();
const button = (name: string) => screen.getByRole('button', { name });
const dropTarget = () => screen.getByText('Click to select documents');
const select = () => fireEvent.click(dropTarget());
const file = (name: string) => new File(['%PDF-1.5'], name, { type: 'application/pdf' });
const desktopPath = (name: string) => ({ path: '/test/files/' + name, name });

function dialog(projectId = '12', threadId = '14') {
  return render(ImportDocumentModal, { props: { modelValue: true, projectId, threadId } });
}

function transfer(...files: File[]) {
  const dataTransfer = new DataTransfer();
  for (const item of files) dataTransfer.items.add(item);
  return dataTransfer;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('fetch', fetch);
  vi.stubGlobal('electronAPI', undefined);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('document imports', () => {
  it('deduplicates desktop selections, removes a selected file and tracks progress during import', async () => {
    const one = desktopPath('Register.pdf');
    const two = desktopPath('Loan.pdf');
    const remove = desktopPath('Leave out.pdf');
    open.mockResolvedValueOnce([one, two, remove]).mockResolvedValueOnce([one]);
    const pending = Promise.withResolvers<{ resourceId: number }>();
    upload.mockReturnValueOnce(pending.promise).mockResolvedValueOnce({ resourceId: 62 });
    vi.stubGlobal('electronAPI', { openMultipleFileDialog: open, uploadDocument: upload });
    const view = dialog();
    expect((button('Import Documents') as HTMLButtonElement).disabled).toBe(true);
    await select();
    await select();
    expect(screen.getByRole('heading', { name: 'Selected Documents (3)' })).toBeTruthy();
    const row = screen.getByText(remove.name).parentElement!.parentElement!;
    await fireEvent.click(within(row).getByTitle('Remove file'));
    expect(screen.queryByText(remove.name)).toBeNull();
    await fireEvent.click(button('Import Documents'));
    expect(await screen.findByText(/Processing documents.*1\/2/)).toBeTruthy();
    expect(upload.mock.calls).toEqual([['12', one.path], ['12', two.path]]);
    expect(fetch).not.toHaveBeenCalled();
    pending.resolve({ resourceId: 61 });
    await waitFor(() => expect(notification.success).toHaveBeenCalledWith('2 of 2 documents imported successfully'));
    expect(view.emitted()['documents:imported']).toEqual([[]]);
    expect(view.emitted()['update:modelValue']).toEqual([[false]]);
  });

  it('reports both thrown and returned desktop upload errors while retaining the success count', async () => {
    const good = desktopPath('Complete.pdf');
    const returned = desktopPath('Denied.pdf');
    const rejected = desktopPath('Missing.pdf');
    open.mockResolvedValue([good, returned, rejected]);
    upload.mockResolvedValueOnce({ resourceId: 11 }).mockResolvedValueOnce({ error: 'Unsupported format' })
      .mockRejectedValueOnce(new Error('File disappeared'));
    vi.stubGlobal('electronAPI', { openMultipleFileDialog: open, uploadDocument: upload });
    const view = dialog('', '');
    await select();
    await fireEvent.click(button('Import Documents'));
    expect(upload).toHaveBeenCalledWith(null, good.path);
    await waitFor(() => expect(notification.warning).toHaveBeenCalledWith('2 documents could not be imported'));
    expect(notification.success).toHaveBeenCalledWith('1 of 3 documents imported successfully');
    expect(notification.error).toHaveBeenCalledWith('Failed to import: Denied.pdf', { title: 'Unsupported format' });
    expect(notification.error).toHaveBeenCalledWith('Error importing document: Missing.pdf', { title: 'File disappeared' });
    expect(view.emitted()['documents:imported']).toEqual([[]]);
  });

  it('imports dropped browser files with the selected project, thread and session header', async () => {
    const dataTransfer = transfer(file('register.pdf'));
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ resourceId: 41 }) });
    const view = dialog();
    const target = dropTarget();
    await fireEvent.dragOver(target, { dataTransfer });
    expect(screen.getByText('Drop files here')).toBeTruthy();
    await fireEvent.drop(target, { dataTransfer });
    expect(screen.getByText('register.pdf')).toBeTruthy();
    await fireEvent.click(button('Import Documents'));
    const [url, options] = fetch.mock.calls[0] as [string, { method: string; headers: Record<string, string>; body: FormData }];
    expect(url).toBe('https://workspace.example/resources/upload');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ Authorization: 'Bearer fake-test-token' });
    expect(options.body.get('name')).toBe('register.pdf');
    expect(options.body.get('projectId')).toBe('12');
    expect(options.body.get('threadId')).toBe('14');
    expect(options.body.get('file')).toMatchObject({ type: 'application/pdf', size: 8 });
    await waitFor(() => expect(view.emitted()['documents:imported']).toEqual([[]]));
  });

  it('uses the browser file picker when the desktop dialog is unavailable and reports an HTTP failure', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 413 });
    dialog('', '');
    const input = screen.getByLabelText('Select Documents') as HTMLInputElement;
    const clicked = vi.spyOn(input, 'click').mockImplementation(() => {});
    await select();
    expect(clicked).toHaveBeenCalledOnce();
    await fireEvent.change(input, { target: { files: [file('Oversized.pdf')] } });
    await fireEvent.click(button('Import Documents'));
    await waitFor(() => expect(notification.warning).toHaveBeenCalledWith('1 documents could not be imported'));
    expect(notification.error).toHaveBeenCalledWith('Failed to import: Oversized.pdf', { title: 'Upload failed with status 413' });
    const { body } = fetch.mock.calls[0][1] as { body: FormData };
    expect(body.has('projectId')).toBe(false);
    expect(body.has('threadId')).toBe(false);
  });

  it('keeps the dialog usable when the native file picker fails', async () => {
    open.mockRejectedValueOnce(new Error('Picker unavailable'));
    vi.stubGlobal('electronAPI', { openMultipleFileDialog: open, uploadDocument: upload });
    const view = dialog();
    await select();
    await waitFor(() => expect(notification.error).toHaveBeenCalledWith('Error selecting documents', {
      title: 'There was a problem selecting documents',
    }));
    await fireEvent.click(button('Cancel'));
    expect(view.emitted()['update:modelValue']).toEqual([[false]]);
    expect(upload).not.toHaveBeenCalled();
  });
});
