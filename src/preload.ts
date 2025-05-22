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
    uploadDocument: (idProject: string, filePath: string) => ipcRenderer.invoke('upload-document', idProject, filePath),
    openMultipleFileDialog: () => ipcRenderer.invoke('open-multiple-file-dialog')
});
