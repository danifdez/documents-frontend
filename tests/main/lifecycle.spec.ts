// @vitest-environment node
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IpcChannels, IpcEvents, type IpcChannel } from '@/ipc/channels';

const state = vi.hoisted(() => ({
  windows: [] as StubWindow[],
  notifications: [] as StubNotification[],
  trayClick: vi.fn(),
  trayDestroy: vi.fn(),
  trayMenu: vi.fn(),
  shortcuts: new Map<string, () => void>(),
  handlers: new Map<string, (...args: unknown[]) => unknown>(),
  storage: new Map<string, unknown>(),
  standalone: {
    start: vi.fn(), stop: vi.fn(), getStatus: vi.fn(), getBackendUrl: vi.fn(),
  },
  downloader: { checkInstalled: vi.fn(), downloadAll: vi.fn(), uninstallServices: vi.fn() },
  voice: { isAvailable: vi.fn(), hasModel: vi.fn(), preload: vi.fn(), shutdown: vi.fn() },
  evaluationProfile: vi.fn(),
  startEvaluation: vi.fn(),
  fsRemove: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  nativeImage: { isEmpty: vi.fn(), setTemplateImage: vi.fn(), resize: vi.fn() },
  notificationSupported: vi.fn(),
  confirm: vi.fn(),
  permissionRequest: vi.fn(),
  permissionCheck: vi.fn(),
  app: null as StubApp | null,
}));
type StubApp = EventEmitter & {
  isPackaged: boolean;
  quit: ReturnType<typeof vi.fn>;
  setPath: ReturnType<typeof vi.fn>;
  setAppUserModelId: ReturnType<typeof vi.fn>;
  setLoginItemSettings: ReturnType<typeof vi.fn>;
  requestSingleInstanceLock: ReturnType<typeof vi.fn>;
  dock: { show: ReturnType<typeof vi.fn>; hide: ReturnType<typeof vi.fn> };
};
type StubWindow = EventEmitter & {
  options: { show?: boolean; webPreferences?: { preload?: string } };
  webContents: EventEmitter & { send: ReturnType<typeof vi.fn>; toggleDevTools: ReturnType<typeof vi.fn> };
  visible: boolean;
  minimized: boolean;
  destroyed: boolean;
  close: () => void;
  destroy: () => void;
  loadURL: ReturnType<typeof vi.fn>;
  loadFile: ReturnType<typeof vi.fn>;
  focus: ReturnType<typeof vi.fn>;
  maximize: ReturnType<typeof vi.fn>;
};
type StubNotification = EventEmitter & { opts: { title: string; body: string; actions?: object[] }; show: ReturnType<typeof vi.fn> };

