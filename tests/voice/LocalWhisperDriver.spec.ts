import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { LocalWhisperDriver } from '@/services/voice/LocalWhisperDriver';
import type { VoiceLocalBridge } from '@/types/electron';
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve };
}
let bridge: VoiceLocalBridge;
let partial: (p: { sessionId: string; text: string; isFinal: boolean }) => void;
let driver: LocalWhisperDriver;
beforeEach(() => {
  vi.useFakeTimers();
  bridge = { isLocalAvailable: () => true, refreshAvailability: async () => true, hasModel: async () => true, preloadLocal: async () => undefined,
    startLocal: vi.fn(async () => ({ sessionId: 'one' })), pushChunkLocal: vi.fn(async () => undefined), stopLocal: vi.fn(async () => undefined), cancelLocal: vi.fn(async () => undefined),
    onPartialLocal: (cb) => { partial = cb; return vi.fn(); }, onErrorLocal: () => vi.fn(), onLoadingProgress: () => vi.fn() };
  window.voice = bridge; driver = new LocalWhisperDriver();
});
afterEach(async () => { await driver.cancel(); delete window.voice; vi.useRealTimers(); });
describe('local voice renderer delivery', () => {
  it('delivers deferred blobs in order, including the final chunk before stop', async () => {
    await driver.start(); const first = deferred<ArrayBuffer>();
    driver.pushChunk({ arrayBuffer: () => first.promise } as Blob);
    driver.pushChunk({ arrayBuffer: async () => new Uint8Array([2]).buffer } as Blob);
    const stop = driver.stop(); await vi.advanceTimersByTimeAsync(0);
    expect(bridge.stopLocal).not.toHaveBeenCalled();
    first.resolve(new Uint8Array([1]).buffer); await vi.advanceTimersByTimeAsync(0);
    expect(vi.mocked(bridge.pushChunkLocal).mock.calls.map(([, body]) => [...new Uint8Array(body)])).toEqual([[1], [2]]);
    expect(bridge.stopLocal).toHaveBeenCalledTimes(1);
    partial({ sessionId: 'one', text: 'Fixture', isFinal: true }); await stop;
  });
  it('cancels pending startup and rejects its late acceptance', async () => {
    const start = deferred<{ sessionId: string }>(); vi.mocked(bridge.startLocal).mockReturnValue(start.promise);
    const promise = driver.start(); const rejected = expect(promise).rejects.toThrow();
    await driver.cancel(); expect(bridge.cancelLocal).toHaveBeenCalledWith(undefined);
    start.resolve({ sessionId: 'old' }); await rejected;
    expect(bridge.cancelLocal).toHaveBeenCalledWith('old');
  });
  it('does not forward delayed audio after cancellation or to the next session', async () => {
    await driver.start(); const audio = deferred<ArrayBuffer>(); driver.pushChunk({ arrayBuffer: () => audio.promise } as Blob);
    await vi.advanceTimersByTimeAsync(0); await driver.cancel();
    vi.mocked(bridge.startLocal).mockResolvedValueOnce({ sessionId: 'two' }); await driver.start();
    audio.resolve(new Uint8Array([1]).buffer); await vi.advanceTimersByTimeAsync(0);
    expect(bridge.pushChunkLocal).not.toHaveBeenCalled();
  });
  it('ignores another session and isolates failing listeners from finalization', async () => {
    await driver.start(); driver.onPartial(() => { throw new Error('listener'); });
    const observed = vi.fn(); driver.onPartial(observed); const stop = driver.stop();
    partial({ sessionId: 'other', text: 'Wrong', isFinal: true }); expect(observed).not.toHaveBeenCalled();
    partial({ sessionId: 'one', text: 'Right', isFinal: true }); await stop;
    expect(observed).toHaveBeenCalledOnce();
  });
  it('times out even while Blob conversion is pending and never sends it later', async () => {
    await driver.start(); const audio = deferred<ArrayBuffer>();
    driver.pushChunk({ arrayBuffer: () => audio.promise } as Blob);
    const stopped = driver.stop(); const rejected = expect(stopped).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(60000); await rejected;
    audio.resolve(new Uint8Array([1]).buffer); await vi.advanceTimersByTimeAsync(0);
    expect(bridge.pushChunkLocal).not.toHaveBeenCalled(); expect(bridge.stopLocal).not.toHaveBeenCalled();
  });
  it('rejects timeout and requests cancellation instead of reporting success', async () => {
    await driver.start(); const stopped = driver.stop(); const rejection = expect(stopped).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(60000); await rejection; expect(bridge.cancelLocal).toHaveBeenCalledWith('one');
  });
});
