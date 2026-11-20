import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Store from 'electron-store';
import type { BrowserWindow } from 'electron';
import type { ElectronAPI } from '@/types/electron';
import { IpcChannels, IpcEvents } from '@/ipc/channels';
import { DEFAULT_STANDALONE_BACKEND_PORT, registerStandaloneHandlers } from '@/main/standalone-handlers';

const { handle, invoke, on, exposeInMainWorld, manager, downloader } = vi.hoisted(() => ({
  handle: vi.fn(),
  invoke: vi.fn(),
  on: vi.fn(),
  exposeInMainWorld: vi.fn(),
  manager: {
    start: vi.fn(), stop: vi.fn(), getStatus: vi.fn(), getBackendUrl: vi.fn(),
    isRunning: vi.fn(), applyFeatures: vi.fn(),
  },
  downloader: {
    checkInstalled: vi.fn(), isStandaloneReady: vi.fn(), downloadAll: vi.fn(), updateServices: vi.fn(),
    installProfile: vi.fn(), downloadComponent: vi.fn(), uninstallServices: vi.fn(),
    installModels: vi.fn(), uninstallModels: vi.fn(), detectGpu: vi.fn(),
  },
}));
vi.mock('electron', () => ({
  ipcMain: { handle },
  ipcRenderer: { invoke, on },
  contextBridge: { exposeInMainWorld },
}));
vi.mock('@/services/standalone/standalone-manager', () => ({ standaloneManager: manager }));
vi.mock('@/services/standalone/download-manager', () => downloader);

const backendUrl = 'http://127.0.0.1:32100';
const initialPort = 'standaloneBackendPort';
const enabledFeatures = 'standaloneEnabledFeatures';
const disabledFeatures = {
  timelines: false, canvas: false, bibliography: false, datasets: false,
  knowledge_base: false, relationships: false,
};

let storage: Map<string, unknown>;
let bridge: ElectronAPI;
const send = vi.fn();

beforeEach(async () => {
  vi.resetModules();
  vi.resetAllMocks();
  storage = new Map();
  registerStandaloneHandlers({
    store: {
      get: (key: string) => storage.get(key),
      set: (key: string, value: unknown) => storage.set(key, value),
    } as unknown as Store,
    getMainWindow: () => ({ webContents: { send } }) as unknown as BrowserWindow,
  });
  invoke.mockImplementation(async (channel, ...args) => {
    if (channel === IpcChannels.voice.isAvailable) return false;
    const handler = handle.mock.calls.find(([registered]) => registered === channel)?.[1];
    if (!handler) throw new Error(`Unregistered channel ${channel}`);
    return handler({}, ...args);
  });
  await import('@/preload');
  bridge = exposeInMainWorld.mock.calls.find(([name]) => name === 'electronAPI')?.[1];
  manager.start.mockResolvedValue(backendUrl);
  manager.stop.mockResolvedValue(undefined);
  manager.applyFeatures.mockResolvedValue(undefined);
});