vi.mock('electron', async () => {
  const { EventEmitter } = await import('node:events');

  class Window extends EventEmitter {
    visible: boolean;
    destroyed = false;
    minimized = false;
    webContents = Object.assign(new EventEmitter(), {
      send: vi.fn(), toggleDevTools: vi.fn(), openDevTools: vi.fn(),
    });
    loadURL = vi.fn();
    loadFile = vi.fn();
    focus = vi.fn();
    maximize = vi.fn();

    constructor(public options: StubWindow['options']) {
      super();
      this.visible = !!options.show;
      state.windows.push(this);
    }
    hide() { this.visible = false; }
    show() { this.visible = true; }
    restore() { this.minimized = false; }
    isDestroyed() { return this.destroyed; }
    isMinimized() { return this.minimized; }
    isVisible() { return this.visible; }
    destroy() { this.destroyed = true; this.visible = false; this.emit('closed'); }
    close() {
      const event = { preventDefault: vi.fn() };
      this.emit('close', event);
      if (!event.preventDefault.mock.calls.length) this.destroy();
    }
    static getAllWindows() { return state.windows.filter(({ destroyed }) => !destroyed); }
    static getFocusedWindow() { return this.getAllWindows().find(({ visible }) => visible); }
  }

  class Notification extends EventEmitter {
    show = vi.fn();
    constructor(public opts: StubNotification['opts']) {
      super();
      state.notifications.push(this);
    }
    static isSupported() { return state.notificationSupported(); }
  }

  class Tray {
    setToolTip() {}
    setContextMenu = state.trayMenu;
    destroy = state.trayDestroy;
    on = state.trayClick;
  }

  const app = Object.assign(new EventEmitter(), {
    isPackaged: true, whenReady: () => Promise.resolve(),
    requestSingleInstanceLock: vi.fn(() => true), quit: vi.fn(), getPath: () => '/test-app-data',
    setPath: vi.fn(), setName: vi.fn(), setAppUserModelId: vi.fn(), setLoginItemSettings: vi.fn(),
    dock: { show: vi.fn(), hide: vi.fn() },
  });
  state.app = app;
  return {
    app,
    BrowserWindow: Window,
    Notification,
    Tray,
    dialog: { showMessageBox: state.confirm },
    nativeImage: { createFromPath: () => state.nativeImage },
    ipcMain: { handle: (channel: string, handler: (...args: unknown[]) => unknown) => state.handlers.set(channel, handler) },
    screen: {
      getPrimaryDisplay: () => ({ workAreaSize: { width: 1280, height: 800 } }),
      getCursorScreenPoint: () => ({ x: 100, y: 100 }),
      getDisplayNearestPoint: () => ({ workArea: { x: 0, y: 0, width: 1280, height: 800 } }),
    },
    Menu: { setApplicationMenu: vi.fn(), buildFromTemplate: (template: unknown) => template },
    globalShortcut: {
      register: (key: string, callback: () => void) => (state.shortcuts.set(key, callback), true),
      unregister: (key: string) => state.shortcuts.delete(key),
      isRegistered: (key: string) => state.shortcuts.has(key),
      unregisterAll: () => state.shortcuts.clear(),
    },
    session: { defaultSession: {
      setPermissionRequestHandler: state.permissionRequest,
      setPermissionCheckHandler: state.permissionCheck,
    } },
  };
});
vi.mock('electron-store', () => ({
  default: class Store {
    get(key: string, fallback?: unknown) { return state.storage.get(key) ?? fallback; }
    set(key: string, value: unknown) { state.storage.set(key, value); }
  },
}));
vi.mock('electron-squirrel-startup', () => ({ default: false }));
vi.mock('axios', () => ({ default: { post: state.post, patch: state.patch } }));
vi.mock('node:fs', async (original) => {
  const fs = await original<typeof import('node:fs') & { default: typeof import('node:fs') }>();
  return { ...fs, default: { ...fs.default, rmSync: state.fsRemove } };
});
vi.mock('@/main/voice/localEngine', () => ({ localEngine: state.voice, VOICE_LIMITS: {} }));
vi.mock('@/main/evaluation/profile', () => ({ evaluationProfile: state.evaluationProfile }));
vi.mock('@/main/evaluation/control', () => ({ startEvaluation: state.startEvaluation }));
vi.mock('@/services/standalone/standalone-manager', () => ({ standaloneManager: state.standalone }));
vi.mock('@/services/standalone/download-manager', () => state.downloader);
vi.mock('@/services/standalone/local-data', () => ({ getPersistentLocalDataDir: () => '/test/local-data' }));

const platformDescriptor = Object.getOwnPropertyDescriptor(process, 'platform')!;
const originalArgv = [...process.argv];
const quickShortcut = 'CommandOrControl+Shift+Space';
const ready = (window: StubWindow = state.windows[0]) => window.emit('ready-to-show');
const channel = (name: IpcChannel, ...args: unknown[]) => {
  const handle = state.handlers.get(name);
  expect(handle).toBeDefined();
  return handle!({}, ...args);
};
async function boot(options: {
  packaged?: boolean; installed?: boolean; platform?: NodeJS.Platform; hidden?: boolean; devServer?: boolean;
} = {}) {
  if (options.platform) Object.defineProperty(process, 'platform', { ...platformDescriptor, value: options.platform });
  if (options.hidden) process.argv.push('--hidden');
  if (options.devServer) vi.stubGlobal('MAIN_WINDOW_VITE_DEV_SERVER_URL', 'http://test-renderer.example');
  if (options.installed) state.downloader.checkInstalled.mockReturnValue({ backend: true, postgres: true, models: false });
  const { app } = await import('electron');
  (app as unknown as StubApp).isPackaged = options.packaged ?? true;
  await import('@/main');
}

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  state.handlers.clear();
  state.storage.clear();
  state.shortcuts.clear();
  state.notifications.length = 0;
  state.windows.length = 0;
  state.app?.removeAllListeners();
  state.notificationSupported.mockReturnValue(true);
  state.nativeImage.isEmpty.mockReturnValue(false);
  state.nativeImage.resize.mockReturnValue(state.nativeImage);
  state.downloader.checkInstalled.mockReturnValue({ backend: false, postgres: false, models: false });
  state.standalone.start.mockResolvedValue('http://127.0.0.1:32100');
  state.standalone.stop.mockResolvedValue(undefined);
  state.standalone.getStatus.mockReturnValue({ services: { backend: 'starting', postgres: 'running' }, errors: {} });
  state.confirm.mockResolvedValue({ response: 0 });
  state.voice.shutdown.mockResolvedValue(undefined);
  vi.stubGlobal('MAIN_WINDOW_VITE_DEV_SERVER_URL', undefined);
  vi.stubGlobal('MAIN_WINDOW_VITE_NAME', 'main_window');
  vi.stubEnv('DOCUMENTS_TEST_USER_DATA_DIR', '/test/profile');
});

