import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export type VoiceEngine = 'local' | 'remote';

const STORAGE_KEY = 'voice.engine';
const DEFAULT_ENGINE: VoiceEngine = 'local';

function readStored(): VoiceEngine {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'local' || raw === 'remote') return raw;
  } catch {
    // localStorage may be unavailable (SSR, tests); fall through to default
  }
  return DEFAULT_ENGINE;
}

export const useVoiceSettingsStore = defineStore('voiceSettings', () => {
  const engine = ref<VoiceEngine>(readStored());

  function setEngine(next: VoiceEngine) {
    engine.value = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }

  const currentEngine = computed<VoiceEngine>(() => engine.value);

  return {
    engine,
    currentEngine,
    setEngine,
  };
});
