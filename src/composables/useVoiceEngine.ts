import { storeToRefs } from 'pinia';
import { useVoiceSettingsStore, type VoiceEngine } from '../store/voiceSettingsStore';

export function useVoiceEngine(): {
  engine: ReturnType<typeof storeToRefs<ReturnType<typeof useVoiceSettingsStore>>>['engine'];
  setEngine: (next: VoiceEngine) => void;
} {
  const store = useVoiceSettingsStore();
  const { engine } = storeToRefs(store);
  return { engine, setEngine: store.setEngine };
}
