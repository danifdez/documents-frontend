import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IpcChannels } from '@/ipc/channels';
import { createOfflineHandlers } from '@/main/ipc/offline-handlers';
import { getAllOfflineItemsByWorkspace, getOfflineItem, getManifest } from '@/services/offline/offlineDb';
import { downloadForOffline, removeFromOffline } from '@/services/offline/offlineService';
import { useOfflineStore } from '@/store/offlineStore';

const { getPath, invoke, api, notifications } = vi.hoisted(() => ({
  getPath: vi.fn(),
  invoke: vi.fn(),
  api: { get: vi.fn(), post: vi.fn(), defaults: { baseURL: 'http://backend.example' } },
  notifications: { warning: vi.fn(), success: vi.fn(), error: vi.fn() },
}));
vi.mock('electron', () => ({
  app: { getPath },
  ipcRenderer: { invoke, on: vi.fn() },
  contextBridge: { exposeInMainWorld: (key: string, value: unknown) => vi.stubGlobal(key, value) },
}));
vi.mock('@/services/api', () => ({ default: api }));
vi.mock('@/composables/useNotification', () => ({ useNotification: () => notifications }));

const workspaceId = 'archives';
const bundle = {
  project: { id: 7, name: 'Research Archive' },
  resources: [{ id: 11, name: 'Reference scan' }, { id: 12, name: 'Metadata' }],
  docs: [{ id: 21, name: 'Field notes' }],
  threads: [{ id: 32, name: 'Early research' }],
  comments: [{ id: 42, text: 'Check the original title' }],
  marks: [{ id: 51, label: 'First chapter' }],
  readingPoints: [{ id: 62, name: 'Footnotes' }],
  notes: [{ id: 71, title: 'Read bibliography' }],
  files: [
    { resourceId: 11, base64: Buffer.from('Scan contents').toString('base64'), mimeType: 'application/pdf' },
    { resourceId: 12, base64: Buffer.from('Other contents').toString('base64'), mimeType: 'application/octet-stream' },
  ],
  excludedFiles: [{ name: 'Large scan.pdf' }],
};
let userData: string;
let store: ReturnType<typeof useOfflineStore>;

beforeEach(async () => {
  vi.resetModules();
  vi.resetAllMocks();
  setActivePinia(createPinia());
  localStorage.clear();
  localStorage.setItem('activeWorkspaceId', workspaceId);
  userData = await mkdtemp(join(tmpdir(), 'documents-offline-'));
  getPath.mockReturnValue(userData);
  const handlers = createOfflineHandlers();
  invoke.mockImplementation(async (name: keyof typeof handlers, ...args) => {
    if (name === IpcChannels.voice.isAvailable) return false;
    const handle = handlers[name];
    if (!handle) throw new Error(`Unexpected channel ${name}`);
    return handle({} as never, ...args);
  });
  await import('@/preload');
  store = useOfflineStore();
});

afterEach(async () => {
  store?.stopRecoveryPoll();
  store?.stopBackgroundSync();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  await rm(userData, { recursive: true, force: true });
});

function mockBundle() {
  api.get.mockImplementation(async (path) => {
    if (path === '/offline/bundle/project/7') return { data: structuredClone(bundle) };
    throw new Error(`Unexpected GET ${path}`);
  });
}

