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
 * Feature map the local services boot with. The user's explicit selection
 * (`standaloneEnabledFeatures`, updated from Settings) wins; otherwise the
 * install profile applies, and a profile-less install defaults everything on.
 */
export function resolveStandaloneFeatures(store: Store): Record<string, boolean> {
  const profile = store.get('standaloneProfile') as { features?: string[] } | undefined;
  const enabled = (store.get('standaloneEnabledFeatures') as string[] | undefined)
    ?? profile?.features
    ?? (ALL_FEATURES as readonly string[]);
  return Object.fromEntries(ALL_FEATURES.map((f) => [f, enabled.includes(f)]));
}

export const DEFAULT_STANDALONE_BACKEND_PORT = 32100;

export function resolveStandaloneBackendPort(store: Store): number {
  const configured = store.get('standaloneBackendPort');
  return typeof configured === 'number' && Number.isInteger(configured)
    && configured >= 1024 && configured <= 65535
    ? configured
    : DEFAULT_STANDALONE_BACKEND_PORT;
}

function startStandalone(store: Store): Promise<string> {
  return standaloneManager.start({
    features: resolveStandaloneFeatures(store),
    backendPort: resolveStandaloneBackendPort(store),
  });
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
        await startStandalone(store);
        return { success: true, updated };
      } catch (err: any) {
        try {
          await startStandalone(store);
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
        // A fresh install resets any previous per-feature selection.
        store.set('standaloneEnabledFeatures', profile.features);
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
        const url = await startStandalone(store);
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

    [IpcChannels.standalone.getPort]: () => resolveStandaloneBackendPort(store),

    [IpcChannels.standalone.setPort]: async (_, port: unknown) => {
      if (typeof port !== 'number' || !Number.isInteger(port) || port < 1024 || port > 65535) {
        return { success: false, error: 'Port must be an integer between 1024 and 65535.' };
      }

      const previousPort = resolveStandaloneBackendPort(store);
      store.set('standaloneBackendPort', port);
      if (!standaloneManager.isRunning()) return { success: true };

      await standaloneManager.stop();
      try {
        return { success: true, url: await startStandalone(store) };
      } catch (err: any) {
        store.set('standaloneBackendPort', previousPort);
        try { await startStandalone(store); } catch { /* preserve the original error */ }
        return { success: false, error: err.message };
      }
    },

    [IpcChannels.standalone.getFeatures]: () => {
      return resolveStandaloneFeatures(store);
    },

    [IpcChannels.standalone.setFeatures]: async (_, features: Record<string, boolean>) => {
      if (!features || typeof features !== 'object') {
        return { success: false, error: 'Invalid feature selection.' };
      }
      const enabled = ALL_FEATURES.filter((flag) => features[flag] !== false);
      store.set('standaloneEnabledFeatures', enabled);
      try {
        if (standaloneManager.isRunning()) {
          await standaloneManager.applyFeatures(resolveStandaloneFeatures(store));
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  });
}
