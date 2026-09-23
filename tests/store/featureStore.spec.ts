import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useFeatureStore } from '@/store/featureStore';
import { setServerReachable } from '@/services/offline/offlineInterceptor';
import { reconnectSocket } from '@/services/notifications/notification';
import apiClient from '@/services/api';

vi.mock('@/services/offline/offlineInterceptor', () => ({
  setServerReachable: vi.fn(),
}));
vi.mock('@/services/notifications/notification', () => ({
  reconnectSocket: vi.fn(),
}));
vi.mock('@/store/workspaceStore', () => ({
  useWorkspaceStore: () => ({ activeWorkspace: { url: 'http://127.0.0.1:32100' } }),
}));
vi.mock('@/services/api', () => ({
  default: { patch: vi.fn() },
}));

function setElectronApi(api: Record<string, any>) {
  (window as any).electronAPI = api;
}

describe('featureStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    (window as any).electronAPI = undefined;
    vi.mocked(setServerReachable).mockClear();
    vi.mocked(reconnectSocket).mockClear();
    vi.mocked(apiClient.patch).mockReset();
  });

  describe('standalone mode', () => {
    it('loads the persisted selection and allows toggling every feature', async () => {
      setElectronApi({
        standaloneGetFeatures: vi.fn().mockResolvedValue({ canvas: false, datasets: true }),
      });
      const store = useFeatureStore();

      await store.loadLocalPreferences(true);

      expect(store.standaloneMode).toBe(true);
      expect(store.isEnabled('canvas')).toBe(false);
      expect(store.isEnabled('datasets')).toBe(true);
      // Locally the backend can be reconfigured, so nothing is server-locked.
      expect(store.isBackendEnabled('canvas')).toBe(true);
      expect(store.featureFlags.every((flag) => flag.backendEnabled)).toBe(true);
    });

    it('persists the whole map and restarts services when toggling', async () => {
      const standaloneSetFeatures = vi.fn().mockResolvedValue({ success: true });
      setElectronApi({
        standaloneGetFeatures: vi.fn().mockResolvedValue({ canvas: false, relationships: true }),
        standaloneSetFeatures,
      });
      const store = useFeatureStore();
      await store.loadLocalPreferences(true);

      const result = await store.toggleLocalFeature('canvas');

      expect(result).toEqual({ success: true });
      expect(standaloneSetFeatures).toHaveBeenCalledWith({ canvas: true, relationships: true });
      expect(store.isEnabled('canvas')).toBe(true);
      // The restart drops the connection; the renderer must recover explicitly.
      expect(setServerReachable).toHaveBeenCalledWith(true);
      expect(reconnectSocket).toHaveBeenCalledWith('http://127.0.0.1:32100');
    });

    it('keeps the previous state when the restart fails', async () => {
      setElectronApi({
        standaloneGetFeatures: vi.fn().mockResolvedValue({ canvas: false }),
        standaloneSetFeatures: vi.fn().mockResolvedValue({ success: false, error: 'boom' }),
      });
      const store = useFeatureStore();
      await store.loadLocalPreferences(true);

      const result = await store.toggleLocalFeature('canvas');

      expect(result).toEqual({ success: false, error: 'boom' });
      expect(store.isEnabled('canvas')).toBe(false);
      expect(setServerReachable).not.toHaveBeenCalled();
      expect(reconnectSocket).not.toHaveBeenCalled();
    });

    it('updates IA Browser tasks through the backend without restarting local services', async () => {
      const standaloneSetFeatures = vi.fn();
      setElectronApi({
        standaloneGetFeatures: vi.fn().mockResolvedValue({ canvas: true }),
        standaloneSetFeatures,
      });
      vi.mocked(apiClient.patch).mockResolvedValue({ data: { enabled: true } });
      const store = useFeatureStore();
      store.setBackendFeatures({ browser_federation: false });
      await store.loadLocalPreferences(true);

      expect(store.isEnabled('browser_federation')).toBe(false);
      await store.toggleLocalFeature('browser_federation');

      expect(apiClient.patch).toHaveBeenCalledWith('/features/browser-federation', { enabled: true });
      expect(store.isEnabled('browser_federation')).toBe(true);
      expect(standaloneSetFeatures).not.toHaveBeenCalled();
    });

  });

  describe('remote mode', () => {
    it('gates a server-disabled feature even without a local preference', async () => {
      setElectronApi({
        getSettings: vi.fn().mockResolvedValue({ disabledFeatures: [] }),
      });
      const store = useFeatureStore();
      store.setBackendFeatures({ canvas: false, datasets: true });

      await store.loadLocalPreferences(false);

      expect(store.isBackendEnabled('canvas')).toBe(false);
      expect(store.isEnabled('canvas')).toBe(false);
      expect(store.isEnabled('datasets')).toBe(true);
    });

    it('stores a local preference without touching the backend', async () => {
      const setSettings = vi.fn().mockResolvedValue(undefined);
      setElectronApi({
        getSettings: vi.fn().mockResolvedValue({ disabledFeatures: [] }),
        setSettings,
      });
      const store = useFeatureStore();
      store.setBackendFeatures({ datasets: true });
      await store.loadLocalPreferences(false);

      const result = await store.toggleLocalFeature('datasets');

      expect(result).toEqual({ success: true });
      expect(store.isEnabled('datasets')).toBe(false);
      expect(setSettings).toHaveBeenCalledWith({ disabledFeatures: ['datasets'] });
    });
  });
});
