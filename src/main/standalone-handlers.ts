import { BrowserWindow } from 'electron';
import type Store from 'electron-store';
import { standaloneManager } from '../services/standalone/standalone-manager';
import {
  checkInstalled,
  isStandaloneReady,
  downloadComponent,
  downloadAll,
  updateServices,
  installModels,
  uninstallServices,
  uninstallModels,
  detectGpu,
  installProfile,
  type DownloadProgress,
} from '../services/standalone/download-manager';
import { getHardwareReport, ALL_FEATURES } from '../services/standalone/hardware';
import { IpcChannels, IpcEvents } from '../ipc/channels';
import { registerIpcHandlers } from './ipc/registry';

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
    getMainWindow()?.webContents.send(IpcEvents.standalone.downloadProgress, progress);
  };

  registerIpcHandlers({
    [IpcChannels.standalone.checkInstalled]: () => {
      return checkInstalled();
    },

    [IpcChannels.standalone.isReady]: () => {
      return isStandaloneReady();
    },

    [IpcChannels.standalone.detectGpu]: () => {
      return detectGpu();
    },

    [IpcChannels.standalone.hardwareReport]: () => {
      return getHardwareReport();
    },

    [IpcChannels.standalone.downloadAll]: async () => {
      try {
        await downloadAll(emitProgress);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    [IpcChannels.standalone.updateServices]: async () => {
      try {
        await standaloneManager.stop();
        const updated = await updateServices(emitProgress);
        await standaloneManager.start({ features: resolveStandaloneFeatures(store) });
        return { success: true, updated };
      } catch (err: any) {
        try {
          await standaloneManager.start({ features: resolveStandaloneFeatures(store) });
        } catch {
          // Keep the original update error; the manager exposes startup details separately.
        }
        return { success: false, error: err.message };
      }
    },

    [IpcChannels.standalone.installProfile]: async (_, profile: { key: string; components: string[]; features: string[] }) => {
      try {
        await installProfile(profile.components, emitProgress);
        // Persist the install so the backend boots with the optional flags off.
        store.set('standaloneProfile', { key: profile.key, features: profile.features });
        return { success: true };
      } catch (err: any) {
        console.error('Profile install failed:', err);
        return { success: false, error: err.message };
      }
    },

    [IpcChannels.standalone.downloadComponent]: async (_, component: string) => {
      try {
        await downloadComponent(component, emitProgress);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    [IpcChannels.standalone.uninstallServices]: async () => {
      try {
        await standaloneManager.stop();
        await uninstallServices();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    [IpcChannels.standalone.installModels]: async (_, variant: string) => {
      try {
        await installModels(variant as 'models-cpu' | 'models-gpu', emitProgress);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    [IpcChannels.standalone.uninstallModels]: async () => {
      try {
        await uninstallModels();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    [IpcChannels.standalone.start]: async () => {
      try {
        const url = await standaloneManager.start({ features: resolveStandaloneFeatures(store) });
        return { success: true, url };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    [IpcChannels.standalone.stop]: async () => {
      try {
        await standaloneManager.stop();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    [IpcChannels.standalone.status]: () => {
      return standaloneManager.getStatus();
    },

    [IpcChannels.standalone.getUrl]: () => {
      return standaloneManager.getBackendUrl();
    },

    [IpcChannels.standalone.getFeatures]: () => {
      return resolveStandaloneFeatures(store);
    },
  });
}
