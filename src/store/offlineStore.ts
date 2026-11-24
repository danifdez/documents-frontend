import { forEachSequential } from '../utils/forEachSequential';
import type { OfflineEntity } from '../types/offline';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '../services/api';
import { getActiveWorkspaceId } from '../services/workspaceScope';
import { setServerReachable } from '../services/offline/offlineInterceptor';
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

interface OfflineBundle {
  project?: OfflineEntity;
  resources?: OfflineEntity[];
  docs?: OfflineEntity[];
  threads?: OfflineEntity[];
  comments?: OfflineEntity[];
  marks?: OfflineEntity[];
  readingPoints?: OfflineEntity[];
  notes?: OfflineEntity[];
  files?: { resourceId: number; base64: string; mimeType: string }[];
  excludedFiles?: { name: string }[];
}

const bundleEntityTypes = {
  resources: 'resource',
  docs: 'doc',
  threads: 'thread',
  comments: 'comment',
  marks: 'mark',
  readingPoints: 'reading-point',
  notes: 'note',
} as const;

const manifestTypes = new Set(['resource', 'doc', 'thread', 'note']);

function bundleItems(bundle: OfflineBundle) {
  const fields = Object.keys(bundleEntityTypes) as (keyof typeof bundleEntityTypes)[];
  return fields.flatMap(field => (bundle[field] ?? []).map(item => ({
    type: bundleEntityTypes[field],
    item,
  })));
}

