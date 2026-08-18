import { app, BrowserWindow, Notification, screen, Menu, globalShortcut, session, Tray, nativeImage } from 'electron';
import { localEngine } from './main/voice/localEngine';
import path from 'path';
import axios from 'axios';
import Store from 'electron-store';
import squirrelStartup from 'electron-squirrel-startup';
import { registerOfflineHandlers } from './main-offline';
import { standaloneManager } from './services/standalone/standalone-manager';
import { checkInstalled } from './services/standalone/download-manager';
import { registerStandaloneHandlers, resolveStandaloneFeatures } from './main/standalone-handlers';
import { IpcEvents } from './ipc/channels';
import { registerIpcHandlers } from './main/ipc/registry';
import { createVoiceHandlers } from './main/ipc/voice-handlers';
import { createNotificationHandlers } from './main/ipc/notification-handlers';
import { createFileHandlers } from './main/ipc/file-handlers';
import { createSettingsHandlers } from './main/ipc/settings-handlers';
import { createWorkspaceHandlers } from './main/ipc/workspace-handlers';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

// Imported (not require()'d) so Vite bundles it into main.js — a bare require()
// stays external and the dependency is not shipped in the packaged app.
if (squirrelStartup) {
  app.quit();
}

if (!app.isPackaged) {
  app.setName('documents-frontend-dev');
  app.setPath('userData', path.join(app.getPath('appData'), 'documents-frontend-dev'));
}

// Single-instance lock. A second invocation of the
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
let splashWindow: BrowserWindow | null = null;

// Tray state. `trayUnavailable` is consumed by T05
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

// Tray icon resolution. Copied to `<outDir>/assets/tray/`
// by the `copyTrayAssets` Vite plugin so it works in both dev and packaged
// builds. macOS expects the `*Template.png` naming so the OS auto-recolors
// for Light/Dark menu bar themes.
function getTrayIconPath(): string {
  const filename = process.platform === 'darwin' ? 'tray-iconTemplate.png' : 'tray-icon.png';
  return path.join(__dirname, 'assets', 'tray', filename);
}

