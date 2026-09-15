// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels, IpcEvents } from './ipc/channels';
import type {
    CalendarAlarmsBridge,
    ElectronAPI,
    FolderScopeBridge,
    ShellOpsBridge,
    TaskRemindersBridge,
    VoiceLocalBridge,
} from './types/electron';

// ── Bridge for the local voice engine (Task 08) ──────────────────────────
// `isLocalAvailable` is synchronous because it is read by the component and
// the driver factory when rendering Settings and before starting a session.
// `voice:local:isAvailable` and `voice:local:hasModel` are exposed by main.ts.
// The renderer loads this flag lazily on first use via `invoke`.
let localAvailableCache: boolean | null = null;
async function refreshLocalAvailable(): Promise<boolean> {
    try {
        localAvailableCache = await ipcRenderer.invoke(IpcChannels.voice.isAvailable);
    } catch {
        localAvailableCache = false;
    }
    return localAvailableCache;
}
// Eager refresh — the result stays cached for later synchronous calls
// from `availability.ts` and from Settings.
void refreshLocalAvailable();

const voice: VoiceLocalBridge = {
    isLocalAvailable: (): boolean => localAvailableCache === true,
    refreshAvailability: refreshLocalAvailable,
    hasModel: (): Promise<boolean> => ipcRenderer.invoke(IpcChannels.voice.hasModel),
    preloadLocal: (): Promise<void> => ipcRenderer.invoke(IpcChannels.voice.preload),
    startLocal: (): Promise<{ sessionId: string }> => ipcRenderer.invoke(IpcChannels.voice.start),
    pushChunkLocal: (sessionId: string, buf: ArrayBuffer): Promise<void> =>
        ipcRenderer.invoke(IpcChannels.voice.chunk, sessionId, buf),
    stopLocal: (sessionId: string): Promise<void> => ipcRenderer.invoke(IpcChannels.voice.stop, sessionId),
    cancelLocal: (sessionId: string): Promise<void> =>
        ipcRenderer.invoke(IpcChannels.voice.cancel, sessionId),
    onPartialLocal: (cb: (payload: { sessionId: string; text: string; isFinal: boolean }) => void) => {
        const handler = (_e: unknown, payload: { sessionId: string; text: string; isFinal: boolean }) => {
            console.log('[preload] IPC voice:local:partial', payload);
            cb(payload);
        };
        ipcRenderer.on(IpcEvents.voice.partial, handler);
        return () => ipcRenderer.off(IpcEvents.voice.partial, handler);
    },
    onErrorLocal: (cb: (payload: { sessionId: string; message: string }) => void) => {
        const handler = (_e: unknown, payload: { sessionId: string; message: string }) => cb(payload);
        ipcRenderer.on(IpcEvents.voice.error, handler);
        return () => ipcRenderer.off(IpcEvents.voice.error, handler);
    },
    onLoadingProgress: (cb: (p: { downloaded: number; total: number | null; percent: number }) => void) => {
        const handler = (_e: unknown, payload: { downloaded: number; total: number | null; percent: number }) => cb(payload);
        ipcRenderer.on(IpcEvents.voice.loadingProgress, handler);
        return () => ipcRenderer.off(IpcEvents.voice.loadingProgress, handler);
    },
};

contextBridge.exposeInMainWorld('voice', voice);

const folderScope: FolderScopeBridge = {
    pick: (opts?: { title?: string }): Promise<string | null> =>
        ipcRenderer.invoke(IpcChannels.folderScope.pick, opts),
};

contextBridge.exposeInMainWorld('folderScope', folderScope);

const shellOps: ShellOpsBridge = {
    openPath: (p: string): Promise<{ ok: boolean; error?: string }> =>
        ipcRenderer.invoke(IpcChannels.shell.openPath, p),
    showItemInFolder: (p: string): Promise<{ ok: boolean }> =>
        ipcRenderer.invoke(IpcChannels.shell.showItemInFolder, p),
};

contextBridge.exposeInMainWorld('shellOps', shellOps);

