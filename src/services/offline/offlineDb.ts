// Offline storage via Electron filesystem (IPC to main process)
// Same exported API as before — consumers don't need to change.

// ── Offline Items ──

export async function getOfflineItem(wsId: string, type: string, id: number) {
  return window.electronAPI.offlineGetItem(wsId, type, id);
}

export async function putOfflineItem(
  wsId: string, type: string, id: number, data: any,
  syncedAt: string, parentType?: string, parentId?: number,
) {
  await window.electronAPI.offlinePutItem(wsId, type, id, data, syncedAt, parentType, parentId);
}

export async function deleteOfflineItem(wsId: string, type: string, id: number) {
  await window.electronAPI.offlineDeleteItem(wsId, type, id);
}

export async function getAllOfflineKeys(wsId: string): Promise<string[]> {
  const manifest = await window.electronAPI.offlineGetManifest(wsId);
  return manifest.keys;
}

export async function getAllOfflineItemsByWorkspace(wsId: string) {
  return window.electronAPI.offlineGetAllItemsByWorkspace(wsId);
}

export async function clearAllOfflineData(wsId: string) {
  await window.electronAPI.offlineClearAll(wsId);
}

// ── Offline Files ──

export async function putOfflineFile(wsId: string, resourceId: number, base64Data: string, mimeType: string, ext: string) {
  await window.electronAPI.offlinePutFile(wsId, resourceId, base64Data, mimeType, ext);
}

export async function getOfflineFilePath(wsId: string, resourceId: number): Promise<string | null> {
  return window.electronAPI.offlineGetFilePath(wsId, resourceId);
}

export async function deleteOfflineFile(wsId: string, resourceId: number) {
  await window.electronAPI.offlineDeleteFile(wsId, resourceId);
}

// ── Pending Changes ──

export async function addPendingChange(
  wsId: string, entityType: string, entityId: number,
  method: 'PATCH' | 'POST' | 'DELETE', payload: Record<string, any>,
) {
  await window.electronAPI.offlineAddPendingChange(wsId, entityType, entityId, method, payload);
}

export async function getAllPendingChanges(wsId: string) {
  return window.electronAPI.offlineGetPendingChanges(wsId);
}

export async function countPendingChanges(wsId: string): Promise<number> {
  return window.electronAPI.offlineCountPendingChanges(wsId);
}

export async function clearPendingChanges(wsId: string) {
  await window.electronAPI.offlineClearPendingChanges(wsId);
}

// ── Manifest ──

export async function getManifest(wsId: string): Promise<{ keys: string[]; lastSync: string | null }> {
  return window.electronAPI.offlineGetManifest(wsId);
}

export async function updateManifest(wsId: string, keys: string[], lastSync: string | null) {
  await window.electronAPI.offlineUpdateManifest(wsId, keys, lastSync);
}
