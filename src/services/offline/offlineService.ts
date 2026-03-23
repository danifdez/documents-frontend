import { useOfflineStore } from '../../store/offlineStore';
import { useNotification } from '../../composables/useNotification';
import { getOfflineFilePath } from './offlineDb';

export async function downloadForOffline(type: 'resource' | 'thread' | 'project', id: number) {
  const offlineStore = useOfflineStore();
  const notification = useNotification();

  try {
    const { excludedFiles, savedCounts } = await offlineStore.makeAvailableOffline(type, id);

    const parts: string[] = [];
    if (savedCounts.resources) parts.push(`${savedCounts.resources} resource(s)`);
    if (savedCounts.docs) parts.push(`${savedCounts.docs} doc(s)`);
    if (savedCounts.threads) parts.push(`${savedCounts.threads} thread(s)`);
    if (savedCounts.notes) parts.push(`${savedCounts.notes} note(s)`);
    if (savedCounts.files) parts.push(`${savedCounts.files} file(s)`);
    const summary = parts.length > 0 ? parts.join(', ') : 'content';

    if (excludedFiles.length > 0) {
      const names = excludedFiles.map((f: any) => f.name).join(', ');
      notification.warning(
        `Saved ${summary}. ${excludedFiles.length} file(s) excluded (too large): ${names}.`,
      );
    } else {
      notification.success(`Saved offline: ${summary}`);
    }
  } catch (err: any) {
    notification.error(err?.response?.data?.message || 'Failed to download for offline use');
    throw err;
  }
}

export async function removeFromOffline(type: string, id: number) {
  const offlineStore = useOfflineStore();
  await offlineStore.removeOffline(type, id);
}

export async function getOfflineFileUrl(resourceId: number): Promise<string | null> {
  const wsId = localStorage.getItem('activeWorkspaceId') || 'default';
  const filePath = await getOfflineFilePath(wsId, resourceId);
  if (!filePath) return null;
  return `file://${filePath}`;
}
