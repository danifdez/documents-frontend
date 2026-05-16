import { describe, expect, it, vi } from 'vitest';
import { MockVoiceDriver } from '@/services/voice/MockVoiceDriver';
import type { VoicePartial } from '@/types/voice';

describe('MockVoiceDriver', () => {
  it('emits accumulated partials between start and stop', async () => {
    vi.useFakeTimers();
    const driver = new MockVoiceDriver('remote', 50);
    const partials: VoicePartial[] = [];
    driver.onPartial((p) => partials.push(p));

    await driver.start();
    await vi.advanceTimersByTimeAsync(160); // ~3 ticks
    const stopPromise = driver.stop();
    await vi.advanceTimersByTimeAsync(0);
    await stopPromise;

    expect(partials.length).toBeGreaterThan(0);
    expect(partials[partials.length - 1].isFinal).toBe(true);
    const lengths = partials.map((p) => p.text.length);
    const sorted = [...lengths].sort((a, b) => a - b);
    expect(lengths).toEqual(sorted);
    vi.useRealTimers();
  });

  it('respects the engine passed at construction', () => {
    expect(new MockVoiceDriver('local').engine).toBe('local');
    expect(new MockVoiceDriver('remote').engine).toBe('remote');
  });

  it('returns an unsubscribe function from onPartial', async () => {
    vi.useFakeTimers();
    const driver = new MockVoiceDriver('remote', 50);
    let calls = 0;
    const unsub = driver.onPartial(() => { calls += 1; });

    await driver.start();
    await vi.advanceTimersByTimeAsync(60);
    expect(calls).toBeGreaterThan(0);

    const before = calls;
    unsub();
    await vi.advanceTimersByTimeAsync(120);
    expect(calls).toBe(before);

    await driver.stop();
    vi.useRealTimers();
  });
});
