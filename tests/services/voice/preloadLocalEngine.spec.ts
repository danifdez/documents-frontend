import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { preloadLocalEngineIfNeeded } from '@/services/voice/preloadLocalEngine';
import { useVoiceSettingsStore } from '@/store/voiceSettingsStore';

const isLocalAvailable = vi.fn();
const preloadLocal = vi.fn();

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
  isLocalAvailable.mockReset().mockReturnValue(true);
  preloadLocal.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('preloading desktop dictation', () => {
  it('only starts preloading when local engine support is present and selected', () => {
    preloadLocalEngineIfNeeded();
    expect(preloadLocal).not.toHaveBeenCalled();

    vi.stubGlobal('voice', { isLocalAvailable, preloadLocal });
    isLocalAvailable.mockReturnValueOnce(false);
    preloadLocalEngineIfNeeded();
    expect(preloadLocal).not.toHaveBeenCalled();

    const settings = useVoiceSettingsStore();
    settings.setEngine('remote');
    preloadLocalEngineIfNeeded();
    expect(preloadLocal).not.toHaveBeenCalled();

    settings.setEngine('local');
    preloadLocalEngineIfNeeded();
    expect(preloadLocal).toHaveBeenCalledOnce();
  });

  it('handles a failed preload in the background so dictation can retry on demand', async () => {
    vi.stubGlobal('voice', { isLocalAvailable, preloadLocal });
    const failure = new Error('Model download unavailable');
    preloadLocal.mockRejectedValueOnce(failure);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(preloadLocalEngineIfNeeded()).toBeUndefined();
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith(
      '[voice] preload failed (will retry on first dictation)', failure,
    ));
  });
});
