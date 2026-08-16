import { DEFAULT_LANGUAGE } from '../config/constants';

/**
 * Safe wrapper around window.electronAPI for use in components.
 * Returns no-op stubs when running in browser (non-Electron) context.
 */
export function useElectronApi() {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  async function getSettings() {
    if (!isElectron) return null;
    return window.electronAPI.getSettings();
  }

  async function getLanguage(): Promise<string> {
    const settings = await getSettings();
    return settings?.language || DEFAULT_LANGUAGE;
  }

  async function setSettings(settings: any) {
    if (!isElectron) return;
    return window.electronAPI.setSettings(settings);
  }

  async function openMultipleFileDialog() {
    if (!isElectron) return [];
    return window.electronAPI.openMultipleFileDialog();
  }

  async function uploadDocument(projectId: string, filePath: string) {
    if (!isElectron) return null;
    return window.electronAPI.uploadDocument(projectId, filePath);
  }

  return {
    isElectron,
    getSettings,
    getLanguage,
    setSettings,
    openMultipleFileDialog,
    uploadDocument,
  };
}