async function checkOfflineEnabled() {
  // Offline support is always enabled. Retain the store's existing method.
}

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
  // Offline is always-on locally: mutations are always queued and synced
  // when the backend comes back, regardless of any server-side flag.
  const offlineEnabled = ref(true);
  const backendReachable = ref(true);
  const isOnline = ref(true);
  const isSyncing = ref(false);
  const pendingChangeCount = ref(0);
  const offlineItemKeys = ref<Set<string>>(new Set());
  const lastSyncTimestamp = ref<string | null>(null);
  const initialized = ref(false);
  let syncInterval: ReturnType<typeof setInterval> | null = null;
  let recoveryTimer: ReturnType<typeof setTimeout> | null = null;
  let recoveryAttempt = 0;
  let offlineStateRequest = 0;
  let loadedWorkspaceId: string | null = null;

  function setBackendReachable(value: boolean) {
    setServerReachable(value);
    const wasReachable = backendReachable.value;
    backendReachable.value = value;
    isOnline.value = value;

    if (value && !wasReachable) {
      stopRecoveryPoll();
      if (pendingChangeCount.value > 0 || offlineItemKeys.value.size > 0) {
        void syncOnReconnect();
      }
    } else if (!value && wasReachable) {
      startRecoveryPoll();
    }
  }

  async function probeBackend(): Promise<boolean> {
    const baseUrl = apiClient.defaults.baseURL || '';
    try {
      const res = await fetch(`${baseUrl}/auth/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      const ok = res.ok;
      setBackendReachable(ok);
      return ok;
    } catch {
      setBackendReachable(false);
      return false;
    }
  }

  function nextRecoveryDelay(): number {
    const schedule = [10_000, 15_000, 20_000, 30_000];
    return schedule[Math.min(recoveryAttempt, schedule.length - 1)];
  }

  function startRecoveryPoll() {
    if (recoveryTimer) return;
    recoveryAttempt = 0;
    const tick = async () => {
      recoveryTimer = null;
      if (backendReachable.value) return;
      await probeBackend();
      if (!backendReachable.value) {
        recoveryAttempt++;
        recoveryTimer = setTimeout(tick, nextRecoveryDelay());
      }
    };
    recoveryTimer = setTimeout(tick, nextRecoveryDelay());
  }

  function stopRecoveryPoll() {
    if (recoveryTimer) {
      clearTimeout(recoveryTimer);
      recoveryTimer = null;
    }
    recoveryAttempt = 0;
  }

  function clearOfflineState() {
    offlineStateRequest++;
    loadedWorkspaceId = null;
    offlineItemKeys.value = new Set();
    lastSyncTimestamp.value = null;
    pendingChangeCount.value = 0;
  }

  async function loadOfflineState() {
    const wsId = getActiveWorkspaceId();
    if (loadedWorkspaceId !== wsId) clearOfflineState();
    const request = ++offlineStateRequest;
    const [manifest, count] = await Promise.all([getManifest(wsId), countPendingChanges(wsId)]);
    if (request !== offlineStateRequest || wsId !== getActiveWorkspaceId()) return;
    offlineItemKeys.value = new Set(manifest.keys);
    lastSyncTimestamp.value = manifest.lastSync;
    pendingChangeCount.value = count;
    loadedWorkspaceId = wsId;
    initialized.value = true;
  }

  function isItemOffline(type: string, id: number): boolean {
    return offlineItemKeys.value.has(`${type}:${id}`);
  }

  async function makeAvailableOffline(type: 'resource' | 'thread' | 'project', id: number) {
    const wsId = getActiveWorkspaceId();
    const keys = offlineItemKeys.value;
    const { data: bundle } = await apiClient.get<OfflineBundle>(`/offline/bundle/${type}/${id}`);
    const now = new Date().toISOString();

    // Store project from bundle
    if (bundle.project) {
      await putOfflineItem(wsId, 'project', bundle.project.id, bundle.project, now, type, id);
      keys.add(`project:${bundle.project.id}`);
    }

    await forEachSequential(bundleItems(bundle), async ({ type: entityType, item }) => {
      await putOfflineItem(wsId, entityType, item.id, item, now, type, id);
      if (manifestTypes.has(entityType)) keys.add(`${entityType}:${item.id}`);
    });

    // Store files — pass base64 directly to filesystem
    await Promise.all(
      (bundle.files || []).map(f => {
        const ext = extFromMime(f.mimeType || 'application/octet-stream');
        return putOfflineFile(wsId, f.resourceId, f.base64, f.mimeType, ext);
      }),
    );

    // Mark the parent item itself
    keys.add(`${type}:${id}`);

    // Persist manifest to disk
    if (keys === offlineItemKeys.value) lastSyncTimestamp.value = now;
    await updateManifest(wsId, [...keys], now);

    const savedCounts = {
      projects: bundle.project ? 1 : 0,
      resources: (bundle.resources || []).length,
      docs: (bundle.docs || []).length,
      threads: (bundle.threads || []).length,
      comments: (bundle.comments || []).length,
      marks: (bundle.marks || []).length,
      readingPoints: (bundle.readingPoints || []).length,
      notes: (bundle.notes || []).length,
      files: (bundle.files || []).length,
    };

    return { excludedFiles: bundle.excludedFiles || [], savedCounts };
  }

  async function removeOffline(type: string, id: number) {
    const wsId = getActiveWorkspaceId();
    const keys = offlineItemKeys.value;
    const lastSync = lastSyncTimestamp.value;

    // Find and remove all child items that were saved with this parent
    const allItems = await getAllOfflineItemsByWorkspace(wsId);
    const children = allItems.filter(item => item.parentType === type && item.parentId === id);
    await forEachSequential(children, async (item) => {
      await deleteOfflineItem(wsId, item.entityType, item.entityId);
      keys.delete(`${item.entityType}:${item.entityId}`);
      if (item.entityType === 'resource') await deleteOfflineFile(wsId, item.entityId);
    });

    // Remove the parent key itself
    keys.delete(`${type}:${id}`);
    await deleteOfflineItem(wsId, type, id);

    // Persist manifest
    await updateManifest(wsId, [...keys], lastSync);
  }

  async function addPendingChange(
    entityType: string, entityId: number,
    method: 'PATCH' | 'POST' | 'DELETE', payload: Record<string, unknown>,
  ) {
    const wsId = getActiveWorkspaceId();
    await dbAddPendingChange(wsId, entityType, entityId, method, payload);
    if (wsId === getActiveWorkspaceId()) pendingChangeCount.value++;

    // Also update local cache optimistically
    if (method === 'PATCH') {
      const existing = await getOfflineItem(wsId, entityType, entityId);
      if (existing) {
        existing.data = { ...existing.data, ...payload };
        await putOfflineItem(wsId, entityType, entityId, existing.data, existing.syncedAt, existing.parentType, existing.parentId);
      }
    }
  }

  async function pushPendingChanges(wsId: string): Promise<void> {
    const pending = await getAllPendingChanges(wsId);
    if (!pending.length || wsId !== getActiveWorkspaceId()) return;

    const changes = pending.map(change => ({
      entityType: change.entityType,
      entityId: change.entityId,
      method: change.method,
      payload: change.payload,
      updatedAt: change.timestamp,
    }));
    const { data } = await apiClient.post<{
      results?: { status: string; entityType: string; entityId: number; serverData?: OfflineEntity }[];
    }>('/offline/sync', { changes });
    const now = new Date().toISOString();
    await forEachSequential(data.results ?? [], async (result) => {
      if (result.status === 'conflict' && result.serverData) {
        await putOfflineItem(wsId, result.entityType, result.entityId, result.serverData, now);
      }
    });
    await clearPendingChanges(wsId);
    if (wsId === getActiveWorkspaceId()) pendingChangeCount.value = 0;
  }

  async function pullServerChanges(wsId: string): Promise<void> {
    const since = lastSyncTimestamp.value;
    if (!since) return;
    const projects = [...offlineItemKeys.value].filter(key => key.startsWith('project:'));
    await forEachSequential(projects, async (key) => {
      if (wsId !== getActiveWorkspaceId()) return;
      const projectId = Number.parseInt(key.split(':')[1], 10);
      const { data } = await apiClient.get<OfflineBundle>('/offline/changes', { params: { since, projectId } });
      const now = new Date().toISOString();
      await forEachSequential(bundleItems(data), ({ type, item }) => putOfflineItem(wsId, type, item.id, item, now));
    });
  }

  async function syncOnReconnect() {
    const wsId = getActiveWorkspaceId();
    if (isSyncing.value || (initialized.value && loadedWorkspaceId !== wsId)) return;
    isSyncing.value = true;
    const request = offlineStateRequest;

    try {
      await pushPendingChanges(wsId);
      if (request !== offlineStateRequest) return;
      await pullServerChanges(wsId);
      if (request !== offlineStateRequest) return;
      lastSyncTimestamp.value = new Date().toISOString();
      await updateManifest(wsId, [...offlineItemKeys.value], lastSyncTimestamp.value);
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
    backendReachable,
    isOnline,
    isSyncing,
    pendingChangeCount,
    offlineItemKeys,
    initialized,
    checkOfflineEnabled,
    setBackendReachable,
    probeBackend,
    startRecoveryPoll,
    stopRecoveryPoll,
    loadOfflineState,
    clearOfflineState,
    isItemOffline,
    makeAvailableOffline,
    removeOffline,
    addPendingChange,
    syncOnReconnect,
    startBackgroundSync,
    stopBackgroundSync,
  };
});