afterEach(() => {
  Object.defineProperty(process, 'platform', platformDescriptor);
  process.argv.splice(0, process.argv.length, ...originalArgv);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Documents Electron lifecycle', () => {
  it('keeps a tray app running on close, displays the hint once and surfaces a second instance', async () => {
    state.storage.set('settings', { closeBehavior: 'tray', toggleShortcut: 'Control+Alt+D' });
    await boot({ platform: 'linux' });
    const window = state.windows[0];
    ready(window);
    expect(state.app?.setPath).toHaveBeenCalledWith('userData', '/test/profile');
    expect(window.loadFile).toHaveBeenCalledWith(expect.stringContaining('main_window/index.html'));
    expect(window.maximize).toHaveBeenCalled();
    expect(window.visible).toBe(true);

    window.close();
    expect(window.destroyed).toBe(false);
    expect(window.visible).toBe(false);
    expect(state.notifications[0].opts.title).toBe('Documents keeps running');
    state.app?.emit('window-all-closed');
    expect(state.app?.quit).not.toHaveBeenCalled();

    state.notifications[0].emit('click');
    expect(window.visible).toBe(true);
    window.close();
    expect(state.notifications).toHaveLength(1);
    window.minimized = true;
    state.app?.emit('second-instance');
    expect(window.minimized).toBe(false);
    expect(window.visible).toBe(true);

    state.shortcuts.get('Control+Alt+D')!();
    expect(window.visible).toBe(false);
    state.app?.emit('activate');
    expect(window.visible).toBe(true);
    state.shortcuts.get('F12')!();
    expect(window.webContents.toggleDevTools).toHaveBeenCalledOnce();
  });

  it('keeps startup hidden and reuses the quick assistant window until shutdown', async () => {
    await boot({ packaged: false, hidden: true, devServer: true });
    const main = state.windows[0];
    ready(main);
    expect(main.visible).toBe(false);
    expect(main.maximize).not.toHaveBeenCalled();
    expect(main.loadURL).toHaveBeenCalledWith('http://test-renderer.example');

    state.shortcuts.get(quickShortcut)!();
    const assistant = state.windows[1];
    expect(assistant.loadURL).toHaveBeenCalledWith('http://test-renderer.example#/quick-assistant');
    ready(assistant);
    expect(assistant.visible).toBe(true);
    expect(assistant.webContents.send).toHaveBeenCalledWith(IpcEvents.quickAssistant.shown);
    assistant.close();
    expect(assistant.destroyed).toBe(false);
    expect(assistant.visible).toBe(false);
    expect(channel(IpcChannels.quickAssistant.show)).toEqual({ ok: true });
    expect(state.windows).toHaveLength(2);
    expect(assistant.visible).toBe(true);
    channel(IpcChannels.quickAssistant.toggle);
    expect(assistant.visible).toBe(false);
    channel(IpcChannels.quickAssistant.hide);
    expect(assistant.visible).toBe(false);

    const [quit] = state.app!.listeners('before-quit');
    await quit();
    expect(assistant.destroyed).toBe(true);
    expect(state.trayDestroy).toHaveBeenCalledOnce();
    expect(state.shortcuts.size).toBe(0);
    expect(state.standalone.stop).toHaveBeenCalledOnce();
    expect(state.voice.shutdown).toHaveBeenCalledOnce();
  });

  it.each(['tray mode unavailable', 'explicit quit mode'])('closes the app on the last window (%s)', async (reason) => {
    state.nativeImage.isEmpty.mockReturnValue(reason === 'tray mode unavailable');
    state.storage.set('settings', { closeBehavior: reason === 'explicit quit mode' ? 'quit' : 'tray' });
    await boot({ platform: 'linux' });
    expect(channel(IpcChannels.app.trayAvailable)).toBe(reason !== 'tray mode unavailable');
    ready();
    channel(IpcChannels.quickAssistant.show);
    state.windows[0].close();
    expect(state.windows.every(({ destroyed }) => destroyed)).toBe(true);
    state.app?.emit('window-all-closed');
    expect(state.app?.quit).toHaveBeenCalledOnce();
  });

  it('updates the registered shortcut, starts at login and applies the macOS dock preference', async () => {
    state.storage.set('settings', {});
    await boot({ platform: 'darwin' });
    expect(state.nativeImage.setTemplateImage).toHaveBeenCalledWith(true);
    expect(state.shortcuts.has(quickShortcut)).toBe(true);
    expect(channel(IpcChannels.settings.set, {
      launchAtLogin: true, toggleShortcut: 'Command+D', quickAssistantShortcut: null, hideDockIcon: true,
    })).toMatchObject({ shortcutOk: true, quickShortcutOk: true });
    expect(state.app?.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: true, args: ['--hidden'] });
    expect(state.app?.dock.hide).toHaveBeenCalledOnce();
    expect(state.shortcuts.has(quickShortcut)).toBe(false);
    expect(state.shortcuts.has('Command+D')).toBe(true);
    channel(IpcChannels.settings.set, { toggleShortcut: 'Command+H', hideDockIcon: false });
    expect(state.shortcuts.has('Command+D')).toBe(false);
    expect(state.app?.dock.show).toHaveBeenCalled();
  });

  it('grants the renderer only the supported media permissions', async () => {
    await boot();
    const request = state.permissionRequest.mock.lastCall![0];
    const check = state.permissionCheck.mock.lastCall![0];
    for (const [name, allowed] of [['media', true], ['mediaKeySystem', true], ['geolocation', false]] as const) {
      const allow = vi.fn();
      request(undefined, name, allow);
      expect(allow).toHaveBeenCalledExactlyOnceWith(allowed);
      expect(check(undefined, name)).toBe(allowed);
    }
  });

  it('uses an isolated evaluation profile instead of starting the regular renderer', async () => {
    const shutdown = vi.fn();
    state.evaluationProfile.mockReturnValue('/test/evaluation-profile');
    state.startEvaluation.mockResolvedValue({ engine: { shutdown } });
    await boot();
    expect(state.app?.setPath).toHaveBeenCalledWith('userData', '/test/evaluation-profile');
    expect(state.startEvaluation).toHaveBeenCalledOnce();
    expect(state.windows).toHaveLength(0);
    expect(state.permissionRequest).not.toHaveBeenCalled();
    state.app?.emit('activate');
    expect(state.windows).toHaveLength(0);
    state.app?.emit('before-quit');
    expect(shutdown).toHaveBeenCalledOnce();
  });

  it('preloads the local model only when the user enabled it and the model is installed', async () => {
    state.storage.set('settings', { preloadVoiceModel: true });
    state.voice.isAvailable.mockReturnValue(true);
    state.voice.hasModel.mockResolvedValue(true);
    state.voice.preload.mockResolvedValue(undefined);
    await boot();
    expect(state.voice.preload).toHaveBeenCalledOnce();
  });
});

