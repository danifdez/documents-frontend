import { app, BrowserWindow, ipcMain, Notification, screen, dialog, Menu, globalShortcut, session, shell, Tray, nativeImage } from 'electron';
import { localEngine } from './main/voice/localEngine';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import FormData from 'form-data';
import Store from 'electron-store';
import { registerOfflineHandlers } from './main-offline';
import { standaloneManager } from './services/standalone/standalone-manager';
import { checkInstalled, isStandaloneReady, downloadComponent, downloadAll, installModels, uninstallServices, uninstallModels, detectGpu } from './services/standalone/download-manager';
import {
  bootstrapBuiltInThemes,
  listThemes,
  installFromDialog as installThemeFromDialog,
  uninstall as uninstallTheme,
  readThemeAssets,
} from './services/themes/theme-manager';

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

// Single-instance lock (Cambio #11 — T02). A second invocation of the
// executable must exit immediately, surfacing the running instance instead.
// Without this, two processes race for the standalone backend ports.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  // Hard-exit so the rest of this module (IPC handlers, store, services)
  // never evaluates in the doomed second process.
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;

// Tray state (Cambio #11 — T03). `trayUnavailable` is consumed by T05
// (`window-all-closed` / `mainWindow.on('close')`) and by T08 (Settings UI
// disables tray-dependent controls when the OS has no system tray).
let tray: Tray | null = null;
let trayUnavailable = false;

// `true` when the process is on its way out for real (tray Exit, before-quit
// triggered by the OS, etc.). The `mainWindow.on('close')` interceptor (T05)
// reads this flag to decide whether to hide the window or let it die.
let isQuitting = false;

// Linux notification actions depend on the desktop environment and libnotify
// caps; behaviour varies enough that we keep "Done" off there and fall back
// to click-only. macOS and Windows render actions reliably.
const SUPPORTS_NOTIFICATION_ACTIONS = process.platform === 'darwin' || process.platform === 'win32';

const store = new Store();

// Ensure workspaces key exists
if (!store.get('workspaces')) {
  store.set('workspaces', []);
}

function getApiUrl(): string {
  // If standalone services are running, use them
  const localUrl = standaloneManager.getBackendUrl();
  if (localUrl) return localUrl;

  const activeId = store.get('activeWorkspaceId') as string;
  const workspaces = store.get('workspaces', []) as any[];
  const active = workspaces.find((w: any) => w.id === activeId);
  return active?.url || import.meta.env.VITE_API_URL || 'http://localhost:3000';
}

function formatLocalTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return iso;
  }
}

// Tray icon resolution (Cambio #11 — T01). Copied to `<outDir>/assets/tray/`
// by the `copyTrayAssets` Vite plugin so it works in both dev and packaged
// builds. macOS expects the `*Template.png` naming so the OS auto-recolors
// for Light/Dark menu bar themes.
function getTrayIconPath(): string {
  const filename = process.platform === 'darwin' ? 'tray-iconTemplate.png' : 'tray-icon.png';
  return path.join(__dirname, 'assets', 'tray', filename);
}

function focusMainWindow() {
  // Cambio #11 — T09. Recreate the window if it was destroyed (e.g. via
  // devtools), show it if hidden in the tray, restore if minimised, then
  // focus. Callers that follow up with an IPC must use
  // `focusMainWindowAndSend` so the message waits for `did-finish-load`
  // when a recreation happens.
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
}

// Bring the main window to the front and send an IPC to its renderer.
// Used by notification click handlers — the recreated path waits for the
// renderer to finish loading before delivering the message.
function focusMainWindowAndSend(channel: string, ...args: any[]) {
  const wasDestroyed = !mainWindow || mainWindow.isDestroyed();
  focusMainWindow();
  if (!mainWindow) return;
  if (wasDestroyed) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.send(channel, ...args);
    });
  } else {
    mainWindow.webContents.send(channel, ...args);
  }
}

// Toggle the main window from the tray (Cambio #11 — T03). Hides it when
// visible, shows + focuses it otherwise. Recreates the window if it was
// destroyed (e.g. via devtools).
function toggleMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
    mainWindow.hide();
  } else {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
}

