import { test, expect } from './fixtures/electron-app';

test.describe('Offline IPC', () => {
  test('supports the complete offline storage lifecycle', async ({ window: page }) => {
    const result = await page.evaluate(async () => {
      const workspaceId = 'offline-ipc-test';
      const api = window.electronAPI;

      await api.offlinePutItem(
        workspaceId,
        'resource',
        42,
        { name: 'Offline resource' },
        '2026-08-28T10:00:00.000Z',
      );
      const item = await api.offlineGetItem(workspaceId, 'resource', 42);
      const items = await api.offlineGetAllItemsByWorkspace(workspaceId);

      await api.offlinePutFile(
        workspaceId,
        42,
        btoa('offline file'),
        'text/plain',
        '.txt',
      );
      const filePath = await api.offlineGetFilePath(workspaceId, 42);
      await api.offlineDeleteFile(workspaceId, 42);
      const deletedFilePath = await api.offlineGetFilePath(workspaceId, 42);

      await api.offlineAddPendingChange(
        workspaceId,
        'resource',
        42,
        'PATCH',
        { name: 'Updated resource' },
      );
      const pendingChanges = await api.offlineGetPendingChanges(workspaceId);
      const pendingCount = await api.offlineCountPendingChanges(workspaceId);
      await api.offlineClearPendingChanges(workspaceId);
      const clearedPendingCount = await api.offlineCountPendingChanges(workspaceId);

      const initialManifest = await api.offlineGetManifest(workspaceId);
      await api.offlineUpdateManifest(
        workspaceId,
        ['resource:42'],
        '2026-08-28T10:05:00.000Z',
      );
      const updatedManifest = await api.offlineGetManifest(workspaceId);

      await api.offlineDeleteItem(workspaceId, 'resource', 42);
      const deletedItem = await api.offlineGetItem(workspaceId, 'resource', 42);
      await api.offlineClearAll(workspaceId);

      return {
        item,
        itemCount: items.length,
        filePath,
        deletedFilePath,
        pendingChanges,
        pendingCount,
        clearedPendingCount,
        initialManifest,
        updatedManifest,
        deletedItem,
      };
    });

    expect(result.item).toMatchObject({
      workspaceId: 'offline-ipc-test',
      entityType: 'resource',
      entityId: 42,
      data: { name: 'Offline resource' },
    });
    expect(result.itemCount).toBe(1);
    expect(result.filePath).toMatch(/42\.txt$/);
    expect(result.deletedFilePath).toBeNull();
    expect(result.pendingChanges).toHaveLength(1);
    expect(result.pendingCount).toBe(1);
    expect(result.clearedPendingCount).toBe(0);
    expect(result.initialManifest).toEqual({ keys: [], lastSync: null });
    expect(result.updatedManifest).toEqual({
      keys: ['resource:42'],
      lastSync: '2026-08-28T10:05:00.000Z',
    });
    expect(result.deletedItem).toBeNull();
  });
});
