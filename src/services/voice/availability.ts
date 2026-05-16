/**
 * Single source of truth for whether the local Whisper engine is usable in
 * this build. Backed by the Electron preload bridge `window.voice` (Task 08):
 * `isLocalAvailable()` returns `true` only if the native bindings loaded
 * correctly for this platform/arch.
 *
 * If the preload does not expose the bridge (tests, pure web), returns `false`.
 */
export function isLocalEngineAvailable(): boolean {
  return window.voice?.isLocalAvailable?.() === true;
}
