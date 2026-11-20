import axios from 'axios';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import Settings from '@/pages/Settings.vue';
import { useAuthStore } from '@/store/authStore';
import { useWorkspaceStore } from '@/store/workspaceStore';

const { api, setApiBaseUrl, reconnectSocket } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  setApiBaseUrl: vi.fn(),
  reconnectSocket: vi.fn(),
}));
vi.mock('@/services/api', () => ({ default: api, setApiBaseUrl }));
vi.mock('@/services/notifications/notification', () => ({ reconnectSocket }));

const server = { id: 'archives', name: 'Archives', url: 'http://archives.example', type: 'remote' };
const backup = { id: 'library', name: 'Library', url: 'http://library.example', type: 'remote' };
const settings = {
  language: 'en', fontSize: 18, theme: 'light', launchAtLogin: true, closeBehavior: 'quit',
  toggleShortcut: 'Control+Alt+D', quickAssistantShortcut: 'Control+Alt+J', preloadVoiceModel: true,
};
const button = (name: string | RegExp) => screen.getByRole('button', { name });

function stubElectron() {
  const bridge = {
    getSettings: vi.fn().mockResolvedValue(settings),
    setSettings: vi.fn().mockResolvedValue({}),
    getPlatform: vi.fn().mockResolvedValue('linux'),
    getTrayAvailable: vi.fn().mockResolvedValue(true),
    getWorkspaces: vi.fn().mockResolvedValue([server, backup]),
    getActiveWorkspace: vi.fn().mockResolvedValue(server),
    getDefaultWorkspace: vi.fn().mockResolvedValue(server.id),
    setDefaultWorkspace: vi.fn().mockResolvedValue(undefined),
    setActiveWorkspace: vi.fn().mockResolvedValue(undefined),
    addWorkspace: vi.fn().mockResolvedValue(undefined),
    updateWorkspace: vi.fn().mockResolvedValue(undefined),
    removeWorkspace: vi.fn().mockResolvedValue(undefined),
    standaloneCheckInstalled: vi.fn().mockResolvedValue({ postgres: true, backend: true, models: false }),
    standaloneDetectGpu: vi.fn().mockResolvedValue({ available: false, name: null, cuda: false }),
    standaloneStatus: vi.fn().mockResolvedValue({ services: { postgres: 'running', backend: 'running', models: 'not_installed' } }),
    standaloneHardwareReport: vi.fn().mockResolvedValue(null),
    standaloneDownloadAll: vi.fn(),
    standaloneUpdateServices: vi.fn(),
    standaloneInstallModels: vi.fn(),
    standaloneStop: vi.fn().mockResolvedValue(undefined),
    standaloneUninstallServices: vi.fn().mockResolvedValue(undefined),
    onStandaloneDownloadProgress: vi.fn(),
    standaloneGetPort: vi.fn().mockResolvedValue(32111),
    standaloneSetPort: vi.fn().mockResolvedValue({ success: true }),
  };
  vi.stubGlobal('electronAPI', bridge);
  return bridge;
}

async function openSettings({ nonAdmin = false, configure }: {
  nonAdmin?: boolean;
  configure?: (bridge: ReturnType<typeof stubElectron>) => void;
} = {}) {
  const bridge = stubElectron();
  configure?.(bridge);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>Projects</div>' } },
      { path: '/settings', component: Settings },
    ],
  });
  const pinia = createPinia();
  const workspaceStore = useWorkspaceStore(pinia);
  await workspaceStore.loadWorkspaces();
  if (nonAdmin) useAuthStore(pinia).authRequired = true;
  await router.push('/settings');
  render(Settings, { global: { plugins: [router, pinia], stubs: { VoiceSettings: true } } });
  await waitFor(() => expect((screen.getByLabelText('Font Size') as HTMLSelectElement).value).toBe('18'));
  return { bridge, router, workspaceStore };
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  api.get.mockImplementation(async (url) => {
    if (url === '/export/projects') return { data: [{ id: 5, name: 'Acquisitions' }, { id: 9, name: 'Inventory' }] };
    if (url === '/features/browser-federation/status') return { data: { enabled: false, browser: 'not_paired' } };
    if (url === '/auth/status') return { data: { authEnabled: false } };
    throw new Error(`Unexpected GET ${url}`);
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.documentElement.classList.remove('dark');
});