function buildTrayMenu(): Menu {
  return Menu.buildFromTemplate([
    {
      label: 'Show / Hide window',
      click: () => toggleMainWindow(),
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
}

/**
 * Hidden start mode (Cambio #11 — T07). Used by `launchAtLogin` (T04) to
 * wake the app at session start without showing the window: the user sees
 * the tray icon (signal that the app is loaded) but no surprise window.
 */
function shouldStartHidden(): boolean {
  return process.argv.includes('--hidden');
}

// Cambio #11 — T10. Eager preload of the local Whisper model when the user
// opts in via `settings.preloadVoiceModel`. Fire-and-forget: the helper
// swallows its own errors so a missing binding never blocks startup.
async function maybePreloadVoiceModel() {
  const settings = store.get('settings') as Record<string, any> | undefined;
  if (!settings?.preloadVoiceModel) return;
  if (!localEngine.isAvailable()) {
    console.log('[voice] preload skipped: local engine not available');
    return;
  }
  try {
    if (!(await localEngine.hasModel())) {
      console.log('[voice] preload skipped: model not downloaded');
      return;
    }
    console.log('[voice] eager preload starting');
    await localEngine.preload();
    console.log('[voice] eager preload done');
  } catch (err: any) {
    console.warn('[voice] eager preload failed:', err?.message ?? err);
  }
}

// Read the user's close-behaviour preference at runtime (Cambio #11 — T05).
// Default `'tray'` matches the cambio's main premise — the user opts into
// the classic "X quits" model explicitly.
function getCloseBehavior(): 'tray' | 'quit' {
  const settings = store.get('settings') as Record<string, any> | undefined;
  return settings?.closeBehavior === 'quit' ? 'quit' : 'tray';
}

// Apply the side effects of the residente/tray preferences (Cambio #11 — T04).
// Called from `settings:set` and at boot to reapply persisted settings.
function applySettingsEffects(
  settings: Record<string, any>,
  previous: Record<string, any> | null,
) {
  // launchAtLogin — macOS + Windows supported natively. Linux requires
  // writing a `.desktop` file manually, out of scope here.
  if (process.platform !== 'linux') {
    if (settings.launchAtLogin !== previous?.launchAtLogin) {
      app.setLoginItemSettings({
        openAtLogin: !!settings.launchAtLogin,
        args: ['--hidden'],
      });
    }
  }

  // toggleShortcut — re-register the global shortcut when it changes.
  const prevShortcut = previous?.toggleShortcut ?? null;
  const newShortcut = settings.toggleShortcut ?? null;
  if (prevShortcut !== newShortcut) {
    if (prevShortcut) {
      try { globalShortcut.unregister(prevShortcut); } catch { /* no-op */ }
    }
    if (newShortcut) {
      const ok = globalShortcut.register(newShortcut, () => toggleMainWindow());
      if (!ok) {
        console.warn('[settings] failed to register global shortcut', newShortcut);
      }
    }
  }

  // hideDockIcon — macOS only. `app.dock` is undefined on other platforms.
  if (process.platform === 'darwin' && settings.hideDockIcon !== previous?.hideDockIcon) {
    if (settings.hideDockIcon) {
      app.dock?.hide();
    } else {
      app.dock?.show();
    }
  }

  // closeBehavior — no boot-time side effect. Read in runtime from the
  // `close` and `window-all-closed` handlers (T05).
}

function createTray() {
  try {
    const iconPath = getTrayIconPath();
    const image = nativeImage.createFromPath(iconPath);
    if (image.isEmpty()) {
      console.warn('[tray] icon image is empty at', iconPath);
      trayUnavailable = true;
      return;
    }
    if (process.platform === 'darwin') {
      image.setTemplateImage(true);
    }
    tray = new Tray(image);
    tray.setToolTip('documents-frontend');
    tray.setContextMenu(buildTrayMenu());

    if (process.platform !== 'darwin') {
      // Windows/Linux: left click toggles, right click opens the menu
      // (handled automatically when `setContextMenu` is configured).
      tray.on('click', () => toggleMainWindow());
    }
    // macOS: left click already opens the context menu, no extra handler.
  } catch (err: any) {
    console.warn('[tray] failed to initialize:', err?.message ?? err);
    trayUnavailable = true;
    tray = null;
  }
}

async function markEventOccurrenceDone(eventId: number, occurrenceStart: string) {
  try {
    const encoded = encodeURIComponent(occurrenceStart);
    await axios.post(`${getApiUrl()}/calendar-events/${eventId}/occurrences/${encoded}/complete`);
  } catch (err: any) {
    console.error('[calendar] markEventOccurrenceDone failed', {
      eventId,
      occurrenceStart,
      message: err?.message,
    });
  }
}

// Cambio #11 — T06. Didactic toast shown the first time the user hides the
// window to the tray. Without it, the first close confuses the user (they
// think they quit the app and reopen it expecting cold-start cost).
function maybeShowFirstCloseToast() {
  const flags = (store.get('flags') as Record<string, any> | undefined) ?? {};
  if (flags.hasSeenTrayHint) return;
  if (!Notification.isSupported()) {
    // Without notification support, skip marking the flag — the user can
    // see the hint on a future session if the OS gains support.
    return;
  }
  const n = new Notification({
    title: 'documents-frontend keeps running',
    body: 'The app stays active in the system tray. Use Exit from the tray menu to quit.',
    silent: false,
  });
  n.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
  n.show();
  // Persist only after the call to `show()` so a silent failure of the
  // OS notification daemon means the user gets a second chance later.
  store.set('flags', { ...flags, hasSeenTrayHint: true });
}

function showAlarmNotification(payload: {
  eventId: number;
  occurrenceStart: string;
  title: string;
  alarmLabel: string | null;
  trackCompletion: boolean;
}) {
  if (!Notification.isSupported()) return;
  const canShowDone = payload.trackCompletion && SUPPORTS_NOTIFICATION_ACTIONS;
  const n = new Notification({
    title: payload.alarmLabel || payload.title,
    body: formatLocalTime(payload.occurrenceStart),
    silent: false,
    actions: canShowDone ? [{ type: 'button', text: 'Done' }] : undefined,
  });
  n.on('click', () => {
    focusMainWindowAndSend('calendar:navigate', payload.eventId);
  });
  if (canShowDone) {
    n.on('action', (_e, index) => {
      if (index === 0) {
        markEventOccurrenceDone(payload.eventId, payload.occurrenceStart);
      }
    });
  }
  n.show();
}

async function completeTask(taskId: number) {
  try {
    await axios.patch(`${getApiUrl()}/user-tasks/${taskId}`, { status: 'completed' });
  } catch (err: any) {
    console.error('[tasks] completeTask failed', { taskId, message: err?.message });
  }
}

function showTaskReminderNotification(payload: {
  taskId: number;
  title: string;
  reminderAt: string;
}) {
  if (!Notification.isSupported()) return;
  const canShowDone = SUPPORTS_NOTIFICATION_ACTIONS;
  const n = new Notification({
    title: payload.title,
    body: `Reminder · ${formatLocalTime(payload.reminderAt)}`,
    silent: false,
    actions: canShowDone ? [{ type: 'button', text: 'Done' }] : undefined,
  });
  n.on('click', () => {
    focusMainWindowAndSend('task:navigate', payload.taskId);
  });
  if (canShowDone) {
    n.on('action', (_e, index) => {
      if (index === 0) {
        completeTask(payload.taskId);
      }
    });
  }
  n.show();
}

function showTaskMissedAggregate(payload: {
  items: Array<{ taskId: number; title: string; reminderAt: string }>;
}) {
  if (!Notification.isSupported()) return;
  const count = payload.items.length;
  if (count === 0) return;
  const titles = payload.items.slice(0, 4).map((i) => i.title).join(', ');
  const suffix = count > 4 ? ', …' : '';
  const singleItem = count === 1 ? payload.items[0] : null;
  const canShowDone = singleItem !== null && SUPPORTS_NOTIFICATION_ACTIONS;
  const n = new Notification({
    title: `${count} missed task reminder${count === 1 ? '' : 's'}`,
    body: `${titles}${suffix}`,
    silent: false,
    actions: canShowDone ? [{ type: 'button', text: 'Done' }] : undefined,
  });
  n.on('click', () => {
    focusMainWindowAndSend('task:navigate-missed-panel');
  });
  if (canShowDone && singleItem) {
    n.on('action', (_e, index) => {
      if (index === 0) completeTask(singleItem.taskId);
    });
  }
  n.show();
}

function showMissedAggregate(payload: {
  items: Array<{
    eventId: number;
    occurrenceStart: string;
    title: string;
    alarmLabel: string | null;
    trackCompletion: boolean;
  }>;
}) {
  if (!Notification.isSupported()) return;
  const count = payload.items.length;
  if (count === 0) return;
  const titles = payload.items
    .slice(0, 4)
    .map((i) => i.alarmLabel || i.title)
    .join(', ');
  const suffix = count > 4 ? ', …' : '';
  const singleTrackable = count === 1 && payload.items[0].trackCompletion;
  const canShowDone = singleTrackable && SUPPORTS_NOTIFICATION_ACTIONS;
  const n = new Notification({
    title: `${count} missed alert${count === 1 ? '' : 's'}`,
    body: `${titles}${suffix}`,
    silent: false,
    actions: canShowDone ? [{ type: 'button', text: 'Done' }] : undefined,
  });
  n.on('click', () => {
    focusMainWindowAndSend('calendar:navigate-missed-panel');
  });
  if (canShowDone) {
    const item = payload.items[0];
    n.on('action', (_e, index) => {
      if (index === 0) {
        markEventOccurrenceDone(item.eventId, item.occurrenceStart);
      }
    });
  }
  n.show();
}

const createWindow = () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    backgroundColor: '#000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const startHidden = shouldStartHidden();

  // Show the window when ready, unless we are starting hidden (launchAtLogin
  // flow). In that case the window stays created but invisible — the user
  // brings it up from the tray or the global shortcut on demand.
  mainWindow.once('ready-to-show', () => {
    if (!startHidden) {
      mainWindow?.show();
    }
  });

  // Cambio #11 — T05. Close = hide when running in tray mode. The window
  // is destroyed only on real exits (tray Exit, OS shutdown). This is the
  // pivot that makes the app residente — without this, the tray icon and
  // preferences are cosmetic.
  mainWindow.on('close', (event) => {
    if (isQuitting) return;                       // real exit, let it through
    if (trayUnavailable) return;                  // no tray to hide into
    if (getCloseBehavior() !== 'tray') return;    // user opted into 'quit'
    event.preventDefault();
    mainWindow?.hide();
    maybeShowFirstCloseToast();
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // `maximize()` can implicitly call `.show()` on Windows/Linux which would
  // flash the window before we hide it. Skip when starting hidden — the
  // window keeps its constructor-time size and the user maximises if wanted.
  if (!startHidden) {
    mainWindow.maximize();
  }

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();
};

const createBrowserWindow = (projectId?: string) => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const win = new BrowserWindow({
    width,
    height,
    backgroundColor: '#000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
    },
  });

  win.once('ready-to-show', () => {
    win.show();
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
  // Grant microphone permissions to the renderer. Without this getUserMedia
  // hangs indefinitely: Electron does not propagate the request to the OS
  // by default. Only the permissions actively used by the app are granted.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    if (permission === 'media' || permission === 'mediaKeySystem') {
      return callback(true);
    }
    callback(false);
  });
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => {
    return permission === 'media' || permission === 'mediaKeySystem';
  });

  // ── Local voice engine ───────────────────────────────────────────────
  // The engine is only actually available if the native bindings load
  // (see `main/voice/localEngine.ts`). When they don't, `isAvailable`
  // returns `false` and the renderer factory falls back to the remote driver.
  ipcMain.handle('voice:local:isAvailable', () => localEngine.isAvailable());
  ipcMain.handle('voice:local:hasModel', () => localEngine.hasModel());
  ipcMain.handle('voice:local:preload', async (event) => {
    localEngine.bindRenderer(event.sender);
    return localEngine.preload();
  });
  ipcMain.handle('voice:local:start', async (event) => {
    localEngine.bindRenderer(event.sender);
    return localEngine.startSession();
  });
  ipcMain.handle('voice:local:chunk', (_e, sessionId: string, buf: ArrayBuffer | Uint8Array) => {
    const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf as ArrayBuffer);
    localEngine.pushChunk(sessionId, b);
  });
  ipcMain.handle('voice:local:stop', (_e, sessionId: string) => localEngine.stopSession(sessionId));
  ipcMain.handle('voice:local:cancel', (_e, sessionId: string) => localEngine.cancelSession(sessionId));

  ipcMain.handle('open-external-browser', (_, projectId?: string) => {
    createBrowserWindow(projectId);
  });

  ipcMain.handle('navigate-main-window', (_, route: string) => {
    // Cambio #11 — T09. Use the robust helper so navigation works also when
    // the main window is hidden in the tray or had to be recreated.
    focusMainWindowAndSend('navigate-to-route', route);
  });

  ipcMain.handle('calendar:show-alarm', (_, payload: {
    eventId: number;
    occurrenceStart: string;
    title: string;
    alarmLabel: string | null;
    trackCompletion: boolean;
  }) => {
    showAlarmNotification(payload);
  });

  ipcMain.handle('calendar:show-missed-aggregate', (_, payload: {
    items: Array<{
      eventId: number;
      occurrenceStart: string;
      title: string;
      alarmLabel: string | null;
      trackCompletion: boolean;
    }>;
  }) => {
    showMissedAggregate(payload);
  });

  ipcMain.handle('task:show-reminder', (_, payload: {
    taskId: number;
    title: string;
    reminderAt: string;
  }) => {
    showTaskReminderNotification(payload);
  });

  ipcMain.handle('task:show-missed-aggregate', (_, payload: {
    items: Array<{ taskId: number; title: string; reminderAt: string }>;
  }) => {
    showTaskMissedAggregate(payload);
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

  ipcMain.handle('shell:open-path', async (_event, targetPath: string) => {
    if (!targetPath || typeof targetPath !== 'string') {
      return { ok: false, error: 'invalid_path' };
    }
    try {
      const err = await shell.openPath(targetPath);
      if (err) return { ok: false, error: err };
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'open_path_failed' };
    }
  });

  ipcMain.handle('shell:show-item-in-folder', (_event, targetPath: string) => {
    if (!targetPath || typeof targetPath !== 'string') {
      return { ok: false };
    }
    try {
      shell.showItemInFolder(targetPath);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

  ipcMain.handle('folder-scope:pick', async (_event, opts?: { title?: string }) => {
    const win = BrowserWindow.getFocusedWindow() ?? mainWindow ?? undefined;
    console.log('[folder-scope] picker opened');
    const result = win
      ? await dialog.showOpenDialog(win, {
          properties: ['openDirectory', 'createDirectory'],
          title: opts?.title ?? 'Pick the working folder',
        })
      : await dialog.showOpenDialog({
          properties: ['openDirectory', 'createDirectory'],
          title: opts?.title ?? 'Pick the working folder',
        });

    if (result.canceled || result.filePaths.length === 0) {
      console.log('[folder-scope] picker cancelled');
      return null;
    }

    console.log('[folder-scope] picker confirmed');
    return result.filePaths[0];
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
      theme: 'dark',
      themeId: 'default',
      defaultBrowserUrl: 'https://github.com/electron/electron',
      disabledFeatures: [],
      // Tray / residente — Cambio #11. Defaults only apply when the store
      // has no `settings` yet; users with existing persisted settings will
      // see `undefined` here and consumers fall back to these values via
      // `?? <default>` locally.
      closeBehavior: 'tray',
      launchAtLogin: false,
      toggleShortcut: null,
      hideDockIcon: false,
      // Preload of the local Whisper model on startup (Cambio #11 — T10).
      preloadVoiceModel: false,
    });
  });

  ipcMain.handle('settings:set', (_event, settings) => {
    const previous = store.get('settings') as Record<string, any> | undefined;
    store.set('settings', settings);
    applySettingsEffects(settings, previous ?? null);
    const shortcutOk = settings?.toggleShortcut
      ? globalShortcut.isRegistered(settings.toggleShortcut)
      : true;
    return { ok: true, shortcutOk };
  });

  // ── Cambio #11 — T06: dev-only handler to reset the first-close hint
  // so the didactic toast can be re-tested without hand-editing the store.
  if (process.env.NODE_ENV === 'development') {
    ipcMain.handle('debug:reset-tray-hint', () => {
      const flags = (store.get('flags') as Record<string, any> | undefined) ?? {};
      delete flags.hasSeenTrayHint;
      store.set('flags', flags);
      return { ok: true };
    });
  }

  // ── Cambio #11 — T08: expose tray availability to the renderer so the
  // Settings UI can disable tray-dependent controls when the OS has no
  // system tray (e.g. GNOME without AppIndicator).
  ipcMain.handle('app:tray-available', () => !trayUnavailable);

  // ── Cambio #11 — T08: expose process.platform to the renderer to gate
  // platform-specific toggles (`launchAtLogin` Linux, `hideDockIcon` macOS).
  ipcMain.handle('app:get-platform', () => process.platform);

  // ── Theme IPC handlers ──
  ipcMain.handle('themes:list', () => {
    return listThemes().map((t) => ({
      manifest: t.manifest,
      builtIn: t.builtIn,
    }));
  });

  ipcMain.handle('themes:install', async () => {
    return installThemeFromDialog();
  });

  ipcMain.handle('themes:uninstall', (_event, id: string) => {
    return uninstallTheme(id);
  });

  ipcMain.handle('themes:read-assets', (_event, id: string) => {
    return readThemeAssets(id);
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

  ipcMain.handle('workspace:set-default', (_, id: string | null) => {
    store.set('defaultWorkspaceId', id);
    return true;
  });

  ipcMain.handle('workspace:get-default', () => {
    return store.get('defaultWorkspaceId', null);
  });

  // ── Local server (standalone) IPC handlers ──
  ipcMain.handle('standalone:check-installed', () => {
    return checkInstalled();
  });

  ipcMain.handle('standalone:is-ready', () => {
    return isStandaloneReady();
  });

  ipcMain.handle('standalone:detect-gpu', () => {
    return detectGpu();
  });

  ipcMain.handle('standalone:download-all', async () => {
    try {
      await downloadAll((progress) => {
        mainWindow?.webContents.send('standalone:download-progress', progress);
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('standalone:download-component', async (_, component: string) => {
    try {
      await downloadComponent(component, (progress) => {
        mainWindow?.webContents.send('standalone:download-progress', progress);
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('standalone:uninstall-services', async () => {
    try {
      await standaloneManager.stop();
      await uninstallServices();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('standalone:install-models', async (_, variant: string) => {
    try {
      await installModels(variant as 'models-cpu' | 'models-gpu', (progress) => {
        mainWindow?.webContents.send('standalone:download-progress', progress);
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('standalone:uninstall-models', async () => {
    try {
      await uninstallModels();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('standalone:start', async () => {
    try {
      const url = await standaloneManager.start();
      return { success: true, url };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('standalone:stop', async () => {
    try {
      await standaloneManager.stop();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('standalone:status', () => {
    return standaloneManager.getStatus();
  });

  ipcMain.handle('standalone:get-url', () => {
    return standaloneManager.getBackendUrl();
  });

  ipcMain.handle('show-selection-context-menu', (event) => {
    return new Promise((resolve) => {
      const menu = Menu.buildFromTemplate([
        {
          label: 'Send to document',
          click: () => resolve('send-to-doc'),
        },
        {
          label: 'Lookup related information',
          click: () => resolve('lookup'),
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

  // Ensure built-in themes exist on disk
  bootstrapBuiltInThemes();

  // Remove default application menu
  Menu.setApplicationMenu(null);

  createWindow();
  createTray();

  // Cambio #11 — T04. Reapply persisted residente settings: register the
  // user's global shortcut (Electron drops it between sessions) and refresh
  // the macOS dock visibility. `launchAtLogin` is already honoured by the
  // OS, but reapplying is harmless and keeps the call site uniform.
  const initialSettings = store.get('settings') as Record<string, any> | undefined;
  if (initialSettings) {
    applySettingsEffects(initialSettings, null);
  }

  // Toggle DevTools with F12
  globalShortcut.register('F12', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      focusedWindow.webContents.toggleDevTools();
    }
  });

  // Cambio #11 — T10. Preload the local Whisper model if the user opted in.
  // Fire-and-forget — never blocks `ready-to-show`.
  void maybePreloadVoiceModel();
});

app.on('before-quit', async () => {
  // Mark the exit as real BEFORE any await so a stray `mainWindow.close()`
  // racing with the standalone stop sees the flag and dies cleanly instead
  // of being intercepted by the tray-hide handler.
  isQuitting = true;
  // Unregister the user's global shortcut here (and not in
  // `window-all-closed`, which T05 makes a no-op when running in tray mode).
  globalShortcut.unregisterAll();
  // Destroy the tray icon up front so it disappears from the OS even if
  // the async stops below stall.
  if (tray) {
    tray.destroy();
    tray = null;
  }
  await standaloneManager.stop();
  await localEngine.shutdown();
});

app.on('window-all-closed', () => {
  // Cambio #11 — T05. In tray mode the process must outlive its windows.
  // Only fall back to the classic "quit on last window" when the tray is
  // unusable or the user explicitly chose `closeBehavior = 'quit'`.
  if (isQuitting) return;
  if (trayUnavailable || getCloseBehavior() === 'quit') {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }
});

app.on('activate', () => {
  // Cambio #11 — T05. With the residente mode the main window is usually
  // hidden, not destroyed. Show + focus instead of recreating.
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (!mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
    return;
  }
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Cambio #11 — T02. Surface the primary window when a second instance is
// launched. The second process has already called `app.quit()` (see the
// `requestSingleInstanceLock` block at the top of this module) by the time
// this fires.
app.on('second-instance', () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
});
