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

  async function setSettings(settings: any) {
    if (!isElectron) return;
    return window.electronAPI.setSettings(settings);
  }

  async function openMultipleFileDialog() {
    if (!isElectron) return [];
    return window.electronAPI.openMultipleFileDialog();
  }

  async function openExternalBrowser(projectId: string) {
    if (!isElectron) return;
    return window.electronAPI.openExternalBrowser(projectId);
  }

  async function uploadDocument(projectId: string, filePath: string) {
    if (!isElectron) return null;
    return window.electronAPI.uploadDocument(projectId, filePath);
  }

  return {
    isElectron,
    getSettings,
    setSettings,
    openMultipleFileDialog,
    openExternalBrowser,
    uploadDocument,
  };
}
