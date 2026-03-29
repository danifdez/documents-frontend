export interface ElectronAPI {
    getSettings: () => Promise<{
        language?: string;
        fontSize?: number;
        fontFamily?: string;
        paragraphSpacing?: number;
        theme?: 'light' | 'dark' | 'system';
        defaultBrowserUrl?: string;
    }>;
    setSettings: (settings: any) => Promise<void>;
    openExternalBrowser: (projectId: string) => Promise<void>;
    navigateTo: (url: string) => Promise<boolean>;
    goBack: () => Promise<boolean>;
    goForward: () => Promise<boolean>;
    reload: () => Promise<boolean>;
    onUrlChange: (callback: (url: string) => void) => void;
    onProjectIdChange: (callback: (projectId: string) => void) => void;
    extractContent: (idProject: string) => Promise<any>;
    uploadDocument: (idProject: string, filePath: string) => Promise<any>;
    openMultipleFileDialog: () => Promise<{ path: string; name: string }[]>;
    platform: string;
    versions: {
        node: string;
        chrome: string;
        electron: string;
    };
    openExternal: (url: string) => void;
    showSaveDialog: (options: any) => Promise<{ canceled: boolean; filePath?: string }>;
    writeFile: (filePath: string, data: string) => Promise<void>;

    // Workspace management
    getWorkspaces: () => Promise<{ id: string; name: string; url: string; type?: string }[]>;
    addWorkspace: (workspace: { id: string; name: string; url: string; type?: string }) => Promise<any>;
    updateWorkspace: (workspace: { id: string; name: string; url: string; type?: string }) => Promise<any>;
    removeWorkspace: (id: string) => Promise<boolean>;
    getActiveWorkspace: () => Promise<{ id: string; name: string; url: string; type?: string } | null>;
    setActiveWorkspace: (id: string) => Promise<any>;
    setDefaultWorkspace: (id: string | null) => Promise<boolean>;
    getDefaultWorkspace: () => Promise<string | null>;

    // Local server (standalone) management
    standaloneCheckInstalled: () => Promise<{ backend: boolean; postgres: boolean; qdrant: boolean; neo4j: boolean; models: boolean }>;
    standaloneIsReady: () => Promise<boolean>;
    standaloneDetectGpu: () => Promise<{ available: boolean; name: string | null; cuda: boolean }>;
    standaloneDownloadAll: () => Promise<{ success: boolean; error?: string }>;
    standaloneDownloadComponent: (component: string) => Promise<{ success: boolean; error?: string }>;
    standaloneInstallModels: (variant: string) => Promise<{ success: boolean; error?: string }>;
    standaloneUninstallServices: () => Promise<{ success: boolean; error?: string }>;
    standaloneUninstallModels: () => Promise<{ success: boolean; error?: string }>;
    standaloneStart: () => Promise<{ success: boolean; url?: string; error?: string }>;
    standaloneStop: () => Promise<{ success: boolean; error?: string }>;
    standaloneStatus: () => Promise<{ postgres: string; backend: string; qdrant: string; neo4j: string; models: string }>;
    standaloneGetUrl: () => Promise<string | null>;
    onStandaloneDownloadProgress: (callback: (progress: { component: string; downloaded: number; total: number; percent: number }) => void) => void;

    // Offline filesystem storage
    offlinePutItem: (wsId: string, type: string, id: number, data: any, syncedAt: string, parentType?: string, parentId?: number) => Promise<void>;
    offlineGetItem: (wsId: string, type: string, id: number) => Promise<any | null>;
    offlineDeleteItem: (wsId: string, type: string, id: number) => Promise<void>;
    offlineGetAllItemsByWorkspace: (wsId: string) => Promise<any[]>;
    offlinePutFile: (wsId: string, resourceId: number, base64Data: string, mimeType: string, ext: string) => Promise<void>;
    offlineGetFilePath: (wsId: string, resourceId: number) => Promise<string | null>;
    offlineDeleteFile: (wsId: string, resourceId: number) => Promise<void>;
    offlineAddPendingChange: (wsId: string, entityType: string, entityId: number, method: string, payload: any) => Promise<void>;
    offlineGetPendingChanges: (wsId: string) => Promise<any[]>;
    offlineCountPendingChanges: (wsId: string) => Promise<number>;
    offlineClearPendingChanges: (wsId: string) => Promise<void>;
    offlineGetManifest: (wsId: string) => Promise<{ keys: string[]; lastSync: string | null }>;
    offlineUpdateManifest: (wsId: string, keys: string[], lastSync: string | null) => Promise<void>;
    offlineClearAll: (wsId: string) => Promise<void>;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export { };
