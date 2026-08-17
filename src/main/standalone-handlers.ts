import { ipcMain, BrowserWindow } from 'electron';
import type Store from 'electron-store';
import { standaloneManager } from '../services/standalone/standalone-manager';
import {
  checkInstalled,
  isStandaloneReady,
  downloadComponent,
  downloadAll,
  installModels,
  uninstallServices,
  uninstallModels,
  detectGpu,
  installProfile,
  type DownloadProgress,
} from '../services/standalone/download-manager';
import { getHardwareReport, ALL_FEATURES } from '../services/standalone/hardware';

interface StandaloneHandlerDeps {
  store: Store;
  getMainWindow: () => BrowserWindow | null;
}

/**
 * Feature map the local services boot with: optional features the install
 * didn't enable are off; the base stays default-on.
 */
export function resolveStandaloneFeatures(store: Store): Record<string, boolean> {
  const profile = store.get('standaloneProfile') as { features?: string[] } | undefined;
  const enabled = profile?.features ?? (ALL_FEATURES as readonly string[]);
  return Object.fromEntries(ALL_FEATURES.map((f) => [f, enabled.includes(f)]));
}

export function registerStandaloneHandlers({ store, getMainWindow }: StandaloneHandlerDeps): void {
  const emitProgress = (progress: DownloadProgress) => {
    getMainWindow()?.webContents.send('standalone:download-progress', progress);
  };

  ipcMain.handle('standalone:check-installed', () => {
    return checkInstalled();
  });

  ipcMain.handle('standalone:is-ready', () => {
    return isStandaloneReady();
  });

  ipcMain.handle('standalone:detect-gpu', () => {
    return detectGpu();
  });

  ipcMain.handle('standalone:hardware-report', () => {
    return getHardwareReport();
  });

  ipcMain.handle('standalone:download-all', async () => {
    try {
      await downloadAll(emitProgress);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('standalone:install-profile', async (_, profile: { key: string; components: string[]; features: string[] }) => {
    try {
      await installProfile(profile.components, emitProgress);
      // Persist the install so the backend boots with the optional flags off.
      store.set('standaloneProfile', { key: profile.key, features: profile.features });
      return { success: true };
    } catch (err: any) {
      console.error('Profile install failed:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('standalone:download-component', async (_, component: string) => {
    try {
      await downloadComponent(component, emitProgress);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('standalone:uninstall-services', async () => {
    try {
      await standaloneManager.stop();
      await uninstallServices();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('standalone:install-models', async (_, variant: string) => {
    try {
      await installModels(variant as 'models-cpu' | 'models-gpu', emitProgress);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('standalone:uninstall-models', async () => {
    try {
      await uninstallModels();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('standalone:start', async () => {
    try {
      const url = await standaloneManager.start({ features: resolveStandaloneFeatures(store) });
      return { success: true, url };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('standalone:stop', async () => {
    try {
      await standaloneManager.stop();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('standalone:status', () => {
    return standaloneManager.getStatus();
  });

  ipcMain.handle('standalone:get-url', () => {
    return standaloneManager.getBackendUrl();
  });
}
