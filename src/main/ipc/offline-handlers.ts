import { forEachSequential } from '../../utils/forEachSequential';
import type { OfflineItem, OfflinePendingChange } from '../../types/offline';
import { app } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { IpcChannels } from '../../ipc/channels';
import type { IpcHandlerMap } from './registry';

function getBasePath(wsId: string): string {
  return path.join(app.getPath('userData'), 'offline-data', wsId);
}

function itemPath(wsId: string, type: string, id: number): string {
  return path.join(getBasePath(wsId), 'items', type, `${id}.json`);
}

function filePath(wsId: string, resourceId: number, ext: string): string {
  return path.join(getBasePath(wsId), 'files', `${resourceId}${ext}`);
}

function manifestPath(wsId: string): string {
  return path.join(getBasePath(wsId), 'manifest.json');
}

function pendingPath(wsId: string): string {
  return path.join(getBasePath(wsId), 'pending-changes.json');
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJsonSafe<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data), 'utf-8');
}

export function createOfflineHandlers(): IpcHandlerMap {
  return {
    [IpcChannels.offline.putItem]: async (_, item: OfflineItem) => {
      await writeJson(itemPath(item.workspaceId, item.entityType, item.entityId), item);
    },

    [IpcChannels.offline.getItem]: async (_, wsId: string, type: string, id: number) => {
      return readJsonSafe<OfflineItem | null>(itemPath(wsId, type, id), null);
    },

    [IpcChannels.offline.deleteItem]: async (_, wsId: string, type: string, id: number) => {
      try {
        await fs.unlink(itemPath(wsId, type, id));
      } catch {
        // File may not exist
      }
    },

    [IpcChannels.offline.getAllItemsByWorkspace]: async (_, wsId: string) => {
      const itemsDir = path.join(getBasePath(wsId), 'items');
      const results: OfflineItem[] = [];

      try {
        const types = await fs.readdir(itemsDir, { withFileTypes: true });
        await forEachSequential(types.filter(entry => entry.isDirectory()), async (type) => {
          const typeDir = path.join(itemsDir, type.name);
          const files = await fs.readdir(typeDir);
          await forEachSequential(files.filter(file => file.endsWith('.json')), async (file) => {
            const item = await readJsonSafe<OfflineItem | null>(path.join(typeDir, file), null);
            if (item) results.push(item);
          });
        });
      } catch {
        // Directory may not exist yet
      }

      return results;
    },

    [IpcChannels.offline.putFile]: async (_, wsId: string, resourceId: number, base64Data: string, _mimeType: string, ext: string) => {
      const p = filePath(wsId, resourceId, ext);
      await ensureDir(path.dirname(p));
      await fs.writeFile(p, Buffer.from(base64Data, 'base64'));
    },

    [IpcChannels.offline.getFilePath]: async (_, wsId: string, resourceId: number) => {
      const filesDir = path.join(getBasePath(wsId), 'files');
      try {
        const files = await fs.readdir(filesDir);
        const match = files.find(f => f.startsWith(`${resourceId}.`));
        return match ? path.join(filesDir, match) : null;
      } catch {
        return null;
      }
    },

    [IpcChannels.offline.deleteFile]: async (_, wsId: string, resourceId: number) => {
      const filesDir = path.join(getBasePath(wsId), 'files');
      try {
        const files = await fs.readdir(filesDir);
        const match = files.find(f => f.startsWith(`${resourceId}.`));
        if (match) await fs.unlink(path.join(filesDir, match));
      } catch {
        // File may not exist
      }
    },

    [IpcChannels.offline.addPendingChange]: async (_, wsId: string, entityType: string, entityId: number, method: string, payload: unknown) => {
      const p = pendingPath(wsId);
      const changes = await readJsonSafe<OfflinePendingChange[]>(p, []);
      changes.push({ workspaceId: wsId, entityType, entityId, method, payload, timestamp: new Date().toISOString() });
      await writeJson(p, changes);
    },

    [IpcChannels.offline.getPendingChanges]: async (_, wsId: string) => {
      return readJsonSafe<OfflinePendingChange[]>(pendingPath(wsId), []);
    },

    [IpcChannels.offline.countPendingChanges]: async (_, wsId: string) => {
      const changes = await readJsonSafe<OfflinePendingChange[]>(pendingPath(wsId), []);
      return changes.length;
    },

    [IpcChannels.offline.clearPendingChanges]: async (_, wsId: string) => {
      await writeJson(pendingPath(wsId), []);
    },

    [IpcChannels.offline.getManifest]: async (_, wsId: string) => {
      return readJsonSafe(manifestPath(wsId), { keys: [], lastSync: null });
    },

    [IpcChannels.offline.updateManifest]: async (_, wsId: string, keys: string[], lastSync: string | null) => {
      await writeJson(manifestPath(wsId), { keys, lastSync });
    },

    [IpcChannels.offline.clearAll]: async (_, wsId: string) => {
      try {
        await fs.rm(getBasePath(wsId), { recursive: true, force: true });
      } catch {
        // Directory may not exist
      }
    },
  };
}
