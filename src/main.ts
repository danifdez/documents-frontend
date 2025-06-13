import { app, BaseWindow, BrowserWindow, ipcMain, WebContentsView, screen, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import FormData from 'form-data';
import Store from 'electron-store';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

if (require('electron-squirrel-startup')) {
  app.quit();
}

let activeBrowserView: WebContentsView | null = null;
const API_URL = 'http://backend:3000';
const store = new Store();

const createWindow = () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const mainWindow = new BrowserWindow({
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

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();
};

const createBrowserWindow = (projectId: string) => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const win = new BaseWindow({ width, height });

  const toolbarView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  toolbarView.webContents.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/browser-toolbar`);
  win.contentView.addChildView(toolbarView);

  const browserView = new WebContentsView();
  browserView.webContents.loadURL('https://github.com/electron/electron');

  // Open DevTools for browser view
  //browserView.webContents.openDevTools();

  browserView.webContents.on('did-navigate', (event, url) => {
    toolbarView.webContents.send('url-changed', url);
    toolbarView.webContents.send('project-id', projectId);
  });
  win.contentView.addChildView(browserView);

  toolbarView.setBounds({ x: 0, y: 0, width: width, height: 100 });
  browserView.setBounds({ x: 0, y: 100, width: width, height: height - 100 });

  activeBrowserView = browserView;

  toolbarView.webContents.openDevTools();
};

app.whenReady().then(() => {
  ipcMain.handle('open-external-browser', (_, projectId: string) => {
    createBrowserWindow(projectId);
  });

  ipcMain.handle('navigate-to', (_, url) => {
    if (activeBrowserView && activeBrowserView.webContents) {
      activeBrowserView.webContents.loadURL(url);
      return true;
    }
    return false;
  });

  ipcMain.handle("extract-content", async (_, idProject) => {
    if (!activeBrowserView || !activeBrowserView.webContents) {
      console.error("Error: activeBrowserView is not initialized.");
      return;
    }

    try {
      const content = await activeBrowserView.webContents.executeJavaScript(`document.documentElement.outerHTML`);
      const title = await activeBrowserView.webContents.executeJavaScript(`document.title`);
      const url = await activeBrowserView.webContents.executeJavaScript(`window.location.href`);

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
      formData.append('projectId', idProject);
      formData.append('type', 'webpage');
      formData.append('url', url);

      const uploadResponse = await axios.post(`${API_URL}/resources/upload`, formData, {
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

      formData.append('file', fileStream);
      formData.append('name', fileName);
      formData.append('projectId', idProject);

      const uploadResponse = await axios.post(`${API_URL}/resources/upload`, formData, {
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
        { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'htm', 'html'] }
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
      paragraphSpacing: 1.5
    });
  });

  ipcMain.handle('settings:set', (_event, settings) => {
    store.set('settings', settings);
    return true;
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
