import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useVoiceSettingsStore } from '@/store/voiceSettingsStore';

describe('voiceSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it('defaults to local when no preference is stored', () => {
    const store = useVoiceSettingsStore();
    expect(store.engine).toBe('local');
  });

  it('persists a change to localStorage', () => {
    const store = useVoiceSettingsStore();
    store.setEngine('remote');
    expect(localStorage.getItem('voice.engine')).toBe('remote');
    expect(store.engine).toBe('remote');
  });

  it('reads a previously stored preference on fresh instance', () => {
    localStorage.setItem('voice.engine', 'remote');
    setActivePinia(createPinia());
    const store = useVoiceSettingsStore();
    expect(store.engine).toBe('remote');
  });

  it('ignores invalid stored values and falls back to local', () => {
    localStorage.setItem('voice.engine', 'garbage');
    setActivePinia(createPinia());
    const store = useVoiceSettingsStore();
    expect(store.engine).toBe('local');
  });
});
