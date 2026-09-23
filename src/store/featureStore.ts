import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '../services/api';

export const FEATURE_LABELS: Record<string, string> = {
  canvas: 'Canvas',
  datasets: 'Datasets',
  timelines: 'Timelines',
  knowledge_base: 'Knowledge Base',
  bibliography: 'Bibliography',
  relationships: 'Relationships',
  browser_federation: 'Browser tasks',
};

export interface FeatureToggleResult {
  success: boolean;
  error?: string;
}

export const useFeatureStore = defineStore('features', () => {
  const backendFeatures = ref<Record<string, boolean>>({});
  const disabledFeatures = ref<string[]>([]);
  // True while the active workspace runs its backend and models locally. In
  // that mode the user owns every flag: all features can be toggled on or off
  // and the local services are restarted so the change takes effect.
  const standaloneMode = ref(false);

  function setBackendFeatures(features: Record<string, boolean>) {
    backendFeatures.value = features;
  }

  async function loadLocalPreferences(isStandalone = false) {
    standaloneMode.value = isStandalone;
    if (isStandalone) {
      // Keep the backend's live Browser setting while loading local
      // features that require a service restart.
      if (window.electronAPI?.standaloneGetFeatures) {
        setBackendFeatures({
          ...backendFeatures.value,
          ...await window.electronAPI.standaloneGetFeatures(),
        });
      }
      return;
    }
    if (window.electronAPI?.getSettings) {
      const settings = await window.electronAPI.getSettings();
      disabledFeatures.value = settings?.disabledFeatures || [];
    }
  }

  function isEnabled(flag: string): boolean {
    if (flag === 'browser_federation') return backendFeatures.value[flag] === true;
    if (standaloneMode.value) return backendFeatures.value[flag] !== false;
    if (backendFeatures.value[flag] === false) return false;
    if (disabledFeatures.value.includes(flag)) return false;
    return true;
  }

  function isBackendEnabled(flag: string): boolean {
    if (flag === 'browser_federation') return true;
    if (standaloneMode.value) return true;
    return backendFeatures.value[flag] !== false;
  }

  async function toggleLocalFeature(flag: string): Promise<FeatureToggleResult> {
    if (flag === 'browser_federation') {
      const enabled = !isEnabled(flag);
      const { data } = await apiClient.patch<{ enabled: boolean }>(
        '/features/browser-federation', { enabled },
      );
      setBackendFeatures({ ...backendFeatures.value, browser_federation: data.enabled });
      return { success: true };
    }
    if (standaloneMode.value) {
      if (!window.electronAPI?.standaloneSetFeatures) {
        return { success: false, error: 'Local server controls are unavailable.' };
      }
      const next = { ...backendFeatures.value, [flag]: !isEnabled(flag) };
      const result = await window.electronAPI.standaloneSetFeatures(next);
      if (result?.success) {
        setBackendFeatures(next);
        await recoverLocalConnection();
      }
      return result ?? { success: false };
    }

    const idx = disabledFeatures.value.indexOf(flag);
    if (idx >= 0) {
      disabledFeatures.value.splice(idx, 1);
    } else {
      disabledFeatures.value.push(flag);
    }
    await saveLocalPreferences();
    return { success: true };
  }

  /**
   * The local backend and models were just restarted. Requests that landed in
   * the gap can mark the backend unreachable, and once unreachable the offline
   * interceptor serves everything from cache — so clear that state explicitly
   * and rebuild the realtime socket instead of waiting for a probe.
   */
  async function recoverLocalConnection() {
    const [{ setServerReachable }, { reconnectSocket }, { useWorkspaceStore }] = await Promise.all([
      import('../services/offline/offlineInterceptor'),
      import('../services/notifications/notification'),
      import('./workspaceStore'),
    ]);
    setServerReachable(true);
    reconnectSocket(useWorkspaceStore().activeWorkspace?.url);
  }

  async function saveLocalPreferences() {
    if (window.electronAPI?.getSettings && window.electronAPI?.setSettings) {
      const settings = await window.electronAPI.getSettings();
      await window.electronAPI.setSettings({
        ...settings,
        disabledFeatures: disabledFeatures.value,
      });
    }
  }

  const featureFlags = computed(() => {
    return Object.keys(FEATURE_LABELS).map((key) => ({
      key,
      label: FEATURE_LABELS[key],
      backendEnabled: isBackendEnabled(key),
      enabled: isEnabled(key),
    }));
  });

  return {
    backendFeatures,
    disabledFeatures,
    standaloneMode,
    setBackendFeatures,
    loadLocalPreferences,
    isEnabled,
    isBackendEnabled,
    toggleLocalFeature,
    featureFlags,
  };
});
