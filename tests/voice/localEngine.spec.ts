// @vitest-environment node
import { EventEmitter } from 'node:events';
import type { WebContents } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/main/voice/modelManager', () => ({ ensureModelDownloaded: vi.fn(() => { throw new Error('No real models'); }), isModelReady: vi.fn(), modelPath: vi.fn() }));
import { LocalEngine, VOICE_LIMITS, type VoiceRuntime } from '@/main/voice/localEngine';
import { createVoiceHandlers } from '@/main/ipc/voice-handlers';
import { IpcChannels, IpcEvents } from '@/ipc/channels';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}
class Window extends EventEmitter {
  destroyed = false;
  send = vi.fn();
  mainFrame = {};
  isDestroyed() { return this.destroyed; }
  get wc() { return this as unknown as WebContents; }
}
let engine: LocalEngine;
let owner: Window;
let other: Window;
let model: { transcribe: ReturnType<typeof vi.fn>; free: ReturnType<typeof vi.fn> };
let runtime: VoiceRuntime;
beforeEach(() => {
  vi.useFakeTimers();
  owner = new Window(); other = new Window();
  model = { transcribe: vi.fn(async () => ({ result: Promise.resolve([{ text: 'Private fixture' }]) })), free: vi.fn(async () => undefined) };
  runtime = { available: () => true, hasModel: async () => true, load: vi.fn(async () => model), decode: vi.fn(async () => new Float32Array([1])) };
  engine = new LocalEngine(runtime);
});
afterEach(async () => { await engine.shutdown(); vi.useRealTimers(); });
const partials = () => owner.send.mock.calls.filter(([name]) => name === IpcEvents.voice.partial);