describe('offline documents through the Electron bridge', () => {
  it('persists a project bundle, its files and its manifest across store instances', async () => {
    mockBundle();
    await store.loadOfflineState();
    expect(store.initialized).toBe(true);
    expect(store.offlineItemKeys.size).toBe(0);
    expect((await getManifest(workspaceId)).lastSync).toBeNull();
    await downloadForOffline('project', 7);
    expect(notifications.warning).toHaveBeenCalledExactlyOnceWith(
      'Saved 2 resource(s), 1 doc(s), 1 thread(s), 1 note(s), 2 file(s). 1 file(s) excluded (too large): Large scan.pdf.',
    );
    const all = await getAllOfflineItemsByWorkspace(workspaceId);
    expect(all.map(({ entityType }) => entityType).sort()).toEqual([
      'comment', 'doc', 'mark', 'note', 'project', 'reading-point', 'resource', 'resource', 'thread',
    ]);
    expect(all.every((item) => item.parentType === 'project' && item.parentId === 7)).toBe(true);

    const files = [await window.electronAPI.offlineGetFilePath(workspaceId, 11), await window.electronAPI.offlineGetFilePath(workspaceId, 12)];
    expect(files[0]).toMatch(/11\.pdf$/);
    expect(files[1]).toMatch(/12\.bin$/);
    expect(await readFile(files[0]!, 'utf-8')).toBe('Scan contents');
    expect(await readFile(files[1]!, 'utf-8')).toBe('Other contents');

    const reloaded = useOfflineStore(createPinia());
    await reloaded.loadOfflineState();
    expect(reloaded.offlineItemKeys).toEqual(new Set(['project:7', 'resource:11', 'resource:12', 'doc:21', 'thread:32', 'note:71']));
    expect((await getManifest(workspaceId)).lastSync).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(reloaded.isItemOffline('doc', 21)).toBe(true);
    expect(await window.electronAPI.offlineGetFilePath(workspaceId, 999)).toBeNull();
  });

  it('removes only the saved project, leaving another workspace and its file intact', async () => {
    mockBundle();
    await store.makeAvailableOffline('project', 7);
    const sibling = 'library';
    await window.electronAPI.offlinePutItem(sibling, 'resource', 11, { id: 11, name: 'Library scan' }, '2026-01-01');
    await window.electronAPI.offlinePutFile(sibling, 11, bundle.files[0].base64, 'application/pdf', '.pdf');
    localStorage.setItem('activeWorkspaceId', workspaceId);

    await removeFromOffline('project', 7);
    expect(await getAllOfflineItemsByWorkspace(workspaceId)).toEqual([]);
    expect(await getManifest(workspaceId)).toMatchObject({ keys: [] });
    expect(await window.electronAPI.offlineGetFilePath(workspaceId, 11)).toBeNull();
    expect(await getOfflineItem(sibling, 'resource', 11)).toMatchObject({ data: { name: 'Library scan' } });
    expect(await window.electronAPI.offlineGetFilePath(sibling, 11)).toMatch(/11\.pdf$/);

    await window.electronAPI.offlineClearAll(sibling);
    expect(await getAllOfflineItemsByWorkspace(sibling)).toEqual([]);
    expect(await window.electronAPI.offlineGetFilePath(sibling, 11)).toBeNull();
  });

  it('ignores damaged entries and unrelated files while reading the offline directory', async () => {
    mockBundle();
    await store.makeAvailableOffline('project', 7);
    const items = join(userData, 'offline-data', workspaceId, 'items');
    await writeFile(join(items, 'unrelated.txt'), 'temporary');
    await writeFile(join(items, 'resource', 'trash.txt'), 'temporary');
    await writeFile(join(items, 'resource', '11.json'), '{broken');

    expect(await getOfflineItem(workspaceId, 'resource', 11)).toBeNull();
    expect((await getAllOfflineItemsByWorkspace(workspaceId)).map(({ data }) => data.name)).toContain('Metadata');
    expect(await window.electronAPI.offlineDeleteFile(workspaceId, 333)).toBeUndefined();
    expect(await window.electronAPI.offlineDeleteItem(workspaceId, 'resource', 333)).toBeUndefined();
  });

  it('queues optimistic edits and replays them after reconnection, handling conflicts and pulling project changes', async () => {
    mockBundle();
    await store.makeAvailableOffline('project', 7);
    const { lastSync: checkpoint } = await getManifest(workspaceId);
    await store.addPendingChange('doc', 21, 'PATCH', { name: 'Offline title' });
    await store.addPendingChange('doc', 99, 'DELETE', {});
    expect(store.pendingChangeCount).toBe(2);
    expect(await getOfflineItem(workspaceId, 'doc', 21)).toMatchObject({
      parentId: 7, data: { id: 21, name: 'Offline title' },
    });
    const pending = await window.electronAPI.offlineGetPendingChanges(workspaceId);
    expect(pending).toHaveLength(2);

    const serverDoc = { id: 21, name: 'Server title' };
    api.post.mockResolvedValue({ data: { results: [
      { status: 'conflict', entityType: 'doc', entityId: 21, serverData: serverDoc },
      { status: 'ok', entityType: 'doc', entityId: 99 },
    ] } });
    api.get.mockResolvedValue({ data: {
      resources: [{ id: 11, name: 'Updated scan' }],
      docs: [{ id: 22, name: 'New note' }],
      threads: [{ id: 32, name: 'Updated research' }],
      comments: [{ id: 42, text: 'Updated comment' }],
      marks: [{ id: 51, label: 'Updated mark' }],
      readingPoints: [{ id: 62, name: 'Updated point' }],
      notes: [{ id: 71, title: 'Updated reminder' }],
    } });
    await store.syncOnReconnect();

    expect(api.post).toHaveBeenCalledExactlyOnceWith('/offline/sync', {
      changes: pending.map(({ entityType, entityId, method, payload, timestamp }) => ({
        entityType, entityId, method, payload, updatedAt: timestamp,
      })),
    });
    expect(api.get).toHaveBeenLastCalledWith('/offline/changes', { params: { projectId: 7, since: checkpoint } });
    expect(store.pendingChangeCount).toBe(0);
    expect(await window.electronAPI.offlineCountPendingChanges(workspaceId)).toBe(0);
    expect(await getOfflineItem(workspaceId, 'doc', 21)).toMatchObject({ data: serverDoc });
    expect(await getOfflineItem(workspaceId, 'reading-point', 62)).toMatchObject({ data: { name: 'Updated point' } });
    expect(store.isSyncing).toBe(false);
  });

  it('preserves queued changes if synchronization fails and keeps the queue scoped to that workspace', async () => {
    const logging = vi.spyOn(console, 'error').mockImplementation(() => {});
    await store.addPendingChange('doc', 91, 'PATCH', { name: 'Unsent change' });
    api.post.mockRejectedValueOnce(new Error('Network offline'));
    await store.syncOnReconnect();
    expect(logging).toHaveBeenCalledWith('Sync failed:', expect.any(Error));
    expect(await window.electronAPI.offlineCountPendingChanges(workspaceId)).toBe(1);
    expect(store.isSyncing).toBe(false);

    localStorage.setItem('activeWorkspaceId', 'library');
    const reloaded = useOfflineStore(createPinia());
    await reloaded.loadOfflineState();
    expect(reloaded.pendingChangeCount).toBe(0);
    expect(reloaded.offlineItemKeys.size).toBe(0);
  });

  it('reports a download failure and can immediately retry an empty bundle', async () => {
    api.get.mockRejectedValueOnce({ response: { data: { message: 'Access denied' } } }).mockResolvedValueOnce({ data: {} });
    await expect(downloadForOffline('resource', 113)).rejects.toBeTruthy();
    expect(notifications.error).toHaveBeenCalledWith('Access denied');
    expect(store.isItemOffline('resource', 113)).toBe(false);
    await downloadForOffline('resource', 113);
    expect(store.isItemOffline('resource', 113)).toBe(true);
    expect(notifications.success).toHaveBeenCalledWith('Saved offline: content');
  });

  it('backs off recovery polling after another failure and stops polling after reconnecting', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true });
    vi.stubGlobal('fetch', fetch);
    await expect(store.probeBackend()).resolves.toBe(false);
    expect(store.isOnline).toBe(false);
    await vi.advanceTimersByTimeAsync(9_999);
    expect(fetch).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(store.isOnline).toBe(true);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenCalledWith('http://backend.example/auth/status', {
      method: 'GET', signal: expect.any(AbortSignal),
    });
  });
});
