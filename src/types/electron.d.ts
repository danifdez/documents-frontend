export interface ElectronAPI {
    getSettings: () => Promise<{
        language?: string;
        fontSize?: number;
        fontFamily?: string;
        paragraphSpacing?: number;
    }>;
    setSettings: (settings: any) => Promise<void>;
    platform: string;
    versions: {
        node: string;
        chrome: string;
        electron: string;
    };
    openExternal: (url: string) => void;
    showSaveDialog: (options: any) => Promise<{ canceled: boolean; filePath?: string }>;
    writeFile: (filePath: string, data: string) => Promise<void>;
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export { };