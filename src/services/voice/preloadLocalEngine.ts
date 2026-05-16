import { useVoiceSettingsStore } from '../../store/voiceSettingsStore';

/**
 * Kicks off the local engine preload (model download + whisper instance
 * load) in the background. Safe to call multiple times: the main-process
 * side is idempotent.
 *
 * No-op when:
 *   - The bridge is not exposed (web build).
 *   - The native bindings did not load on this platform.
 *   - The user's selected engine is not `local`.
 */
export function preloadLocalEngineIfNeeded(): void {
  const bridge = window.voice;
  if (!bridge) return;
  if (!bridge.isLocalAvailable()) return;
  const store = useVoiceSettingsStore();
  if (store.engine !== 'local') return;
  bridge.preloadLocal().catch((err) => {
    console.warn('[voice] preload failed (will retry on first dictation)', err);
  });
}
