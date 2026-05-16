import { useVoiceSettingsStore } from '../../store/voiceSettingsStore';
import type { VoiceDriver } from '../../types/voice';
import { isLocalEngineAvailable } from './availability';
import { BackendWhisperDriver } from './BackendWhisperDriver';
import { LocalWhisperDriver } from './LocalWhisperDriver';

/**
 * Returns the driver matching the user's preference.
 *
 * - If the preference is `local` but the local engine isn't packaged in
 *   this build, we fall back to the remote driver. This is not a dynamic
 *   fallback: it is a consequence of the local engine simply not existing
 *   in this binary.
 * - The factory is synchronous. Heavy loading (model download, socket
 *   opening) happens in `driver.start()`.
 */
export function createVoiceDriver(): VoiceDriver {
  const store = useVoiceSettingsStore();
  const wantsLocal = store.engine === 'local';
  const canLocal = isLocalEngineAvailable();
  console.log('[factory] createVoiceDriver wantsLocal=', wantsLocal, 'canLocal=', canLocal, 'window.voice?=', !!window.voice);

  if (wantsLocal && canLocal) {
    console.log('[factory] → LocalWhisperDriver');
    return new LocalWhisperDriver();
  }
  console.log('[factory] → BackendWhisperDriver');
  return new BackendWhisperDriver();
}
