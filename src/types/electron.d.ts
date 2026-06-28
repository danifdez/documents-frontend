export interface ElectronAPI {
    getSettings: () => Promise<{
        language?: string;
        fontSize?: number;
        fontFamily?: string;
        paragraphSpacing?: number;
        theme?: 'light' | 'dark' | 'system';
        defaultBrowserUrl?: string;
        disabledFeatures?: string[];
        closeBehavior?: 'tray' | 'quit';
        launchAtLogin?: boolean;
        toggleShortcut?: string | null;
        hideDockIcon?: boolean;
        preloadVoiceModel?: boolean;
    }>;
    // Returns `{ ok, shortcutOk }` Older callers that
    // ignore the return value keep working since the IPC channel itself is
    // unchanged.
    setSettings: (settings: any) => Promise<{ ok: boolean; shortcutOk: boolean } | void>;
    // Runtime info about residente/tray support.
    getTrayAvailable?: () => Promise<boolean>;
    getPlatform?: () => Promise<NodeJS.Platform>;
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
    standaloneCheckInstalled: () => Promise<{ backend: boolean; postgres: boolean; models: boolean }>;
    standaloneIsReady: () => Promise<boolean>;
    standaloneDetectGpu: () => Promise<{ available: boolean; name: string | null; cuda: boolean; vramGB: number }>;
    standaloneHardwareReport: () => Promise<{
        hardware: {
            cpuModel: string;
            cpuCores: number;
            arch: string;
            platform: string;
            ramGB: number;
            freeDiskGB: number | null;
            gpu: { available: boolean; name: string | null; cuda: boolean; vramGB: number };
        };
        canInstall: boolean;
        blockReason: string;
        install: {
            status: 'yes' | 'slow' | 'no';
            reason: string;
            downloadGB: number;
            components: string[];
            bundle: 'models-cpu' | 'models-gpu';
        };
    }>;
    standaloneDownloadAll: () => Promise<{ success: boolean; error?: string }>;
    standaloneInstallProfile: (profile: { key: string; components: string[]; features: string[] }) => Promise<{ success: boolean; error?: string }>;
    standaloneDownloadComponent: (component: string) => Promise<{ success: boolean; error?: string }>;
    standaloneInstallModels: (variant: string) => Promise<{ success: boolean; error?: string }>;
    standaloneUninstallServices: () => Promise<{ success: boolean; error?: string }>;
    standaloneUninstallModels: () => Promise<{ success: boolean; error?: string }>;
    standaloneStart: () => Promise<{ success: boolean; url?: string; error?: string }>;
    standaloneStop: () => Promise<{ success: boolean; error?: string }>;
    standaloneStatus: () => Promise<{
        services: { postgres: string; backend: string; models: string };
        errors: Partial<Record<'postgres' | 'backend' | 'models', string>>;
    }>;
    standaloneGetUrl: () => Promise<string | null>;
    onStandaloneDownloadProgress: (callback: (progress: { component: string; downloaded: number; total: number; percent: number; step?: number; totalSteps?: number; overallPercent?: number }) => void) => void;

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

export interface FolderScopeBridge {
    pick: (opts?: { title?: string }) => Promise<string | null>;
}

export interface ShellOpsBridge {
    openPath: (path: string) => Promise<{ ok: boolean; error?: string }>;
    showItemInFolder: (path: string) => Promise<{ ok: boolean }>;
}

export interface VoiceLocalBridge {
    isLocalAvailable: () => boolean;
    refreshAvailability: () => Promise<boolean>;
    hasModel: () => Promise<boolean>;
    preloadLocal: () => Promise<void>;
    startLocal: () => Promise<{ sessionId: string }>;
    pushChunkLocal: (sessionId: string, buf: ArrayBuffer) => Promise<void>;
    stopLocal: (sessionId: string) => Promise<void>;
    cancelLocal: (sessionId: string) => Promise<void>;
    onPartialLocal: (cb: (p: { sessionId: string; text: string; isFinal: boolean }) => void) => () => void;
    onErrorLocal: (cb: (p: { sessionId: string; message: string }) => void) => () => void;
    onLoadingProgress: (cb: (p: { downloaded: number; total: number | null; percent: number }) => void) => () => void;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
        voice?: VoiceLocalBridge;
        folderScope?: FolderScopeBridge;
        shellOps?: ShellOpsBridge;
    }
}

export { };
