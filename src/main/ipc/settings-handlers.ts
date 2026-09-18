import { globalShortcut } from 'electron';
import type Store from 'electron-store';
import { IpcChannels } from '../../ipc/channels';
import type { IpcHandlerMap } from './registry';

interface SettingsHandlerDeps {
  store: Store;
  applySettingsEffects: (
    settings: Record<string, any>,
    previous: Record<string, any> | null,
  ) => void;
  isTrayAvailable: () => boolean;
}

/** Default global shortcut for the floating quick assistant window. */
export const DEFAULT_QUICK_ASSISTANT_SHORTCUT = 'CommandOrControl+Shift+Space';

export function createSettingsHandlers({
  store,
  applySettingsEffects,
  isTrayAvailable,
}: SettingsHandlerDeps): IpcHandlerMap {
  return {
    [IpcChannels.settings.get]: () => {
      return store.get('settings', {
        fontSize: 16,
        fontFamily: 'sans-serif',
        paragraphSpacing: 1.5,
        language: 'en',
        theme: 'dark',
        disabledFeatures: [],
        // Tray / residente. Defaults only apply when the store
        // has no `settings` yet; users with existing persisted settings will
        // see `undefined` here and consumers fall back to these values via
        // `?? <default>` locally.
        closeBehavior: 'tray',
        launchAtLogin: false,
        toggleShortcut: null,
        quickAssistantShortcut: DEFAULT_QUICK_ASSISTANT_SHORTCUT,
        hideDockIcon: false,
        // Preload of the local Whisper model on startup.
        preloadVoiceModel: false,
      });
    },

    [IpcChannels.settings.set]: (_event, settings) => {
      const previous = store.get('settings') as Record<string, any> | undefined;
      store.set('settings', settings);
      applySettingsEffects(settings, previous ?? null);
      const shortcutOk = settings?.toggleShortcut
        ? globalShortcut.isRegistered(settings.toggleShortcut)
        : true;
      const quickShortcutOk = settings?.quickAssistantShortcut
        ? globalShortcut.isRegistered(settings.quickAssistantShortcut)
        : true;
      return { ok: true, shortcutOk, quickShortcutOk };
    },

    // ── Dev-only handler to reset the first-close hint
    // so the didactic toast can be re-tested without hand-editing the store.
    ...(process.env.NODE_ENV === 'development'
      ? {
        [IpcChannels.debug.resetTrayHint]: () => {
          const flags = (store.get('flags') as Record<string, any> | undefined) ?? {};
          delete flags.hasSeenTrayHint;
          store.set('flags', flags);
          return { ok: true };
        },
      }
      : {}),

    // ── Expose tray availability to the renderer so the
    // Settings UI can disable tray-dependent controls when the OS has no
    // system tray (e.g. GNOME without AppIndicator).
    [IpcChannels.app.trayAvailable]: () => isTrayAvailable(),

    // ── Expose process.platform to the renderer to gate
    // platform-specific toggles (`launchAtLogin` Linux, `hideDockIcon` macOS).
    [IpcChannels.app.getPlatform]: () => process.platform,
  };
}
