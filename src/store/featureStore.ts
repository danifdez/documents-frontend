import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const FEATURE_LABELS: Record<string, string> = {
  authors: 'Authors',
  canvas: 'Canvas',
  datasets: 'Datasets',
  notes: 'Notes',
  calendar: 'Calendar',
  timelines: 'Timelines',
  knowledge_base: 'Knowledge Base',
  bibliography: 'Bibliography',
  tasks: 'Tasks',
  rag: 'AI / RAG',
  relationships: 'Relationships',
};

export const useFeatureStore = defineStore('features', () => {
  const backendFeatures = ref<Record<string, boolean>>({});
  const disabledFeatures = ref<string[]>([]);

  function setBackendFeatures(features: Record<string, boolean>) {
    backendFeatures.value = features;
  }

  async function loadLocalPreferences() {
    if (window.electronAPI?.getSettings) {
      const settings = await window.electronAPI.getSettings();
      disabledFeatures.value = settings?.disabledFeatures || [];
    }
  }

  function isEnabled(flag: string): boolean {
    if (backendFeatures.value[flag] === false) return false;
    if (disabledFeatures.value.includes(flag)) return false;
    return true;
  }

  function isBackendEnabled(flag: string): boolean {
    return backendFeatures.value[flag] !== false;
  }

  async function toggleLocalFeature(flag: string) {
    const idx = disabledFeatures.value.indexOf(flag);
    if (idx >= 0) {
      disabledFeatures.value.splice(idx, 1);
    } else {
      disabledFeatures.value.push(flag);
    }
    await saveLocalPreferences();
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
    setBackendFeatures,
    loadLocalPreferences,
    isEnabled,
    isBackendEnabled,
    toggleLocalFeature,
    featureFlags,
  };
});
