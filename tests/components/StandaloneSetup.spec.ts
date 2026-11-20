import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StandaloneSetup from '@/components/StandaloneSetup.vue';
import { useFeatureStore } from '@/store/featureStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import type { HardwareReport } from '@/services/standalone/hardware';

const { setApiBaseUrl, reconnectSocket } = vi.hoisted(() => ({
  setApiBaseUrl: vi.fn(), reconnectSocket: vi.fn(),
}));
vi.mock('@/services/api', () => ({ default: {}, setApiBaseUrl }));
vi.mock('@/services/notifications/notification', () => ({ reconnectSocket }));

const bridge = {
  standaloneHardwareReport: vi.fn(), standaloneInstallProfile: vi.fn(), onStandaloneDownloadProgress: vi.fn(),
  standaloneStart: vi.fn(), addWorkspace: vi.fn(), setActiveWorkspace: vi.fn(), standaloneGetFeatures: vi.fn(),
};
const ready: HardwareReport = {
  canInstall: true, blockReason: '',
  hardware: {
    cpuModel: 'Test CPU', cpuCores: 8, arch: 'x64', platform: 'linux',
    ramGB: 16, freeDiskGB: 40, gpu: { name: null, available: false, cuda: false, vramGB: 0 },
  },
  install: { status: 'yes', reason: '', downloadGB: 9.5, components: ['postgres', 'backend', 'models-cpu'], bundle: 'models-cpu' },
};
const button = (name: string) => screen.getByRole('button', { name });

function setup() {
  const pinia = createPinia();
  const workspace = useWorkspaceStore(pinia);
  const features = useFeatureStore(pinia);
  const view = render(StandaloneSetup, { global: { plugins: [pinia] } });
  return { workspace, features, view };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('electronAPI', bridge);
  bridge.standaloneHardwareReport.mockResolvedValue(ready);
  bridge.standaloneInstallProfile.mockResolvedValue({ success: true });
  bridge.standaloneStart.mockResolvedValue({ success: true, url: 'http://127.0.0.1:31234' });
  bridge.standaloneGetFeatures.mockResolvedValue({ datasets: false, timelines: true });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('first-run local installation', () => {
  it('shows the blocking hardware reason and offers to connect to a remote server', async () => {
    const hardware = Promise.withResolvers<HardwareReport>();
    bridge.standaloneHardwareReport.mockReturnValueOnce(hardware.promise);
    const { view } = setup();
    expect(screen.getByText('Checking your hardware…')).toBeTruthy();
    hardware.resolve({
      ...ready, canInstall: false, blockReason: 'At least 16 GB of memory is needed',
      install: { ...ready.install, status: 'no' },
    });
    expect(await screen.findByText('At least 16 GB of memory is needed')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Install' })).toBeNull();
    await fireEvent.click(button('Connect to a server instead'));
    await fireEvent.click(button('Back'));
    expect(view.emitted()['use-server']).toEqual([[]]);
    expect(view.emitted().back).toEqual([[]]);
    expect(bridge.standaloneInstallProfile).not.toHaveBeenCalled();
  });

  it('presents a slow install and hardware details while keeping the download opt-in', async () => {
    bridge.standaloneHardwareReport.mockResolvedValueOnce({
      ...ready, hardware: { ...ready.hardware, freeDiskGB: null, gpu: { name: 'Test GPU', vramGB: 6, cuda: true, available: true } },
      install: { ...ready.install, status: 'slow', reason: 'Partial GPU offload', components: ['backend', 'models-gpu', 'custom'] },
    });
    setup();
    expect(await screen.findByText('Runs slowly')).toBeTruthy();
    expect(screen.getByText('Partial GPU offload')).toBeTruthy();
    expect(screen.getByText('16 GB RAM · 8 cores · Test GPU (6 GB)')).toBeTruthy();
    expect(screen.getByText('Includes server, AI engine, custom.')).toBeTruthy();
    expect(screen.getByText('Download ≈ 9.5 GB')).toBeTruthy();
    expect(bridge.standaloneInstallProfile).not.toHaveBeenCalled();
  });

  it('displays weighted progress, installs the base components, and starts the local workspace', async () => {
    const install = Promise.withResolvers<{ success: boolean }>();
    bridge.standaloneInstallProfile.mockReturnValueOnce(install.promise);
    const { view, workspace, features } = setup();
    await fireEvent.click(await screen.findByRole('button', { name: 'Install' }));
    expect(screen.getByText('Preparing…')).toBeTruthy();
    expect(bridge.standaloneInstallProfile).toHaveBeenCalledExactlyOnceWith({
      key: 'base', components: ['postgres', 'backend', 'models-cpu'], features: [],
    });
    const progress = bridge.onStandaloneDownloadProgress.mock.calls[0][0];
    progress({ component: 'postgres', percent: 60, overallPercent: 15, step: 1, totalSteps: 4 });
    expect(await screen.findByText('Step 1/4 · Installing database… 15%')).toBeTruthy();
    progress({ component: 'publishing', percent: 92 });
    expect(await screen.findByText('Installing publishing… 92%')).toBeTruthy();
    expect(bridge.standaloneStart).not.toHaveBeenCalled();
    install.resolve({ success: true });
    await waitFor(() => expect(view.emitted().done).toEqual([[]]));
    expect(bridge.addWorkspace).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'local', name: 'Local', type: 'local' }));
    expect(bridge.setActiveWorkspace).toHaveBeenCalledExactlyOnceWith('local');
    expect(workspace.activeWorkspace?.url).toBe('http://127.0.0.1:31234');
    expect(setApiBaseUrl).toHaveBeenCalledExactlyOnceWith(workspace.activeWorkspace?.url);
    expect(reconnectSocket).toHaveBeenCalledExactlyOnceWith(workspace.activeWorkspace?.url);
    expect(features.isEnabled('datasets')).toBe(false);
    expect(features.isEnabled('timelines')).toBe(true);
  });

  it('shows installer and runtime errors and permits a retry without registering the workspace twice', async () => {
    bridge.standaloneInstallProfile.mockResolvedValueOnce({ success: false, error: 'Download interrupted' });
    bridge.standaloneStart.mockResolvedValueOnce({ success: false, error: 'Port occupied' });
    const { view } = setup();
    await fireEvent.click(await screen.findByRole('button', { name: 'Install' }));
    expect(await screen.findByText('Download interrupted')).toBeTruthy();
    expect(bridge.addWorkspace).not.toHaveBeenCalled();

    await fireEvent.click(button('Back'));
    await fireEvent.click(button('Install'));
    expect(await screen.findByText('Port occupied')).toBeTruthy();
    expect(view.emitted().done).toBeUndefined();
    await fireEvent.click(button('Back'));
    await fireEvent.click(button('Install'));
    await waitFor(() => expect(view.emitted().done).toEqual([[]]));
    expect(bridge.addWorkspace).toHaveBeenCalledOnce();
    expect(bridge.standaloneStart).toHaveBeenCalledTimes(2);
  });

  it('reports a hardware probe error before attempting an install', async () => {
    bridge.standaloneHardwareReport.mockRejectedValueOnce(new Error('Probe unavailable'));
    setup();
    expect(await screen.findByText('Probe unavailable')).toBeTruthy();
    expect(bridge.standaloneInstallProfile).not.toHaveBeenCalled();
  });
});
