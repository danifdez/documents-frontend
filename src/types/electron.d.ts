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
    getWorkspaces: () => Promise<{ id: string; name: string; url: string }[]>;
    addWorkspace: (workspace: { id: string; name: string; url: string }) => Promise<{ id: string; name: string; url: string }>;
    updateWorkspace: (workspace: { id: string; name: string; url: string }) => Promise<{ id: string; name: string; url: string }>;
    removeWorkspace: (id: string) => Promise<boolean>;
    getActiveWorkspace: () => Promise<{ id: string; name: string; url: string } | null>;
    setActiveWorkspace: (id: string) => Promise<{ id: string; name: string; url: string } | null>;

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