describe('standalone startup recovery', () => {
  it('shows a startup failure as text, retries it and opens the main window once ready', async () => {
    vi.useFakeTimers();
    state.standalone.start.mockRejectedValueOnce(new Error('Could not start <database>'));
    await boot({ installed: true });
    await vi.advanceTimersByTimeAsync(0);
    const splash = state.windows[0];
    expect(splash.options.show).toBe(true);
    const errorMarkup = decodeURIComponent(splash.loadURL.mock.lastCall![0]);
    expect(errorMarkup).toContain('Local server could not start');
    expect(errorMarkup).toContain('Could not start &lt;database&gt;');
    await expect(channel(IpcChannels.app.splashAction, 'unknown')).resolves.toMatchObject({ success: false });

    await channel(IpcChannels.app.splashAction, 'retry');
    state.standalone.getStatus.mockReturnValue({ services: { backend: 'running', postgres: 'running' }, errors: {} });
    await vi.advanceTimersByTimeAsync(1000);
    expect(state.standalone.start).toHaveBeenCalledTimes(2);
    expect(splash.destroyed).toBe(true);
    expect(state.windows[1].visible).toBe(true);
  });

  it('reinstalls services and checks for confirmation before clearing local data', async () => {
    vi.useFakeTimers();
    await boot({ installed: true });
    await channel(IpcChannels.app.splashAction, 'reset');
    expect(state.confirm).toHaveBeenCalledOnce();
    expect(state.fsRemove).not.toHaveBeenCalled();
    expect(state.downloader.uninstallServices).not.toHaveBeenCalled();

    await channel(IpcChannels.app.splashAction, 'reinstall');
    expect(state.downloader.uninstallServices).toHaveBeenCalledOnce();
    expect(state.downloader.downloadAll).toHaveBeenCalledOnce();
    expect(state.fsRemove).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(0);

    state.confirm.mockResolvedValueOnce({ response: 1 });
    await channel(IpcChannels.app.splashAction, 'reset');
    expect(state.fsRemove).toHaveBeenCalledExactlyOnceWith('/test/local-data', { recursive: true, force: true });
    expect(state.downloader.uninstallServices).toHaveBeenCalledTimes(2);
  });
});

