// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    openExternalBrowser: (projectId: string) => ipcRenderer.invoke('open-external-browser', projectId),
    navigateTo: (url: string) => ipcRenderer.invoke('navigate-to', url),
    onUrlChange: (callback: (url: string) => void) =>
        ipcRenderer.on('url-changed', (_event, url) => callback(url)),
    onProjectIdChange: (callback: (projectId: string) => void) =>
        ipcRenderer.on('project-id', (_event, projectId) => callback(projectId)),
    extractContent: (idProject: string) => ipcRenderer.invoke('extract-content', idProject),
    extractWebpage: (data: { content: string, title: string, url: string, projectId: string }) => ipcRenderer.invoke('extract-webpage', data),
    uploadDocument: (idProject: string, filePath: string) => ipcRenderer.invoke('upload-document', idProject, filePath),
    openMultipleFileDialog: () => ipcRenderer.invoke('open-multiple-file-dialog'),
    getSettings: () => ipcRenderer.invoke('settings:get'),
    setSettings: (settings: any) => ipcRenderer.invoke('settings:set', settings),
    showSelectionContextMenu: () => ipcRenderer.invoke('show-selection-context-menu'),
    navigateMainWindow: (route: string) => ipcRenderer.invoke('navigate-main-window', route),
    onNavigateToRoute: (callback: (route: string) => void) =>
        ipcRenderer.on('navigate-to-route', (_event, route) => callback(route)),

    // Workspace management
    getWorkspaces: () => ipcRenderer.invoke('workspace:list'),
    addWorkspace: (workspace: { id: string; name: string; url: string; type?: string }) => ipcRenderer.invoke('workspace:add', workspace),
    updateWorkspace: (workspace: { id: string; name: string; url: string; type?: string }) => ipcRenderer.invoke('workspace:update', workspace),
    removeWorkspace: (id: string) => ipcRenderer.invoke('workspace:remove', id),
    getActiveWorkspace: () => ipcRenderer.invoke('workspace:get-active'),
    setActiveWorkspace: (id: string) => ipcRenderer.invoke('workspace:set-active', id),
    setDefaultWorkspace: (id: string | null) => ipcRenderer.invoke('workspace:set-default', id),
    getDefaultWorkspace: () => ipcRenderer.invoke('workspace:get-default'),

    // Local server (standalone) management
    standaloneCheckInstalled: () => ipcRenderer.invoke('standalone:check-installed'),
    standaloneIsReady: () => ipcRenderer.invoke('standalone:is-ready'),
    standaloneDetectGpu: () => ipcRenderer.invoke('standalone:detect-gpu'),
    standaloneDownloadAll: () => ipcRenderer.invoke('standalone:download-all'),
    standaloneDownloadComponent: (component: string) => ipcRenderer.invoke('standalone:download-component', component),
    standaloneInstallModels: (variant: string) => ipcRenderer.invoke('standalone:install-models', variant),
    standaloneUninstallServices: () => ipcRenderer.invoke('standalone:uninstall-services'),
    standaloneUninstallModels: () => ipcRenderer.invoke('standalone:uninstall-models'),
    standaloneStart: () => ipcRenderer.invoke('standalone:start'),
    standaloneStop: () => ipcRenderer.invoke('standalone:stop'),
    standaloneStatus: () => ipcRenderer.invoke('standalone:status'),
    standaloneGetUrl: () => ipcRenderer.invoke('standalone:get-url'),
    onStandaloneDownloadProgress: (callback: (progress: any) => void) =>
        ipcRenderer.on('standalone:download-progress', (_event, progress) => callback(progress)),

    // Offline filesystem storage
    offlinePutItem: (wsId: string, type: string, id: number, data: any, syncedAt: string, parentType?: string, parentId?: number) =>
        ipcRenderer.invoke('offline:put-item', wsId, type, id, data, syncedAt, parentType, parentId),
    offlineGetItem: (wsId: string, type: string, id: number) =>
        ipcRenderer.invoke('offline:get-item', wsId, type, id),
    offlineDeleteItem: (wsId: string, type: string, id: number) =>
        ipcRenderer.invoke('offline:delete-item', wsId, type, id),
    offlineGetAllItemsByWorkspace: (wsId: string) =>
        ipcRenderer.invoke('offline:get-all-items-by-workspace', wsId),
    offlinePutFile: (wsId: string, resourceId: number, base64Data: string, mimeType: string, ext: string) =>
        ipcRenderer.invoke('offline:put-file', wsId, resourceId, base64Data, mimeType, ext),
    offlineGetFilePath: (wsId: string, resourceId: number) =>
        ipcRenderer.invoke('offline:get-file-path', wsId, resourceId),
    offlineDeleteFile: (wsId: string, resourceId: number) =>
        ipcRenderer.invoke('offline:delete-file', wsId, resourceId),
    offlineAddPendingChange: (wsId: string, entityType: string, entityId: number, method: string, payload: any) =>
        ipcRenderer.invoke('offline:add-pending-change', wsId, entityType, entityId, method, payload),
    offlineGetPendingChanges: (wsId: string) =>
        ipcRenderer.invoke('offline:get-pending-changes', wsId),
    offlineCountPendingChanges: (wsId: string) =>
        ipcRenderer.invoke('offline:count-pending-changes', wsId),
    offlineClearPendingChanges: (wsId: string) =>
        ipcRenderer.invoke('offline:clear-pending-changes', wsId),
    offlineGetManifest: (wsId: string) =>
        ipcRenderer.invoke('offline:get-manifest', wsId),
    offlineUpdateManifest: (wsId: string, keys: string[], lastSync: string | null) =>
        ipcRenderer.invoke('offline:update-manifest', wsId, keys, lastSync),
    offlineClearAll: (wsId: string) =>
        ipcRenderer.invoke('offline:clear-all', wsId),
});