describe('local voice ownership and lifecycle', () => {
  it('reserves startup before preload and cancels only for its owner', async () => {
    const load = deferred<typeof model>(); runtime.load = () => load.promise;
    const start = engine.startSession(owner.wc); const cancelled = expect(start).rejects.toThrow('cancelled');
    await expect(engine.startSession(other.wc)).rejects.toThrow('busy');
    await expect(engine.cancelSession(other.wc)).rejects.toThrow('unavailable');
    await engine.cancelSession(owner.wc);
    load.resolve(model); await cancelled;
    expect(owner.send).not.toHaveBeenCalled();
    expect(await engine.startSession(other.wc)).toHaveProperty('sessionId');
  });
  it('rejects another owner and wrong session IDs without affecting the active session', async () => {
    const { sessionId } = await engine.startSession(owner.wc);
    expect(() => engine.pushChunk(other.wc, sessionId, Buffer.from([1]))).toThrow('unavailable');
    await expect(engine.cancelSession(other.wc, sessionId)).rejects.toThrow('unavailable');
    expect(() => engine.stopSession(other.wc, sessionId)).toThrow('unavailable');
    expect(() => engine.pushChunk(owner.wc, 'wrong', Buffer.from([1]))).toThrow('unavailable');
    engine.pushChunk(owner.wc, sessionId, Buffer.from([2]));
    await engine.stopSession(owner.wc, sessionId);
    expect(model.transcribe).toHaveBeenCalledTimes(1);
  });
  it('stops once and copies the input before the caller can mutate it', async () => {
    const { sessionId } = await engine.startSession(owner.wc); const bytes = Buffer.from([4]);
    engine.pushChunk(owner.wc, sessionId, bytes); bytes[0] = 9;
    const first = engine.stopSession(owner.wc, sessionId); const second = engine.stopSession(owner.wc, sessionId);
    expect(first).toBe(second); await first;
    await engine.stopSession(owner.wc, sessionId);
    expect(runtime.decode).toHaveBeenCalledWith(Buffer.from([4]), expect.any(AbortSignal));
    expect(model.transcribe).toHaveBeenCalledTimes(1); expect(partials()).toHaveLength(1);
  });
  it('drains a cancelled native final and discards its late output before reuse', async () => {
    const native = deferred<{ text: string }[]>(); model.transcribe.mockResolvedValueOnce({ result: native.promise });
    const { sessionId } = await engine.startSession(owner.wc); engine.pushChunk(owner.wc, sessionId, Buffer.from([1]));
    const stop = engine.stopSession(owner.wc, sessionId); await vi.advanceTimersByTimeAsync(0);
    await engine.cancelSession(owner.wc, sessionId);
    await expect(engine.startSession(other.wc)).rejects.toThrow('busy');
    native.resolve([{ text: 'Never deliver this' }]); await stop;
    expect(partials()).toHaveLength(0);
    const next = await engine.startSession(other.wc); engine.pushChunk(other.wc, next.sessionId, Buffer.from([2]));
    await engine.stopSession(other.wc, next.sessionId);
    expect(other.send).toHaveBeenCalledWith(IpcEvents.voice.partial, expect.objectContaining({ text: 'Private fixture', isFinal: true }));
  });
  it('waits for an active partial before starting the final pass', async () => {
    const native = deferred<{ text: string }[]>(); model.transcribe.mockResolvedValueOnce({ result: native.promise });
    const { sessionId } = await engine.startSession(owner.wc); engine.pushChunk(owner.wc, sessionId, Buffer.from([1]));
    await vi.advanceTimersByTimeAsync(2000); const stop = engine.stopSession(owner.wc, sessionId);
    await vi.advanceTimersByTimeAsync(31000); expect(model.transcribe).toHaveBeenCalledTimes(1);
    native.resolve([{ text: 'Stale partial' }]); await stop;
    expect(model.transcribe).toHaveBeenCalledTimes(2); expect(partials()).toHaveLength(1);
    expect(partials()[0][1]).toMatchObject({ text: 'Private fixture', isFinal: true });
  });
  it.each(['destroyed', 'render-process-gone', 'navigation'])('closes on %s and discards delayed decoding', async (reason) => {
    const decode = deferred<Float32Array>(); runtime.decode = () => decode.promise;
    const { sessionId } = await engine.startSession(owner.wc); engine.pushChunk(owner.wc, sessionId, Buffer.from([1]));
    const stop = engine.stopSession(owner.wc, sessionId); await vi.advanceTimersByTimeAsync(0);
    if (reason === 'navigation') owner.emit('did-start-navigation', { isMainFrame: true, isSameDocument: false });
    else owner.emit(reason);
    decode.resolve(new Float32Array([1])); await stop;
    expect(model.transcribe).not.toHaveBeenCalled(); expect(partials()).toHaveLength(0);
    await engine.startSession(other.wc);
  });
  it('times out native work without releasing it early or declaring success', async () => {
    const native = deferred<{ text: string }[]>(); model.transcribe.mockResolvedValueOnce({ result: native.promise });
    const { sessionId } = await engine.startSession(owner.wc); engine.pushChunk(owner.wc, sessionId, Buffer.from([1]));
    const stop = engine.stopSession(owner.wc, sessionId); await vi.advanceTimersByTimeAsync(VOICE_LIMITS.callMs);
    await expect(engine.startSession(other.wc)).rejects.toThrow('busy');
    expect(owner.send).toHaveBeenCalledWith(IpcEvents.voice.error, expect.objectContaining({ message: 'Local voice processing timed out' }));
    native.resolve([{ text: 'Late text' }]); await stop; expect(partials()).toHaveLength(0);
  });
  it('limits chunk size, aggregate input, chunk count, calls and session lifetime', async () => {
    let s = await engine.startSession(owner.wc);
    expect(() => engine.pushChunk(owner.wc, s.sessionId, Buffer.alloc(VOICE_LIMITS.chunkBytes + 1))).toThrow('Invalid');
    s = await engine.startSession(owner.wc);
    for (let i = 0; i < VOICE_LIMITS.audioBytes / VOICE_LIMITS.chunkBytes; i++) engine.pushChunk(owner.wc, s.sessionId, Buffer.alloc(VOICE_LIMITS.chunkBytes));
    expect(() => engine.pushChunk(owner.wc, s.sessionId, Buffer.from([1]))).toThrow('Invalid');
    s = await engine.startSession(owner.wc);
    for (let i = 0; i < VOICE_LIMITS.chunks; i++) engine.pushChunk(owner.wc, s.sessionId, Buffer.from([1]));
    expect(() => engine.pushChunk(owner.wc, s.sessionId, Buffer.from([1]))).toThrow('Invalid');
    s = await engine.startSession(owner.wc); engine.pushChunk(owner.wc, s.sessionId, Buffer.from([1]));
    await vi.advanceTimersByTimeAsync((VOICE_LIMITS.calls + 1) * 2000);
    expect(model.transcribe).toHaveBeenCalledTimes(VOICE_LIMITS.calls);
    s = await engine.startSession(owner.wc); await vi.advanceTimersByTimeAsync(VOICE_LIMITS.sessionMs);
    expect(owner.send).toHaveBeenCalledWith(IpcEvents.voice.error, expect.objectContaining({ message: 'Local voice session limit exceeded' }));
    await engine.startSession(other.wc);
  });
  it('keeps same-document navigation and drains native work before shutdown/free', async () => {
    const native = deferred<{ text: string }[]>(); model.transcribe.mockResolvedValueOnce({ result: native.promise });
    const { sessionId } = await engine.startSession(owner.wc);
    owner.emit('did-start-navigation', { isMainFrame: true, isSameDocument: true });
    engine.pushChunk(owner.wc, sessionId, Buffer.from([1]));
    const stopped = engine.stopSession(owner.wc, sessionId); await vi.advanceTimersByTimeAsync(0);
    const shutdown = engine.shutdown(); expect(model.free).not.toHaveBeenCalled();
    native.resolve([{ text: 'Discard' }]); await stopped; await shutdown;
    expect(model.free).toHaveBeenCalledTimes(1); expect(partials()).toHaveLength(0);
    expect(model.transcribe).toHaveBeenCalledWith(expect.any(Float32Array), expect.objectContaining({ print_realtime: false, print_progress: false }));
  });
  it('revalidates the model before a new call even when preparation is cached', async () => {
    const first = await engine.startSession(owner.wc); engine.pushChunk(owner.wc, first.sessionId, Buffer.from([1]));
    await engine.stopSession(owner.wc, first.sessionId);
    runtime.hasModel = async () => false;
    const next = await engine.startSession(owner.wc); engine.pushChunk(owner.wc, next.sessionId, Buffer.from([1]));
    await expect(engine.stopSession(owner.wc, next.sessionId)).rejects.toThrow('processing failed');
    expect(runtime.load).toHaveBeenCalledTimes(1); expect(model.transcribe).toHaveBeenCalledTimes(1);
  });
  it('does not deliver a result when model verification changes during native work', async () => {
    const native = deferred<{ text: string }[]>(); model.transcribe.mockResolvedValueOnce({ result: native.promise });
    const s = await engine.startSession(owner.wc); engine.pushChunk(owner.wc, s.sessionId, Buffer.from([1]));
    const pending = engine.stopSession(owner.wc, s.sessionId); const rejected = expect(pending).rejects.toThrow('processing failed');
    await vi.advanceTimersByTimeAsync(0); expect(model.transcribe).toHaveBeenCalledTimes(1);
    runtime.hasModel = async () => false; native.resolve([{ text: 'Unverified result' }]); await rejected;
    expect(partials()).toHaveLength(0);
  });
  it('rejects output beyond its limit without sending partial or final text', async () => {
    model.transcribe.mockResolvedValueOnce({ result: Promise.resolve([{ text: 'x'.repeat(VOICE_LIMITS.textBytes + 1) }]) });
    const s = await engine.startSession(owner.wc); engine.pushChunk(owner.wc, s.sessionId, Buffer.from([1]));
    await expect(engine.stopSession(owner.wc, s.sessionId)).rejects.toThrow('processing failed');
    expect(partials()).toHaveLength(0); await engine.startSession(other.wc);
  });
  it('sanitizes native errors and does not log transcript or diagnostics', async () => {
    const log = vi.spyOn(console, 'log'); const error = vi.spyOn(console, 'error');
    model.transcribe.mockRejectedValueOnce(new Error('/private/path SECRET_TOKEN'));
    const s = await engine.startSession(owner.wc); engine.pushChunk(owner.wc, s.sessionId, Buffer.from([1]));
    await expect(engine.stopSession(owner.wc, s.sessionId)).rejects.toThrow('Local voice processing failed');
    expect(JSON.stringify(owner.send.mock.calls)).not.toContain('SECRET_TOKEN');
    expect(log).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled(); log.mockRestore(); error.mockRestore();
  });
});

