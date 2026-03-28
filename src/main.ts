import { app, BrowserWindow, ipcMain, screen, dialog, Menu, globalShortcut } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import FormData from 'form-data';
import Store from 'electron-store';
import { registerOfflineHandlers } from './main-offline';

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.html': 'text/html', '.htm': 'text/html',
  '.txt': 'text/plain', '.md': 'text/plain', '.csv': 'text/csv',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp', '.tiff': 'image/tiff', '.tif': 'image/tiff',
  '.json': 'application/json', '.xml': 'application/xml',
  '.eml': 'message/rfc822',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.flac': 'audio/flac', '.aac': 'audio/aac', '.m4a': 'audio/mp4',
  '.wma': 'audio/x-ms-wma', '.opus': 'audio/opus',
  '.aiff': 'audio/aiff', '.aif': 'audio/aiff',
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo', '.mkv': 'video/x-matroska',
  '.webm': 'video/webm', '.wmv': 'video/x-ms-wmv',
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const store = new Store();

// Ensure workspaces key exists
if (!store.get('workspaces')) {
  store.set('workspaces', []);
}

function getApiUrl(): string {
  const activeId = store.get('activeWorkspaceId') as string;
  const workspaces = store.get('workspaces', []) as any[];
  const active = workspaces.find((w: any) => w.id === activeId);
  return active?.url || import.meta.env.VITE_API_URL || 'http://localhost:3000';
}

const createWindow = () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  mainWindow.maximize();

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();
};

const createBrowserWindow = (projectId?: string) => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const win = new BrowserWindow({
    width,
    height,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
    },
  });

  win.maximize();

  const hash = projectId ? `/browser/${projectId}` : '/browser';

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#${hash}`);
  } else {
    win.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      { hash }
    );
  }
};

app.whenReady().then(() => {
  ipcMain.handle('open-external-browser', (_, projectId?: string) => {
    createBrowserWindow(projectId);
  });

  ipcMain.handle("extract-webpage", async (_, { content, title, url, projectId }) => {
    try {
      const tempDir = path.join(os.tmpdir(), 'document-manager');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const tempFilePath = path.join(tempDir, `webpage-${uuidv4()}.html`);
      await fs.promises.writeFile(tempFilePath, content);

      const formData = new FormData();
      const fileStream = fs.createReadStream(tempFilePath);
      formData.append('file', fileStream);
      formData.append('name', title);
      if (projectId) {
        formData.append('projectId', projectId);
      }
      formData.append('type', 'webpage');
      formData.append('url', url);

      const uploadResponse = await axios.post(`${getApiUrl()}/resources/upload`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      await fs.promises.unlink(tempFilePath);

      return {
        resourceId: uploadResponse.data.resourceId,
      };
    } catch (error) {
      console.error("Error extracting content:", error);
      return { error: `Failed to extract content: ${error.message}` };
    }
  });

  ipcMain.handle("upload-document", async (_, idProject, filePath) => {
    try {
      if (!filePath) {
        return { error: "No file path provided" };
      }

      // Create a form data object for the file
      const formData = new FormData();
      const fileStream = fs.createReadStream(filePath);
      const fileName = path.basename(filePath);
      const mimeType = getMimeType(filePath);

      formData.append('file', fileStream, { filename: fileName, contentType: mimeType });
      formData.append('name', fileName);
      if (idProject) {
        formData.append('projectId', idProject);
      }

      const uploadResponse = await axios.post(`${getApiUrl()}/resources/upload`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      return {
        resourceId: uploadResponse.data.resourceId,
      };
    } catch (error) {
      return { error: `Failed to process document: ${error.message}` };
    }
  });

  ipcMain.handle("open-multiple-file-dialog", async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'All Supported Files', extensions: ['pdf', 'doc', 'docx', 'odt', 'txt', 'htm', 'html', 'eml', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'mp4', 'm4v', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'opus'] },
        { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'odt', 'txt', 'htm', 'html', 'eml'] },
        { name: 'Video', extensions: ['mp4', 'm4v', 'mov', 'avi', 'mkv', 'webm', 'wmv'] },
        { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'opus'] },
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return [];
    }

    return result.filePaths.map(filePath => ({
      path: filePath,
      name: path.basename(filePath)
    }));
  });

  ipcMain.handle('settings:get', () => {
    return store.get('settings', {
      fontSize: 16,
      fontFamily: 'sans-serif',
      paragraphSpacing: 1.5,
      language: 'en',
      theme: 'system',
      defaultBrowserUrl: 'https://github.com/electron/electron',
      disabledFeatures: [],
    });
  });

  ipcMain.handle('settings:set', (_event, settings) => {
    store.set('settings', settings);
    return true;
  });

  // ── Workspace IPC handlers ──
  ipcMain.handle('workspace:list', () => {
    return store.get('workspaces', []);
  });

  ipcMain.handle('workspace:add', (_, workspace: { id: string; name: string; url: string }) => {
    const workspaces = store.get('workspaces', []) as any[];
    workspaces.push(workspace);
    store.set('workspaces', workspaces);
    return workspace;
  });

  ipcMain.handle('workspace:update', (_, workspace: { id: string; name: string; url: string }) => {
    const workspaces = store.get('workspaces', []) as any[];
    const index = workspaces.findIndex((w: any) => w.id === workspace.id);
    if (index >= 0) {
      workspaces[index] = workspace;
      store.set('workspaces', workspaces);
    }
    return workspace;
  });

  ipcMain.handle('workspace:remove', (_, id: string) => {
    let workspaces = store.get('workspaces', []) as any[];
    workspaces = workspaces.filter((w: any) => w.id !== id);
    store.set('workspaces', workspaces);
    const activeId = store.get('activeWorkspaceId');
    if (activeId === id && workspaces.length > 0) {
      store.set('activeWorkspaceId', workspaces[0].id);
    }
    return true;
  });

  ipcMain.handle('workspace:get-active', () => {
    const activeId = store.get('activeWorkspaceId') as string;
    const workspaces = store.get('workspaces', []) as any[];
    return workspaces.find((w: any) => w.id === activeId) || workspaces[0] || null;
  });

  ipcMain.handle('workspace:set-active', (_, id: string) => {
    store.set('activeWorkspaceId', id);
    const workspaces = store.get('workspaces', []) as any[];
    return workspaces.find((w: any) => w.id === id) || null;
  });

  ipcMain.handle('show-selection-context-menu', (event) => {
    return new Promise((resolve) => {
      const menu = Menu.buildFromTemplate([
        {
          label: 'Send to document',
          click: () => resolve('send-to-doc'),
        },
      ]);
      const win = BrowserWindow.fromWebContents(event.sender);
      menu.popup({
        window: win ?? undefined,
        callback: () => resolve(null),
      });
    });
  });

  // Register offline filesystem handlers
  registerOfflineHandlers();

  // Remove default application menu
  Menu.setApplicationMenu(null);

  createWindow();

  // Toggle DevTools with F12
  globalShortcut.register('F12', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.toggleDevTools();
    }
  });
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