describe('Electron reminders', () => {
  const alarm = {
    eventId: 7, occurrenceStart: '2026-02-06T19:30:00.000Z',
    title: 'Check archives', alarmLabel: 'Audit', trackCompletion: true,
  };

  it('routes calendar navigation and sends a Done action to the active workspace', async () => {
    state.storage.set('workspaces', [{ id: 'archives', url: 'http://archives.example' }]);
    state.storage.set('activeWorkspaceId', 'archives');
    await boot({ platform: 'win32' });
    const main = state.windows[0];
    expect(state.app?.setAppUserModelId).toHaveBeenCalledWith('com.documents.desktop');
    channel(IpcChannels.calendar.showAlarm, alarm);
    const notification = state.notifications[0];
    expect(notification.opts.title).toBe('Audit');
    expect(notification.opts.actions).toEqual([{ type: 'button', text: 'Done' }]);
    notification.emit('action', {}, 1);
    expect(state.post).not.toHaveBeenCalled();
    notification.emit('action', {}, 0);
    expect(state.post).toHaveBeenCalledExactlyOnceWith(
      'http://archives.example/calendar-events/7/occurrences/2026-02-06T19%3A30%3A00.000Z/complete',
    );

    main.destroy();
    notification.emit('click');
    const replacement = state.windows[1];
    expect(replacement.webContents.send).not.toHaveBeenCalled();
    replacement.webContents.emit('did-finish-load');
    expect(replacement.webContents.send).toHaveBeenCalledWith(IpcEvents.calendar.navigate, 7);
  });

  it('summarizes missed reminders and offers completion only for an individual occurrence', async () => {
    await boot({ platform: 'darwin' });
    state.standalone.getBackendUrl.mockReturnValue('http://local-backend.example');
    channel(IpcChannels.calendar.showMissedAggregate, { items: [] });
    channel(IpcChannels.task.showMissedAggregate, { items: [] });
    expect(state.notifications).toHaveLength(0);

    const sameDay = { taskId: 18, title: 'Review records', reminderAt: alarm.occurrenceStart };
    channel(IpcChannels.task.showReminder, sameDay);
    channel(IpcChannels.task.showMissedAggregate, { items: [sameDay] });
    channel(IpcChannels.calendar.showMissedAggregate, {
      items: Array.from({ length: 5 }, (_, index) => ({
        ...alarm, eventId: index + 1, title: `Event ${index + 1}`, alarmLabel: null as string | null,
      })),
    });
    const [taskReminder, taskAggregate, calendarAggregate] = state.notifications;
    expect(taskReminder.opts.title).toBe(sameDay.title);
    taskReminder.emit('click');
    expect(state.windows[0].webContents.send).toHaveBeenCalledWith(IpcEvents.task.navigate, 18);
    taskAggregate.emit('action', {}, 0);
    expect(state.patch).toHaveBeenCalledExactlyOnceWith('http://local-backend.example/user-tasks/18', { status: 'completed' });
    taskAggregate.emit('click');
    expect(state.windows[0].webContents.send).toHaveBeenCalledWith(IpcEvents.task.navigateMissedPanel);
    expect(calendarAggregate.opts).toMatchObject({
      title: '5 missed alerts', body: 'Event 1, Event 2, Event 3, Event 4, …', actions: undefined,
    });
    calendarAggregate.emit('click');
    expect(state.windows[0].webContents.send).toHaveBeenCalledWith(IpcEvents.calendar.navigateMissedPanel);
  });
});