describe('voice IPC', () => {
  it('rejects untrusted windows, subframes, malformed IDs and oversized input', async () => {
    const handlers = createVoiceHandlers((sender) => sender === owner.wc, engine);
    const event = { sender: owner.wc, senderFrame: owner.mainFrame } as never;
    const otherEvent = { sender: other.wc, senderFrame: other.mainFrame } as never;
    const iframe = { sender: owner.wc, senderFrame: {} } as never;
    for (const channel of [IpcChannels.voice.isAvailable, IpcChannels.voice.preload, IpcChannels.voice.start]) {
      expect(() => handlers[channel]!(otherEvent)).toThrow('denied'); expect(() => handlers[channel]!(iframe)).toThrow('denied');
    }
    const s = await handlers[IpcChannels.voice.start]!(event) as { sessionId: string };
    expect(() => handlers[IpcChannels.voice.chunk]!(event, s.sessionId, 'file:///private')).toThrow('Invalid');
    expect(() => handlers[IpcChannels.voice.chunk]!(event, s.sessionId, new Uint8Array(VOICE_LIMITS.chunkBytes + 1))).toThrow('Invalid');
    expect(() => handlers[IpcChannels.voice.stop]!(event, '../bad')).toThrow('Invalid');
    await handlers[IpcChannels.voice.cancel]!(event, s.sessionId);
  });
});
