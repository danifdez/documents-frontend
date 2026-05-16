import { onBeforeUnmount, readonly, ref } from 'vue';
import { createVoiceDriver } from '../services/voice/voiceDriverFactory';
import type { VoiceDriver, VoicePartial } from '../types/voice';

export type VoiceSessionState =
  | 'idle'
  | 'starting'
  | 'recording'
  | 'stopping'
  | 'error';

/**
 * Reactive wrapper around `createVoiceDriver()` for containers that
 * integrate dictation (NotesPanel, AssistantComposer, etc). The
 * `VoiceCaptureButton` itself does not need it — it manages the driver
 * lifecycle internally.
 */
export function useVoiceSession() {
  const state = ref<VoiceSessionState>('idle');
  const text = ref<string>('');
  const error = ref<Error | null>(null);

  let driver: VoiceDriver | null = null;
  let unsubPartial: (() => void) | null = null;
  let unsubError: (() => void) | null = null;

  async function start(): Promise<void> {
    if (driver) return;
    state.value = 'starting';
    text.value = '';
    error.value = null;
    driver = createVoiceDriver();
    unsubPartial = driver.onPartial((p: VoicePartial) => {
      text.value = p.text;
    });
    unsubError = driver.onError((err) => {
      error.value = err;
      state.value = 'error';
      void cleanup();
    });
    try {
      await driver.start();
      state.value = 'recording';
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      state.value = 'error';
      await cleanup();
    }
  }

  async function pushChunk(blob: Blob): Promise<void> {
    if (driver && state.value === 'recording') driver.pushChunk(blob);
  }

  async function stop(): Promise<void> {
    if (!driver) return;
    state.value = 'stopping';
    try {
      await driver.stop();
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
      state.value = 'error';
    } finally {
      await cleanup();
      if (state.value !== 'error') state.value = 'idle';
    }
  }

  async function cleanup() {
    if (unsubPartial) { unsubPartial(); unsubPartial = null; }
    if (unsubError) { unsubError(); unsubError = null; }
    driver = null;
  }

  onBeforeUnmount(() => { void cleanup(); });

  return {
    state: readonly(state),
    text: readonly(text),
    error: readonly(error),
    start,
    pushChunk,
    stop,
  };
}