describe('application settings', () => {
  it('saves appearance without dropping desktop preferences', async () => {
    const { bridge } = await openSettings();
    await fireEvent.update(screen.getByRole('combobox', { name: 'Font Size' }), '22');
    await fireEvent.click(button('Dark'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(bridge.setSettings).toHaveBeenLastCalledWith(expect.objectContaining({ ...settings, theme: 'dark', fontSize: 22 }));
    await fireEvent.update(screen.getByRole('combobox', { name: 'Display Language' }), 'es');
    expect(bridge.setSettings).toHaveBeenLastCalledWith(expect.objectContaining({ language: 'es', fontSize: 22 }));
  });

  it('shows the browser feature permission rule for a signed-in reader', async () => {
    await openSettings({ nonAdmin: true });
    const browser = screen.getByText('Browser tasks').parentElement!.parentElement!;
    expect(within(browser).getByText('An administrator can change this setting.')).toBeTruthy();
    expect((within(browser).getByRole('button') as HTMLButtonElement).disabled).toBe(true);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('activates another workspace, resets the session and returns to projects', async () => {
    const { bridge, router, workspaceStore } = await openSettings();
    await fireEvent.click(button('Workspaces'));
    const libraryCard = screen.getByText('Library').closest<HTMLElement>('.rounded-xl')!;
    await fireEvent.click(within(libraryCard).getByRole('button', { name: 'Set default' }));
    expect(bridge.setDefaultWorkspace).toHaveBeenCalledWith(backup.id);
    await fireEvent.click(within(libraryCard).getByRole('button', { name: 'Switch' }));
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/'));
    expect(workspaceStore.activeWorkspaceId).toBe(backup.id);
    expect(setApiBaseUrl).toHaveBeenLastCalledWith(backup.url);
    expect(reconnectSocket).toHaveBeenLastCalledWith(backup.url);
    expect(api.get).toHaveBeenCalledWith('/auth/status');
  });

  it('shows a rejected local port change and clears the error on retry', async () => {
    const { bridge } = await openSettings();
    bridge.standaloneSetPort.mockResolvedValueOnce({ success: false, error: 'Port in use' });
    await fireEvent.click(button('Server'));
    await fireEvent.click(button(/^Advanced/));
    const port = screen.getByRole('spinbutton', { name: 'Local address' }) as HTMLInputElement;
    expect(port.value).toBe('32111');
    await fireEvent.update(port, '32118');
    await fireEvent.click(button('Save'));
    expect(await screen.findByText('Port in use')).toBeTruthy();
    expect(bridge.standaloneSetPort).toHaveBeenCalledWith(32118);
    await fireEvent.update(port, '32119');
    await fireEvent.click(button('Save'));
    await waitFor(() => expect(screen.queryByText('Port in use')).toBeNull());
    expect(bridge.standaloneSetPort).toHaveBeenLastCalledWith(32119);
  });

  it('exports only selected projects, reports a failed export, and downloads a retry', async () => {
    await openSettings();
    api.post.mockRejectedValueOnce({ response: { data: { message: 'Export unavailable' } } }).mockResolvedValueOnce({
      data: 'archive-contents', headers: { 'content-disposition': 'attachment; filename="inventory.zip"' },
    });
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:inventory');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe('inventory.zip');
        expect(this.href).toBe('blob:inventory');
      });

    await fireEvent.click(button('Export'));
    await fireEvent.click(screen.getByRole('radio', { name: 'Select projects' }));
    expect((button('Export ZIP') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Inventory' }));
    await fireEvent.click(button('Export ZIP'));
    expect(await screen.findByText('Export unavailable')).toBeTruthy();
    expect(click).not.toHaveBeenCalled();

    await fireEvent.click(button('Export ZIP'));
    expect(await screen.findByText('Export downloaded successfully.')).toBeTruthy();
    expect(api.post).toHaveBeenLastCalledWith('/export', { projectIds: [9] }, { responseType: 'blob' });
    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:inventory');
  });
});

describe('desktop shortcuts and remote workspaces', () => {
  it('records each desktop shortcut independently, reports registration conflicts, and clears a shortcut', async () => {
    const { bridge } = await openSettings();
    const section = (heading: string | RegExp) => within(screen.getByRole('heading', { name: heading }).closest('section')!);
    const main = section(/Global\s+shortcut/);
    const quick = section(/Quick\s+assistant/);
    bridge.setSettings.mockResolvedValueOnce({ shortcutOk: false, quickShortcutOk: true });
    await fireEvent.click(main.getByRole('button', { name: 'Control+Alt+D' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', ctrlKey: true }));
    expect(bridge.setSettings).not.toHaveBeenCalled();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, altKey: true, shiftKey: true }));
    expect(bridge.setSettings).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      toggleShortcut: 'CommandOrControl+Alt+Shift+A', quickAssistantShortcut: 'Control+Alt+J',
    }));
    expect(await main.findByText(/already in use/)).toBeTruthy();

    await fireEvent.click(quick.getByRole('button', { name: 'Control+Alt+J' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F8', metaKey: true }));
    expect(bridge.setSettings).toHaveBeenLastCalledWith(expect.objectContaining({
      toggleShortcut: 'CommandOrControl+Alt+Shift+A', quickAssistantShortcut: 'CommandOrControl+F8',
    }));
    await fireEvent.click(quick.getByRole('button', { name: 'Clear' }));
    expect(bridge.setSettings).toHaveBeenLastCalledWith(expect.objectContaining({
      toggleShortcut: 'CommandOrControl+Alt+Shift+A', quickAssistantShortcut: null,
    }));
    expect(quick.getByRole('button', { name: 'Click to set' })).toBeTruthy();
    await waitFor(() => expect(main.queryByText(/already in use/)).toBeNull());
  });

  it('validates remote connectivity, adds a workspace with a normalized URL, and removes it', async () => {
    const probe = vi.spyOn(axios, 'get').mockRejectedValueOnce(new Error('Server unavailable')).mockResolvedValueOnce({ data: {} });
    const { bridge, workspaceStore } = await openSettings();
    await fireEvent.click(button('Workspaces'));
    await fireEvent.click(button('Add Workspace'));
    await fireEvent.update(screen.getByLabelText('Name'), '  Catalogue  ');
    await fireEvent.update(screen.getByLabelText('Server URL'), 'https://catalogue.example');
    const test = button('Test Connection');
    await fireEvent.click(test);
    expect(await screen.findByText('Connection failed')).toBeTruthy();
    await fireEvent.click(test);
    expect(await screen.findByText('Connected')).toBeTruthy();
    expect(probe).toHaveBeenLastCalledWith('https://catalogue.example/auth/status', { timeout: 5000 });
    await fireEvent.update(screen.getByLabelText('Server URL'), 'https://catalogue.example///');
    await fireEvent.click(button('Add'));
    const saved = workspaceStore.workspaces.find(({ name }) => name === 'Catalogue');
    expect(saved).toMatchObject({ type: 'remote', url: 'https://catalogue.example' });
    expect(bridge.addWorkspace).toHaveBeenCalledExactlyOnceWith(saved);
    const card = (await screen.findByText('Catalogue')).closest<HTMLElement>('.rounded-xl')!;
    await fireEvent.click(within(card).getByRole('button', { name: 'Remove' }));
    expect(bridge.removeWorkspace).toHaveBeenCalledExactlyOnceWith(saved?.id);
    await waitFor(() => expect(screen.queryByText('Catalogue')).toBeNull());
  });

  it('keeps the active workspace selected when editing its server URL and reapplies the API base URL', async () => {
    const { bridge, workspaceStore } = await openSettings();
    await fireEvent.click(button('Workspaces'));
    const active = screen.getByText('Archives').closest<HTMLElement>('.rounded-xl')!;
    await fireEvent.click(within(active).getByRole('button', { name: 'Edit' }));
    expect((screen.getByLabelText('Server URL') as HTMLInputElement).value).toBe(server.url);
    await fireEvent.update(screen.getByLabelText('Server URL'), 'https://archive.example/v2/');
    await fireEvent.click(button('Save'));
    expect(bridge.updateWorkspace).toHaveBeenCalledExactlyOnceWith({
      ...server, url: 'https://archive.example/v2',
    });
    await waitFor(() => expect(setApiBaseUrl).toHaveBeenLastCalledWith('https://archive.example/v2'));
    expect(workspaceStore.activeWorkspaceId).toBe(server.id);
  });
});

describe('local server settings', () => {
  const installed = { postgres: true, backend: true, models: false };
  const missing = { postgres: false, backend: false, models: false };
  const hardware = {
    hardware: { ramGB: 12, cpuCores: 8, freeDiskGB: 40, gpu: { name: 'Test GPU', vramGB: 4 } },
    canInstall: true,
    blockReason: '',
    install: { status: 'slow', reason: 'Model processing is limited', downloadGB: 2.5 },
  };

  it('updates service status and stops requesting it after leaving the Server tab', async () => {
    const { bridge } = await openSettings();
    bridge.standaloneStatus
      .mockResolvedValueOnce({ services: { postgres: 'starting', backend: 'stopped', models: 'not_installed' } })
      .mockResolvedValueOnce({
        services: { postgres: 'running', backend: 'error', models: 'not_installed' },
        errors: { backend: 'The database is unavailable' },
      })
      .mockResolvedValueOnce({ services: { postgres: 'running', backend: 'running', models: 'running' } });
    vi.useFakeTimers();
    await fireEvent.click(button('Server'));
    await vi.advanceTimersByTimeAsync(0);
    expect(screen.getByRole('heading', { name: 'Starting up…' })).toBeTruthy();
    expect(screen.getByText('Stopped')).toBeTruthy();

    await vi.advanceTimersByTimeAsync(3000);
    expect(screen.getByRole('heading', { name: 'Something needs attention' })).toBeTruthy();
    expect(screen.getByText('The database is unavailable')).toBeTruthy();

    await vi.advanceTimersByTimeAsync(3000);
    expect(screen.getByRole('heading', { name: 'Everything is running' })).toBeTruthy();
    expect(screen.queryByText('The database is unavailable')).toBeNull();
    await fireEvent.click(button('Workspaces'));
    await vi.advanceTimersByTimeAsync(6000);
    expect(bridge.standaloneStatus).toHaveBeenCalledTimes(3);
  });

  it('explains why the local installer is unavailable on unsupported hardware', async () => {
    await openSettings({ configure(bridge) {
      bridge.standaloneCheckInstalled.mockResolvedValue(missing);
      bridge.standaloneHardwareReport.mockResolvedValue({ ...hardware, canInstall: false, blockReason: 'Insufficient disk space' });
    } });
    await fireEvent.click(button('Server'));
    expect(await screen.findByText('Insufficient disk space')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Install local server' })).toBeNull();
  });

  it('reports installer progress and errors, then switches to live status after retry', async () => {
    const { bridge } = await openSettings({ configure(bridge) {
      bridge.standaloneCheckInstalled.mockResolvedValue(missing);
      bridge.standaloneHardwareReport.mockResolvedValue(hardware);
    } });
    await fireEvent.click(button('Server'));
    expect(await screen.findByText('12 GB RAM · 8 cores · Test GPU (4 GB) · 40 GB free')).toBeTruthy();
    expect(screen.getByText('Download: about 2.5 GB')).toBeTruthy();
    expect(screen.getByText('Runs slowly — Model processing is limited')).toBeTruthy();

    let complete!: (result: { success: boolean }) => void;
    bridge.standaloneDownloadAll.mockReturnValueOnce(new Promise((resolve) => { complete = resolve; })).mockResolvedValueOnce({ success: true });
    await fireEvent.click(button('Install local server'));
    const report = bridge.onStandaloneDownloadProgress.mock.calls[0][0];
    report({ component: 'backend', downloaded: 48, total: 100, percent: 48 });
    expect(await screen.findByText('Installing the application server…')).toBeTruthy();
    expect(screen.getByText('48%')).toBeTruthy();
    expect((button('Installing…') as HTMLButtonElement).disabled).toBe(true);
    complete({ success: false });
    expect(await screen.findByText('Download failed')).toBeTruthy();

    bridge.standaloneCheckInstalled.mockResolvedValue(installed);
    await fireEvent.click(button('Install local server'));
    expect(await screen.findByRole('heading', { name: 'Local server is running' })).toBeTruthy();
    expect(screen.queryByText('Download failed')).toBeNull();
    expect(bridge.standaloneDownloadAll).toHaveBeenCalledTimes(2);
  });

  it('chooses CPU on request, offers GPU on retry, and reflects the installed model', async () => {
    const { bridge } = await openSettings({ configure(bridge) {
      bridge.standaloneDetectGpu.mockResolvedValue({ available: true, name: 'Test GPU', cuda: true });
      bridge.standaloneInstallModels.mockResolvedValueOnce({ success: false }).mockResolvedValueOnce({ success: true });
    } });
    await fireEvent.click(button('Server'));
    expect(await screen.findByText('Graphics acceleration is active with Test GPU.')).toBeTruthy();
    const assistant = screen.getByRole('heading', { name: 'AI assistant' }).closest('section')!;
    const forceCpu = within(assistant).getByRole('checkbox');
    await fireEvent.click(forceCpu);
    await fireEvent.click(button('Install AI assistant'));
    expect(await screen.findByText('Installation failed')).toBeTruthy();
    expect(bridge.standaloneInstallModels).toHaveBeenLastCalledWith('models-cpu');

    await fireEvent.click(forceCpu);
    bridge.standaloneCheckInstalled.mockResolvedValue({ ...installed, models: true });
    await fireEvent.click(button('Install AI assistant'));
    expect(await screen.findByText('Installed on this computer · ~3-5 GB (GPU)')).toBeTruthy();
    expect(bridge.standaloneInstallModels).toHaveBeenLastCalledWith('models-gpu');
    expect(screen.queryByRole('button', { name: 'Install AI assistant' })).toBeNull();
  });

  it('reports a failed update, then stops before removing the installed services', async () => {
    const { bridge } = await openSettings();
    bridge.standaloneUpdateServices.mockResolvedValue({ success: false });
    await fireEvent.click(button('Server'));
    await fireEvent.click(button('Update local services'));
    expect(await screen.findByText('Update failed')).toBeTruthy();

    bridge.standaloneCheckInstalled.mockResolvedValue(missing);
    await fireEvent.click(button('Remove local server'));
    expect(await screen.findByText('Checking your hardware…')).toBeTruthy();
    expect(bridge.standaloneStop).toHaveBeenCalledBefore(bridge.standaloneUninstallServices);
  });
});

describe('browser connection settings', () => {
  it('shows the backend status after an accepted browser setting change', async () => {
    await openSettings();
    const card = screen.getByText('Browser tasks').parentElement!.parentElement!;
    expect(within(card).getByText('Turn this on to allow browser tasks.')).toBeTruthy();
    const originalGet = api.get.getMockImplementation()!;
    api.get.mockImplementation(async (path, ...args) => {
      if (path === '/features/browser-federation/status') {
        return { data: { enabled: true, browser: 'update_required' } };
      }
      return originalGet(path, ...args);
    });
    const enable = Promise.withResolvers<{ data: { enabled: boolean } }>();
    api.patch.mockReturnValueOnce(enable.promise);
    const toggle = within(card).getByRole('button') as HTMLButtonElement;
    await fireEvent.click(toggle);
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/features/browser-federation', { enabled: true });
    expect(toggle.disabled).toBe(true);
    expect(within(card).getByText('Applying…')).toBeTruthy();
    enable.resolve({ data: { enabled: true } });
    expect(await screen.findByText('Update IA Browser to use assistant tasks.')).toBeTruthy();
    expect(toggle.disabled).toBe(false);

  });

  it('reports a rejected setting change and keeps the switch usable', async () => {
    await openSettings();
    const card = screen.getByText('Browser tasks').parentElement!.parentElement!;
    api.patch.mockRejectedValueOnce(new Error('Permission changed'));
    const toggle = within(card).getByRole('button') as HTMLButtonElement;
    await fireEvent.click(toggle);
    expect(await screen.findByText('Permission changed')).toBeTruthy();
    expect(toggle.disabled).toBe(false);
    expect(within(card).getByText('Turn this on to allow browser tasks.')).toBeTruthy();
  });
});
