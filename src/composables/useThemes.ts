import { ref } from 'vue';
import type { ThemeManifestType } from '../types/electron';
import { useTheme } from './useTheme';

export interface InstalledThemeEntry {
  manifest: ThemeManifestType;
  builtIn: boolean;
}

const themes = ref<InstalledThemeEntry[]>([]);
const loading = ref(false);

export function useThemes() {
  const { activeThemeId, setActiveTheme } = useTheme();

  const refresh = async () => {
    if (!window.electronAPI?.listThemes) return;
    loading.value = true;
    try {
      themes.value = await window.electronAPI.listThemes();
    } finally {
      loading.value = false;
    }
  };

  const installTheme = async () => {
    if (!window.electronAPI?.installTheme) {
      return { success: false as const, error: 'electronAPI unavailable' };
    }
    const result = await window.electronAPI.installTheme();
    if (result.success) await refresh();
    return result;
  };

  const uninstallTheme = async (id: string) => {
    if (!window.electronAPI?.uninstallTheme) {
      return { success: false, error: 'electronAPI unavailable' };
    }
    const result = await window.electronAPI.uninstallTheme(id);
    if (result.success) {
      if (activeThemeId.value === id) {
        await setActiveTheme('default');
        await persistActiveTheme('default');
      }
      await refresh();
    }
    return result;
  };

  const activateTheme = async (id: string) => {
    await setActiveTheme(id);
    await persistActiveTheme(id);
  };

  return {
    themes,
    loading,
    activeThemeId,
    refresh,
    installTheme,
    uninstallTheme,
    activateTheme,
  };
}

async function persistActiveTheme(id: string) {
  if (!window.electronAPI?.getSettings || !window.electronAPI?.setSettings) return;
  const settings = (await window.electronAPI.getSettings()) || {};
  await window.electronAPI.setSettings({ ...settings, themeId: id });
}