function focusMainWindow() {
  // Recreate the window if it was destroyed (e.g. via
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

// Toggle the main window from the tray. Hides it when
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
 * Hidden start mode. Used by `launchAtLogin` (T04) to
 * wake the app at session start without showing the window: the user sees
 * the tray icon (signal that the app is loaded) but no surprise window.
 */
function shouldStartHidden(): boolean {
  return process.argv.includes('--hidden');
}

// Eager preload of the local Whisper model when the user
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

// Read the user's close-behaviour preference at runtime.
// the classic "X quits" model explicitly.
function getCloseBehavior(): 'tray' | 'quit' {
  const settings = store.get('settings') as Record<string, any> | undefined;
  return settings?.closeBehavior === 'quit' ? 'quit' : 'tray';
}

// Apply the side effects of the residente/tray preferences.
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

// Didactic toast shown the first time the user hides the
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

// Every app notification shares one shape: click routes into the window, and an
// optional "Done" button completes the underlying item where the OS supports
// notification actions.
function showActionableNotification(opts: {
  title: string;
  body: string;
  onClick: () => void;
  onDone?: () => void;
}) {
  if (!Notification.isSupported()) return;
  const canShowDone = !!opts.onDone && SUPPORTS_NOTIFICATION_ACTIONS;
  const n = new Notification({
    title: opts.title,
    body: opts.body,
    silent: false,
    actions: canShowDone ? [{ type: 'button', text: 'Done' }] : undefined,
  });
  n.on('click', opts.onClick);
  if (canShowDone) {
    n.on('action', (_e, index) => {
      if (index === 0) opts.onDone!();
    });
  }
  n.show();
}

function summarizeLabels(labels: string[]): string {
  return labels.slice(0, 4).join(', ') + (labels.length > 4 ? ', …' : '');
}

function showAlarmNotification(payload: {
  eventId: number;
  occurrenceStart: string;
  title: string;
  alarmLabel: string | null;
  trackCompletion: boolean;
}) {
  showActionableNotification({
    title: payload.alarmLabel || payload.title,
    body: formatLocalTime(payload.occurrenceStart),
    onClick: () => focusMainWindowAndSend(IpcEvents.calendar.navigate, payload.eventId),
    onDone: payload.trackCompletion
      ? () => markEventOccurrenceDone(payload.eventId, payload.occurrenceStart)
      : undefined,
  });
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
  showActionableNotification({
    title: payload.title,
    body: `Reminder · ${formatLocalTime(payload.reminderAt)}`,
    onClick: () => focusMainWindowAndSend(IpcEvents.task.navigate, payload.taskId),
    onDone: () => completeTask(payload.taskId),
  });
}

function showTaskMissedAggregate(payload: {
  items: Array<{ taskId: number; title: string; reminderAt: string }>;
}) {
  const count = payload.items.length;
  if (count === 0) return;
  const singleItem = count === 1 ? payload.items[0] : null;
  showActionableNotification({
    title: `${count} missed task reminder${count === 1 ? '' : 's'}`,
    body: summarizeLabels(payload.items.map((i) => i.title)),
    onClick: () => focusMainWindowAndSend(IpcEvents.task.navigateMissedPanel),
    onDone: singleItem ? () => completeTask(singleItem.taskId) : undefined,
  });
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
  const count = payload.items.length;
  if (count === 0) return;
  const single = count === 1 && payload.items[0].trackCompletion ? payload.items[0] : null;
  showActionableNotification({
    title: `${count} missed alert${count === 1 ? '' : 's'}`,
    body: summarizeLabels(payload.items.map((i) => i.alarmLabel || i.title)),
    onClick: () => focusMainWindowAndSend(IpcEvents.calendar.navigateMissedPanel),
    onDone: single
      ? () => markEventOccurrenceDone(single.eventId, single.occurrenceStart)
      : undefined,
  });
}

function createSplashWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  splashWindow = new BrowserWindow({
    width: Math.min(420, Math.floor(width * 0.4)),
    height: Math.min(280, Math.floor(height * 0.35)),
    resizable: false,
    frame: false,
    show: true,
    alwaysOnTop: true,
    webPreferences: {
      devTools: false,
    },
  });

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Documents</title><style>html,body{margin:0;height:100%}body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial;background:#000;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:22px}.spinner{width:42px;height:42px;border-radius:50%;border:3px solid rgba(255,255,255,0.15);border-top-color:#2563eb;animation:spin 0.9s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.label{font-size:15px;color:#cbd5e1;letter-spacing:.2px}</style></head><body><div class="spinner"></div><div class="label">Starting Documents…</div></body></html>`;

  splashWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
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

  // Close = hide when running in tray mode. The window
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

  // Open DevTools automatically in development.
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
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

  // ── Renderer-invoked IPC. One declarative map per domain; spread order
  // mirrors the previous inline registration order.
  registerIpcHandlers({
    ...createVoiceHandlers(),
    ...createNotificationHandlers({
      showAlarmNotification,
      showMissedAggregate,
      showTaskReminderNotification,
      showTaskMissedAggregate,
    }),
    ...createFileHandlers({ getApiUrl, getMainWindow: () => mainWindow }),
    ...createSettingsHandlers({
      store,
      applySettingsEffects,
      isTrayAvailable: () => !trayUnavailable,
    }),
    ...createWorkspaceHandlers(store),
  });

  // ── Local server (standalone) IPC handlers ──
  registerStandaloneHandlers({ store, getMainWindow: () => mainWindow });

  // Register offline filesystem handlers
  registerOfflineHandlers();

  // Remove default application menu
  Menu.setApplicationMenu(null);

  // Show a splash window only when the app is packaged and standalone
  // services are present on disk. Otherwise keep the usual behavior.
  const services = checkInstalled();
  const showSplash = app.isPackaged && (services.backend || services.postgres || services.models);

  if (showSplash) {
    createSplashWindow();
    createTray();

    // The splash is just a loading screen, so kick off the local services here
    // instead of waiting for a user action. Features come from the profile the
    // wizard saved (omitted features are off; the rest stay default-on).
    standaloneManager.start({ features: resolveStandaloneFeatures(store) }).catch((err) => {
      console.error('Standalone services failed to start:', err);
    });

    // Poll until the backend is up, then swap the splash for the main window.
    const splashPoll = setInterval(() => {
      try {
        const status = standaloneManager.getStatus();
        if (status.services.backend === 'running') {
          if (!mainWindow || mainWindow.isDestroyed()) {
            createWindow();
          }
          if (mainWindow && !mainWindow.isVisible()) mainWindow.show();
          if (splashWindow) {
            try { splashWindow.close(); } catch {}
            splashWindow = null;
          }
          clearInterval(splashPoll);
        }
      } catch (e) {
        console.error('Error polling standalone status:', e);
      }
    }, 1000);
  } else {
    createWindow();
    createTray();
  }

  // Reapply persisted residente settings: register the
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

  // Preload the local Whisper model if the user opted in.
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
  // In tray mode the process must outlive its windows.
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
  // With the residente mode the main window is usually
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

// Surface the primary window when a second instance is
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