const electronAPI: ElectronAPI = {
    uploadDocument: (idProject: string, filePath: string) => ipcRenderer.invoke(IpcChannels.document.upload, idProject, filePath),
    openMultipleFileDialog: () => ipcRenderer.invoke(IpcChannels.document.openMultipleFileDialog),
    getSettings: () => ipcRenderer.invoke(IpcChannels.settings.get),
    setSettings: (settings: any) => ipcRenderer.invoke(IpcChannels.settings.set, settings),
    // Exposes the residente/tray runtime info that
    // the Settings UI needs to gate platform-specific controls.
    getTrayAvailable: (): Promise<boolean> => ipcRenderer.invoke(IpcChannels.app.trayAvailable),
    getPlatform: (): Promise<NodeJS.Platform> => ipcRenderer.invoke(IpcChannels.app.getPlatform),

    // Workspace management
    getWorkspaces: () => ipcRenderer.invoke(IpcChannels.workspace.list),
    addWorkspace: (workspace: { id: string; name: string; url: string; type?: string }) => ipcRenderer.invoke(IpcChannels.workspace.add, workspace),
    updateWorkspace: (workspace: { id: string; name: string; url: string; type?: string }) => ipcRenderer.invoke(IpcChannels.workspace.update, workspace),
    removeWorkspace: (id: string) => ipcRenderer.invoke(IpcChannels.workspace.remove, id),
    getActiveWorkspace: () => ipcRenderer.invoke(IpcChannels.workspace.getActive),
    setActiveWorkspace: (id: string) => ipcRenderer.invoke(IpcChannels.workspace.setActive, id),
    setDefaultWorkspace: (id: string | null) => ipcRenderer.invoke(IpcChannels.workspace.setDefault, id),
    getDefaultWorkspace: () => ipcRenderer.invoke(IpcChannels.workspace.getDefault),

    // Local server (standalone) management
    standaloneCheckInstalled: () => ipcRenderer.invoke(IpcChannels.standalone.checkInstalled),
    standaloneIsReady: () => ipcRenderer.invoke(IpcChannels.standalone.isReady),
    standaloneDetectGpu: () => ipcRenderer.invoke(IpcChannels.standalone.detectGpu),
    standaloneHardwareReport: () => ipcRenderer.invoke(IpcChannels.standalone.hardwareReport),
    standaloneDownloadAll: () => ipcRenderer.invoke(IpcChannels.standalone.downloadAll),
    standaloneUpdateServices: () => ipcRenderer.invoke(IpcChannels.standalone.updateServices),
    standaloneInstallProfile: (profile: { key: string; components: string[]; features: string[] }) =>
        ipcRenderer.invoke(IpcChannels.standalone.installProfile, profile),
    standaloneDownloadComponent: (component: string) => ipcRenderer.invoke(IpcChannels.standalone.downloadComponent, component),
    standaloneInstallModels: (variant: string) => ipcRenderer.invoke(IpcChannels.standalone.installModels, variant),
    standaloneUninstallServices: () => ipcRenderer.invoke(IpcChannels.standalone.uninstallServices),
    standaloneUninstallModels: () => ipcRenderer.invoke(IpcChannels.standalone.uninstallModels),
    standaloneStart: () => ipcRenderer.invoke(IpcChannels.standalone.start),
    standaloneStop: () => ipcRenderer.invoke(IpcChannels.standalone.stop),
    splashAction: (action: 'retry' | 'reinstall' | 'reset' | 'open') => ipcRenderer.invoke(IpcChannels.app.splashAction, action),
    standaloneStatus: () => ipcRenderer.invoke(IpcChannels.standalone.status),
    standaloneGetUrl: () => ipcRenderer.invoke(IpcChannels.standalone.getUrl),
    standaloneGetPort: () => ipcRenderer.invoke(IpcChannels.standalone.getPort),
    standaloneSetPort: (port: number) => ipcRenderer.invoke(IpcChannels.standalone.setPort, port),
    standaloneGetFeatures: () => ipcRenderer.invoke(IpcChannels.standalone.getFeatures),
    onStandaloneDownloadProgress: (callback: (progress: any) => void) =>
        ipcRenderer.on(IpcEvents.standalone.downloadProgress, (_event, progress) => callback(progress)),

    // Offline filesystem storage
    offlinePutItem: (wsId: string, type: string, id: number, data: any, syncedAt: string, parentType?: string, parentId?: number) =>
        ipcRenderer.invoke(IpcChannels.offline.putItem, wsId, type, id, data, syncedAt, parentType, parentId),
    offlineGetItem: (wsId: string, type: string, id: number) =>
        ipcRenderer.invoke(IpcChannels.offline.getItem, wsId, type, id),
    offlineDeleteItem: (wsId: string, type: string, id: number) =>
        ipcRenderer.invoke(IpcChannels.offline.deleteItem, wsId, type, id),
    offlineGetAllItemsByWorkspace: (wsId: string) =>
        ipcRenderer.invoke(IpcChannels.offline.getAllItemsByWorkspace, wsId),
    offlinePutFile: (wsId: string, resourceId: number, base64Data: string, mimeType: string, ext: string) =>
        ipcRenderer.invoke(IpcChannels.offline.putFile, wsId, resourceId, base64Data, mimeType, ext),
    offlineGetFilePath: (wsId: string, resourceId: number) =>
        ipcRenderer.invoke(IpcChannels.offline.getFilePath, wsId, resourceId),
    offlineDeleteFile: (wsId: string, resourceId: number) =>
        ipcRenderer.invoke(IpcChannels.offline.deleteFile, wsId, resourceId),
    offlineAddPendingChange: (wsId: string, entityType: string, entityId: number, method: string, payload: any) =>
        ipcRenderer.invoke(IpcChannels.offline.addPendingChange, wsId, entityType, entityId, method, payload),
    offlineGetPendingChanges: (wsId: string) =>
        ipcRenderer.invoke(IpcChannels.offline.getPendingChanges, wsId),
    offlineCountPendingChanges: (wsId: string) =>
        ipcRenderer.invoke(IpcChannels.offline.countPendingChanges, wsId),
    offlineClearPendingChanges: (wsId: string) =>
        ipcRenderer.invoke(IpcChannels.offline.clearPendingChanges, wsId),
    offlineGetManifest: (wsId: string) =>
        ipcRenderer.invoke(IpcChannels.offline.getManifest, wsId),
    offlineUpdateManifest: (wsId: string, keys: string[], lastSync: string | null) =>
        ipcRenderer.invoke(IpcChannels.offline.updateManifest, wsId, keys, lastSync),
    offlineClearAll: (wsId: string) =>
        ipcRenderer.invoke(IpcChannels.offline.clearAll, wsId),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

const calendarAlarms: CalendarAlarmsBridge = {
    showAlarmNotification: (payload: {
        eventId: number;
        occurrenceStart: string;
        title: string;
        alarmLabel: string | null;
        trackCompletion: boolean;
    }) => ipcRenderer.invoke(IpcChannels.calendar.showAlarm, payload),
    showMissedAggregate: (payload: {
        items: Array<{
            eventId: number;
            occurrenceStart: string;
            title: string;
            alarmLabel: string | null;
            trackCompletion: boolean;
        }>;
    }) => ipcRenderer.invoke(IpcChannels.calendar.showMissedAggregate, payload),
    onNavigateToEvent: (callback: (eventId: number) => void) => {
        const handler = (_e: unknown, eventId: number) => callback(eventId);
        ipcRenderer.on(IpcEvents.calendar.navigate, handler);
        return () => ipcRenderer.off(IpcEvents.calendar.navigate, handler);
    },
    onNavigateMissedPanel: (callback: () => void) => {
        const handler = () => callback();
        ipcRenderer.on(IpcEvents.calendar.navigateMissedPanel, handler);
        return () => ipcRenderer.off(IpcEvents.calendar.navigateMissedPanel, handler);
    },
};

contextBridge.exposeInMainWorld('calendarAlarms', calendarAlarms);

const taskReminders: TaskRemindersBridge = {
    showReminderNotification: (payload: {
        taskId: number;
        title: string;
        reminderAt: string;
    }) => ipcRenderer.invoke(IpcChannels.task.showReminder, payload),
    showMissedAggregate: (payload: {
        items: Array<{ taskId: number; title: string; reminderAt: string }>;
    }) => ipcRenderer.invoke(IpcChannels.task.showMissedAggregate, payload),
    onNavigateToTask: (callback: (taskId: number) => void) => {
        const handler = (_e: unknown, taskId: number) => callback(taskId);
        ipcRenderer.on(IpcEvents.task.navigate, handler);
        return () => ipcRenderer.off(IpcEvents.task.navigate, handler);
    },
    onNavigateMissedTasksPanel: (callback: () => void) => {
        const handler = () => callback();
        ipcRenderer.on(IpcEvents.task.navigateMissedPanel, handler);
        return () => ipcRenderer.off(IpcEvents.task.navigateMissedPanel, handler);
    },
};

contextBridge.exposeInMainWorld('taskReminders', taskReminders);