describe('standalone IPC between the renderer and main process', () => {
  it('installs a profile, forwards progress and uses the persisted feature set to start the backend', async () => {
    const progress = { component: 'backend', downloaded: 500, total: 1000, percent: 50 };
    downloader.installProfile.mockImplementation(async (_components, report) => report(progress));
    const received = vi.fn();
    bridge.onStandaloneDownloadProgress(received);
    send.mockImplementation((channel, payload) => {
      const listener = on.mock.calls.find(([event]) => event === channel)?.[1];
      listener?.({}, payload);
    });
    const profile = { key: 'research', components: ['backend', 'postgres'], features: ['canvas'] };

    expect(await bridge.standaloneInstallProfile(profile)).toEqual({ success: true });
    expect(downloader.installProfile).toHaveBeenCalledWith(['backend', 'postgres'], expect.any(Function));
    expect(send).toHaveBeenCalledWith(IpcEvents.standalone.downloadProgress, progress);
    expect(received).toHaveBeenCalledExactlyOnceWith(progress);
    expect(storage.get('standaloneProfile')).toEqual({ key: 'research', features: ['canvas'] });
    expect(storage.get(enabledFeatures)).toEqual(['canvas']);
    expect(await bridge.standaloneGetFeatures()).toEqual({ ...disabledFeatures, canvas: true });
    expect(await bridge.standaloneStart()).toEqual({ success: true, url: backendUrl });
    expect(manager.start).toHaveBeenCalledExactlyOnceWith({
      features: { ...disabledFeatures, canvas: true }, backendPort: DEFAULT_STANDALONE_BACKEND_PORT,
    });
  });

  it.each([-1, 80, 34000.5, 65536])('rejects invalid port %s before restarting or writing settings', async (port) => {
    manager.isRunning.mockReturnValue(true);
    expect(await bridge.standaloneSetPort(port)).toEqual({
      success: false, error: 'Port must be an integer between 1024 and 65535.',
    });
    expect(await bridge.standaloneGetPort()).toBe(DEFAULT_STANDALONE_BACKEND_PORT);
    expect(storage.has(initialPort)).toBe(false);
    expect(manager.stop).not.toHaveBeenCalled();
  });

  it('stores a valid port without starting a stopped backend', async () => {
    manager.isRunning.mockReturnValue(false);
    storage.set(initialPort, 'legacy-invalid-value');
    expect(await bridge.standaloneGetPort()).toBe(DEFAULT_STANDALONE_BACKEND_PORT);
    expect(await bridge.standaloneSetPort(65535)).toEqual({ success: true });
    expect(await bridge.standaloneGetPort()).toBe(65535);
    expect(manager.start).not.toHaveBeenCalled();
  });

  it('rolls back the port and attempts recovery when the restart fails', async () => {
    storage.set(initialPort, 34000);
    storage.set(enabledFeatures, []);
    manager.isRunning.mockReturnValue(true);
    manager.start.mockRejectedValueOnce(new Error('Port is busy')).mockResolvedValueOnce('http://127.0.0.1:34000');

    expect(await bridge.standaloneSetPort(35000)).toEqual({ success: false, error: 'Port is busy' });
    expect(manager.stop).toHaveBeenCalledOnce();
    expect(manager.start.mock.calls).toEqual([
      [{ backendPort: 35000, features: disabledFeatures }],
      [{ backendPort: 34000, features: disabledFeatures }],
    ]);
    expect(await bridge.standaloneGetPort()).toBe(34000);
  });

  it('applies standalone feature changes to a running backend and reports a failed apply', async () => {
    manager.isRunning.mockReturnValue(true);
    manager.applyFeatures.mockRejectedValueOnce(new Error('Restart failed'));
    expect(await bridge.standaloneSetFeatures({ canvas: false })).toEqual({
      success: false, error: 'Restart failed',
    });
    expect((await bridge.standaloneGetFeatures()).canvas).toBe(false);
    expect(manager.applyFeatures).toHaveBeenCalledWith(expect.objectContaining({ canvas: false, datasets: true }));

    manager.isRunning.mockReturnValue(false);
    expect(await bridge.standaloneSetFeatures({ datasets: false })).toEqual({ success: true });
    expect(manager.applyFeatures).toHaveBeenCalledOnce();
    expect(await bridge.standaloneGetFeatures()).toMatchObject({ canvas: true, datasets: false });
  });

  it('restarts after a service update and preserves the update error if restart also fails', async () => {
    downloader.updateServices.mockResolvedValueOnce(['backend']).mockRejectedValueOnce(new Error('Package damaged'));
    expect(await bridge.standaloneUpdateServices()).toEqual({ success: true, updated: ['backend'] });
    expect(manager.stop.mock.invocationCallOrder[0]).toBeLessThan(downloader.updateServices.mock.invocationCallOrder[0]);
    expect(downloader.updateServices.mock.invocationCallOrder[0]).toBeLessThan(manager.start.mock.invocationCallOrder[0]);

    manager.start.mockRejectedValueOnce(new Error('Server failed to start'));
    expect(await bridge.standaloneUpdateServices()).toEqual({ success: false, error: 'Package damaged' });
    expect(manager.start).toHaveBeenCalledTimes(2);
  });
});
