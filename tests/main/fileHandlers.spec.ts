// @vitest-environment node
import axios from 'axios';
import type FormData from 'form-data';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron';
import { IpcChannels } from '@/ipc/channels';
import { createFileHandlers } from '@/main/ipc/file-handlers';

const desktop = vi.hoisted(() => ({ focus: vi.fn(), pick: vi.fn(), open: vi.fn(), show: vi.fn(), read: vi.fn() }));
vi.mock('electron', () => ({
  BrowserWindow: { getFocusedWindow: desktop.focus },
  dialog: { showOpenDialog: desktop.pick },
  shell: { openPath: desktop.open, showItemInFolder: desktop.show },
}));
vi.mock('node:fs', async (original) => {
  const fs = await original<typeof import('node:fs') & { default: typeof import('node:fs') }>();
  return { ...fs, default: { ...fs.default, createReadStream: desktop.read } };
});

const event = {} as IpcMainInvokeEvent;
const mainWindow = {} as BrowserWindow;
const handlers = (fallback = true) => createFileHandlers({
  getApiUrl: () => 'http://fixture.example', getMainWindow: () => fallback ? mainWindow : null,
});

beforeEach(() => {
  vi.resetAllMocks();
  desktop.read.mockImplementation(() => Readable.from(['fixture content']));
  desktop.pick.mockResolvedValue({ canceled: false, filePaths: ['/test/selected'] });
  desktop.open.mockResolvedValue('');
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('Electron file actions', () => {
  it.each([
    ['/test/Study.PDF', 'application/pdf', '12'],
    ['/test/cover.png', 'image/png', null],
    ['/test/scan.unknown', 'application/octet-stream', null],
  ])('uploads the selected %s with its name, type and optional project', async (file, mimeType, project) => {
    const send = vi.spyOn(axios, 'post').mockResolvedValue({ data: { resourceId: 71 } });
    const result = await handlers()[IpcChannels.document.upload](event, project, file);
    expect(result).toEqual({ resourceId: 71 });
    expect(desktop.read).toHaveBeenCalledExactlyOnceWith(file);
    const [url, body, config] = send.mock.calls[0];
    const form = body as FormData;
    expect(url).toBe('http://fixture.example/resources/upload');
    expect(config?.headers?.['content-type']).toMatch(/^multipart\/form-data; boundary=/);
    const encoded = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      form.on('data', (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)));
      form.on('end', () => resolve(Buffer.concat(chunks).toString()));
      form.on('error', reject);
      form.resume();
    });
    expect(encoded).toContain(`filename="${file.split('/').at(-1)}"`);
    expect(encoded).toContain(`Content-Type: ${mimeType}`);
    if (project) expect(encoded).toContain(`name="projectId"\r\n\r\n${project}`);
    else expect(encoded).not.toContain('name="projectId"');
  });

  it('validates an empty upload path and reports a failure from the API', async () => {
    const send = vi.spyOn(axios, 'post').mockRejectedValue(new Error('Upload unavailable'));
    const upload = handlers()[IpcChannels.document.upload];
    expect(await upload(event, null, '')).toEqual({ error: 'No file path provided' });
    expect(send).not.toHaveBeenCalled();
    expect(await upload(event, null, '/test/readme.txt')).toEqual({ error: 'Failed to process document: Upload unavailable' });
  });

  it('handles validation and propagates desktop status for opening and revealing a selected file', async () => {
    const operations = handlers();
    const open = operations[IpcChannels.shell.openPath];
    expect(await open(event, '')).toEqual({ ok: false, error: 'invalid_path' });
    expect(desktop.open).not.toHaveBeenCalled();
    expect(await open(event, '/test/review.pdf')).toEqual({ ok: true });
    desktop.open.mockResolvedValueOnce('File is missing').mockRejectedValueOnce(new Error('Unable to open file'));
    expect(await open(event, '/test/missing.pdf')).toEqual({ ok: false, error: 'File is missing' });
    expect(await open(event, '/test/review.pdf')).toEqual({ ok: false, error: 'Unable to open file' });
    const reveal = operations[IpcChannels.shell.showItemInFolder];
    expect(reveal(event, null)).toEqual({ ok: false });
    expect(reveal(event, '/test/review.pdf')).toEqual({ ok: true });
    desktop.show.mockImplementationOnce(() => { throw new Error('File unavailable'); });
    expect(reveal(event, '/test/missing.pdf')).toEqual({ ok: false });
  });

  it('attaches a folder picker to the focused window, uses a fallback, and handles cancelled selections', async () => {
    const focused = { focused: true };
    desktop.focus.mockReturnValueOnce(focused);
    expect(await handlers()[IpcChannels.folderScope.pick](event, { title: 'Select the archive' })).toBe('/test/selected');
    expect(desktop.pick).toHaveBeenLastCalledWith(focused, {
      title: 'Select the archive', properties: ['openDirectory', 'createDirectory'],
    });
    desktop.pick.mockResolvedValueOnce({ canceled: true, filePaths: [] });
    expect(await handlers()[IpcChannels.folderScope.pick](event)).toBeNull();
    expect(desktop.pick).toHaveBeenLastCalledWith(mainWindow, expect.objectContaining({ title: 'Pick the working folder' }));
    desktop.pick.mockResolvedValueOnce({ canceled: false, filePaths: [] });
    expect(await handlers(false)[IpcChannels.folderScope.pick](event)).toBeNull();
    expect(desktop.pick.mock.lastCall).toHaveLength(1);
  });

  it('maps the selected upload paths to names and supplies extension filters to the chooser', async () => {
    const pick = handlers()[IpcChannels.document.openMultipleFileDialog];
    desktop.pick.mockResolvedValueOnce({ canceled: false, filePaths: ['/test/meeting.ogg', '/test/records.pdf'] });
    expect(await pick(event)).toEqual([
      { path: '/test/meeting.ogg', name: 'meeting.ogg' },
      { path: '/test/records.pdf', name: 'records.pdf' },
    ]);
    expect(desktop.pick).toHaveBeenLastCalledWith(expect.objectContaining({
      properties: ['openFile', 'multiSelections'],
      filters: expect.arrayContaining([expect.objectContaining({ name: 'Audio', extensions: expect.arrayContaining(['ogg']) })]),
    }));
    desktop.pick.mockResolvedValueOnce({ canceled: true, filePaths: [] });
    expect(await pick(event)).toEqual([]);
  });
});
