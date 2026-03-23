import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '../services/api';
import {
  putOfflineItem,
  putOfflineFile,
  deleteOfflineItem,
  deleteOfflineFile,
  getAllOfflineItemsByWorkspace,
  getAllPendingChanges,
  addPendingChange as dbAddPendingChange,
  clearPendingChanges,
  countPendingChanges,
  getOfflineItem,
  getManifest,
  updateManifest,
} from '../services/offline/offlineDb';

const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'text/html': '.html',
  'text/plain': '.txt',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'audio/mpeg': '.mp3',
  'video/mp4': '.mp4',
};

function extFromMime(mime: string): string {
  return MIME_TO_EXT[mime] || '.bin';
}

export const useOfflineStore = defineStore('offline', () => {
  const offlineEnabled = ref(false);
  const isOnline = ref(true);
  const isSyncing = ref(false);
  const pendingChangeCount = ref(0);
  const offlineItemKeys = ref<Set<string>>(new Set());
  const lastSyncTimestamp = ref<string | null>(null);
  const initialized = ref(false);
  let syncInterval: ReturnType<typeof setInterval> | null = null;

  function getWsId(): string {
    return localStorage.getItem('activeWorkspaceId') || 'default';
  }

  async function persistManifest() {
    const wsId = getWsId();
    await updateManifest(wsId, [...offlineItemKeys.value], lastSyncTimestamp.value);
  }

  async function checkOfflineEnabled() {
    try {
      const { data } = await apiClient.get('/auth/status');
      offlineEnabled.value = data.offlineEnabled === true;
    } catch {
      // If we can't reach server, keep previous value
    }
  }

  async function loadOfflineState() {
    const wsId = getWsId();
    const manifest = await getManifest(wsId);
    offlineItemKeys.value = new Set(manifest.keys);
    lastSyncTimestamp.value = manifest.lastSync;
    pendingChangeCount.value = await countPendingChanges(wsId);
    initialized.value = true;
  }

  function isItemOffline(type: string, id: number): boolean {
    return offlineItemKeys.value.has(`${type}:${id}`);
  }

  async function makeAvailableOffline(type: 'resource' | 'thread' | 'project', id: number) {
    const wsId = getWsId();
    const { data: bundle } = await apiClient.get(`/offline/bundle/${type}/${id}`);
    const now = new Date().toISOString();

    // Store project from bundle
    if (bundle.project) {
      await putOfflineItem(wsId, 'project', bundle.project.id, bundle.project, now, type, id);
      offlineItemKeys.value.add(`project:${bundle.project.id}`);
    }

    // Store all entities from bundle
    for (const r of bundle.resources || []) {
      await putOfflineItem(wsId, 'resource', r.id, r, now, type, id);
      offlineItemKeys.value.add(`resource:${r.id}`);
    }
    for (const d of bundle.docs || []) {
      await putOfflineItem(wsId, 'doc', d.id, d, now, type, id);
      offlineItemKeys.value.add(`doc:${d.id}`);
    }
    for (const t of bundle.threads || []) {
      await putOfflineItem(wsId, 'thread', t.id, t, now, type, id);
      offlineItemKeys.value.add(`thread:${t.id}`);
    }
    for (const c of bundle.comments || []) {
      await putOfflineItem(wsId, 'comment', c.id, c, now, type, id);
    }
    for (const m of bundle.marks || []) {
      await putOfflineItem(wsId, 'mark', m.id, m, now, type, id);
    }
    for (const n of bundle.notes || []) {
      await putOfflineItem(wsId, 'note', n.id, n, now, type, id);
      offlineItemKeys.value.add(`note:${n.id}`);
    }

    // Store files — pass base64 directly to filesystem
    for (const f of bundle.files || []) {
      const ext = extFromMime(f.mimeType || 'application/octet-stream');
      await putOfflineFile(wsId, f.resourceId, f.base64, f.mimeType, ext);
    }

    // Mark the parent item itself
    offlineItemKeys.value.add(`${type}:${id}`);

    // Persist manifest to disk
    lastSyncTimestamp.value = now;
    await persistManifest();

    const savedCounts = {
      projects: bundle.project ? 1 : 0,
      resources: (bundle.resources || []).length,
      docs: (bundle.docs || []).length,
      threads: (bundle.threads || []).length,
      comments: (bundle.comments || []).length,
      marks: (bundle.marks || []).length,
      notes: (bundle.notes || []).length,
      files: (bundle.files || []).length,
    };

    return { excludedFiles: bundle.excludedFiles || [], savedCounts };
  }

  async function removeOffline(type: string, id: number) {
    const wsId = getWsId();

    // Find and remove all child items that were saved with this parent
    const allItems = await getAllOfflineItemsByWorkspace(wsId);
    for (const item of allItems) {
      if (item.parentType === type && item.parentId === id) {
        await deleteOfflineItem(wsId, item.entityType, item.entityId);
        offlineItemKeys.value.delete(`${item.entityType}:${item.entityId}`);

        if (item.entityType === 'resource') {
          await deleteOfflineFile(wsId, item.entityId);
        }
      }
    }

    // Remove the parent key itself
    offlineItemKeys.value.delete(`${type}:${id}`);
    await deleteOfflineItem(wsId, type, id);

    // Persist manifest
    await persistManifest();
  }

  async function addPendingChange(
    entityType: string, entityId: number,
    method: 'PATCH' | 'POST' | 'DELETE', payload: Record<string, any>,
  ) {
    const wsId = getWsId();
    await dbAddPendingChange(wsId, entityType, entityId, method, payload);
    pendingChangeCount.value++;

    // Also update local cache optimistically
    if (method === 'PATCH') {
      const existing = await getOfflineItem(wsId, entityType, entityId);
      if (existing) {
        existing.data = { ...existing.data, ...payload };
        await putOfflineItem(wsId, entityType, entityId, existing.data, existing.syncedAt, existing.parentType, existing.parentId);
      }
    }
  }

  async function syncOnReconnect() {
    if (isSyncing.value) return;
    isSyncing.value = true;
    const wsId = getWsId();

    try {
      // Push local changes
      const pending = await getAllPendingChanges(wsId);
      if (pending.length > 0) {
        const changes = pending.map((c: any) => ({
          entityType: c.entityType,
          entityId: c.entityId,
          method: c.method,
          payload: c.payload,
          updatedAt: c.timestamp,
        }));

        const { data } = await apiClient.post('/offline/sync', { changes });

        for (const result of data.results || []) {
          if (result.status === 'conflict' && result.serverData) {
            await putOfflineItem(wsId, result.entityType, result.entityId, result.serverData, new Date().toISOString());
          }
        }

        await clearPendingChanges(wsId);
        pendingChangeCount.value = 0;
      }

      // Pull server changes
      if (lastSyncTimestamp.value) {
        const projectKeys = [...offlineItemKeys.value].filter((k) => k.startsWith('project:'));
        for (const pk of projectKeys) {
          const projectId = parseInt(pk.split(':')[1], 10);
          const { data: changes } = await apiClient.get('/offline/changes', {
            params: { since: lastSyncTimestamp.value, projectId },
          });

          const now = new Date().toISOString();
          for (const r of changes.resources || []) await putOfflineItem(wsId, 'resource', r.id, r, now);
          for (const d of changes.docs || []) await putOfflineItem(wsId, 'doc', d.id, d, now);
          for (const t of changes.threads || []) await putOfflineItem(wsId, 'thread', t.id, t, now);
          for (const c of changes.comments || []) await putOfflineItem(wsId, 'comment', c.id, c, now);
          for (const m of changes.marks || []) await putOfflineItem(wsId, 'mark', m.id, m, now);
          for (const n of changes.notes || []) await putOfflineItem(wsId, 'note', n.id, n, now);
        }
      }

      lastSyncTimestamp.value = new Date().toISOString();
      await persistManifest();
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      isSyncing.value = false;
    }
  }

  function startBackgroundSync(intervalMs = 5 * 60 * 1000) {
    if (syncInterval) return;
    syncInterval = setInterval(async () => {
      if (isOnline.value && offlineEnabled.value && offlineItemKeys.value.size > 0) {
        await syncOnReconnect();
      }
    }, intervalMs);
  }

  function stopBackgroundSync() {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  }

  return {
    offlineEnabled,
    isOnline,
    isSyncing,
    pendingChangeCount,
    offlineItemKeys,
    initialized,
    checkOfflineEnabled,
    loadOfflineState,
    isItemOffline,
    makeAvailableOffline,
    removeOffline,
    addPendingChange,
    syncOnReconnect,
    startBackgroundSync,
    stopBackgroundSync,
  };
});
