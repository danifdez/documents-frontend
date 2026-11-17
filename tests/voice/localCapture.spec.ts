// @vitest-environment node
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { WebContents } from 'electron';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('electron', () => ({ app: { getPath: () => { throw new Error('Personal profiles are forbidden'); } } }));
import { LocalEngine, VOICE_LIMITS, type VoiceRuntime } from '@/main/voice/localEngine';
import { CaptureWriter, LocalCaptureStore, captureHash } from '@/main/voice/captureStore';
import { createVoiceHandlers } from '@/main/ipc/voice-handlers';
import { IpcChannels, IpcEvents } from '@/ipc/channels';
import type { LocalVoiceStartOptions, LocalCaptureSnapshot } from '@/types/voice';
import { ENGINE_IDENTITY_MISSING, type VoiceEngineIdentity } from '@/main/voice/runtimeIdentity';
class Window extends EventEmitter {
  send = vi.fn(); mainFrame = {}; isDestroyed() { return false; }
  get wc() { return this as unknown as WebContents; }
  get event() { return { sender: this.wc, senderFrame: this.mainFrame } as never; }
}
let temporary: string; let root: string; let store: LocalCaptureStore; let engine: LocalEngine;
let owner: Window; let other: Window; let options: LocalVoiceStartOptions; let runtime: VoiceRuntime;
let model: { transcribe: ReturnType<typeof vi.fn>; free: ReturnType<typeof vi.fn> };
beforeEach(async () => {
  temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'local-voice-cycle-')); root = path.join(temporary, 'capture');
  store = new LocalCaptureStore(() => root); owner = new Window(); other = new Window();
  options = { capture: { requestId: randomUUID(), consent: 'granted', purpose: 'evaluation', mediaType: 'audio/wav' } };
  model = { transcribe: vi.fn(async () => ({ result: Promise.resolve([{ text: 'Synthetic result' }]) })), free: vi.fn(async () => undefined) };
  runtime = { available: vi.fn(() => true), hasModel: vi.fn(async () => true), load: vi.fn(async () => model), decode: vi.fn(async () => new Float32Array([0.25])) };
  engine = new LocalEngine(runtime, store);
});
afterEach(async () => { await engine.shutdown(); vi.restoreAllMocks(); await fs.rm(temporary, { recursive: true, force: true }); });
const read = () => engine.capture(options.capture.requestId);
async function completed() {
  const start = await engine.startSession(owner.wc, options);
  await engine.pushChunk(owner.wc, start.sessionId, Buffer.from([1, 2]), 1);
  await engine.stopSession(owner.wc, start.sessionId);
  return read();
}
describe('opt-in capture integrated with local dictation', () => {
  it('retains observed engine identity in the same journal and reopens it without invoking the runtime', async () => {
    const binary = { sha256: captureHash('simulated binary'), sizeBytes: 16 };
    const identity: VoiceEngineIdentity = { adapter: { name: 'smart-whisper', version: '0.8.1', entry: binary }, nativeBinary: binary,
      decoder: { source: 'system', binary }, runtime: { platform: 'linux', arch: 'x64', node: '24.0.0', electron: '44.7.2', modules: '149' },
      verification: 'module_load_and_file_checks' };
    runtime.identity = vi.fn(() => identity);
    const capture = await completed();
    expect(capture.events[1]).toMatchObject({ eventType: 'engine.observed', payload: identity });
    expect(capture.events.filter((event) => event.eventType === 'engine.observed')).toHaveLength(1);
    expect(capture.missing).not.toContain('engine.native_binary_identity');
    expect(capture.missing).toEqual(expect.arrayContaining(['model.loaded_instance_identity', 'engine.effective_generation_defaults', ...ENGINE_IDENTITY_MISSING]));
    const bytes = await fs.readFile(path.join(root, options.capture.requestId, 'events.jsonl'));
    vi.mocked(runtime.identity).mockClear(); vi.mocked(runtime.load).mockClear(); model.transcribe.mockClear();
    for (let i = 0; i < 3; i++) {
      expect(await engine.startSession(owner.wc, options)).toMatchObject({ claimed: false, status: 'completed' });
      expect(await read()).toEqual(capture);
    }
    expect(runtime.identity).not.toHaveBeenCalled(); expect(runtime.load).not.toHaveBeenCalled(); expect(model.transcribe).not.toHaveBeenCalled();
    expect(await fs.readFile(path.join(root, options.capture.requestId, 'events.jsonl'))).toEqual(bytes);
  });
  it('fails before accepting audio if engine identity includes unapproved fields', async () => {
    runtime.identity = vi.fn(() => ({ path: '/private/SECRET' }) as unknown as VoiceEngineIdentity);
    await expect(engine.startSession(owner.wc, options)).rejects.toThrow('capture could not be started');
    const snapshot = await read(); expect(snapshot.status).toBe('failed');
    expect(snapshot.missing).toContain('engine.native_binary_identity'); expect(JSON.stringify(snapshot)).not.toContain('SECRET');
    expect(model.transcribe).not.toHaveBeenCalled();
  });
  it('reports active preparation without reading a journal that is still being created', async () => {
    let resolve!: (value: typeof model) => void;
    vi.mocked(runtime.load).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const starting=engine.startSession(owner.wc,options);
    await vi.waitFor(() => expect(runtime.load).toHaveBeenCalledTimes(1));
    const read=vi.spyOn(store,'lookup').mockRejectedValueOnce(new Error('PRIVATE_STORAGE'));
    expect(await engine.captureStatus(options.capture.requestId)).toMatchObject({ status:'running',phase:'starting' });
    expect(read).not.toHaveBeenCalled();read.mockRestore();resolve(model);
    const accepted=await starting;await engine.cancelSession(owner.wc,accepted.sessionId);
  });
  it('distinguishes genuine absence from an unreadable existing record', async () => {
    expect(await engine.captureStatus(options.capture.requestId)).toMatchObject({ status:'not_found' });
    await completed();await fs.unlink(path.join(root,options.capture.requestId,'events.jsonl'));
    await expect(engine.captureStatus(options.capture.requestId)).rejects.toThrow('status could not be read');
  });
  it('passes the installed-only policy into the existing runtime preparation', async () => {
    engine=new LocalEngine(runtime,store,{allowModelDownload:false});
    const accepted=await engine.startSession(owner.wc,options);
    expect(runtime.load).toHaveBeenCalledWith(expect.any(Function),{allowModelDownload:false});
    await engine.cancelSession(owner.wc,accepted.sessionId);
  });
  it('does not write any evidence for normal dictation', async () => {
    const start = await engine.startSession(owner.wc); engine.pushChunk(owner.wc, start.sessionId, Buffer.from([1]));
    await engine.stopSession(owner.wc, start.sessionId);
    await expect(fs.stat(root)).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('persists exact inputs once, actual PCM identity and bounded outputs', async () => {
    model.transcribe.mockImplementationOnce(async (pcm: Float32Array) => { pcm[0] = 9; return { result: Promise.resolve([{ text: 'Synthetic result' }]) }; });
    const start = await engine.startSession(owner.wc, options);
    expect(start).toMatchObject({ claimed: true, status: 'running' });
    const body = Buffer.from([1, 2]); await engine.pushChunk(owner.wc, start.sessionId, body, 1); body[0] = 9;
    await engine.pushChunk(owner.wc, start.sessionId, Buffer.from([1, 2]), 1);
    const stop = engine.stopSession(owner.wc, start.sessionId); expect(engine.stopSession(owner.wc, start.sessionId)).toBe(stop); await stop;
    const capture = await read(); expect(capture.status).toBe('completed');
    expect(capture.events.filter((event) => event.eventType === 'source.observed')).toHaveLength(1);
    expect(capture.events.filter((event) => event.eventType === 'session.closed')).toHaveLength(1);
    expect(runtime.decode).toHaveBeenCalledWith(Buffer.from([1, 2]), expect.any(AbortSignal)); expect(model.transcribe).toHaveBeenCalledTimes(1);
    const result = capture.events.find((event) => event.eventType === 'call.completed')!.payload;
    expect(result).toMatchObject({ text: 'Synthetic result', nativeInvoked: true, decoded: { sha256: captureHash(Buffer.from(new Float32Array([0.25]).buffer)), samples: 1, sampleRate: 16000 }, modelReadyBeforeAndAfter: true });
    expect(result.inferenceUs).toBeGreaterThanOrEqual(0); expect(result.decodeUs).toBeGreaterThanOrEqual(0);
    expect(capture.missing).toContain('model.loaded_instance_identity'); expect(capture.missing).toContain('renderer.delivery_ack');
    expect(JSON.stringify(capture)).not.toContain(temporary);
  });
  it.each(['completed', 'cancelled', 'interrupted'])('recovers %s captures without initializing or invoking the engine', async (state) => {
    if (state === 'completed') await completed();
    else if (state === 'cancelled') { const s = await engine.startSession(owner.wc, options); await engine.cancelSession(owner.wc, s.sessionId); }
    else { const accepted = await store.open(options.capture, {}); await accepted.writer!.input(1, Buffer.from([3])); }
    const file = path.join(root, options.capture.requestId, 'events.jsonl'); const before = await fs.readFile(file);
    await engine.shutdown(); vi.mocked(runtime.available).mockClear(); vi.mocked(runtime.load).mockClear(); model.transcribe.mockClear();
    engine = new LocalEngine(runtime, new LocalCaptureStore(() => root));
    for (let i = 0; i < 3; i++) {
      expect(await engine.startSession(owner.wc, options)).toMatchObject({ claimed: false, status: state }); await read();
    }
    expect(runtime.available).not.toHaveBeenCalled(); expect(runtime.load).not.toHaveBeenCalled(); expect(model.transcribe).not.toHaveBeenCalled();
    expect(await fs.readFile(file)).toEqual(before);
  });
  it('records cancellation, holds native work until drain and discards late output', async () => {
    let finish!: (value: { text: string }[]) => void;
    model.transcribe.mockResolvedValueOnce({ result: new Promise((resolve) => { finish = resolve; }) });
    const s = await engine.startSession(owner.wc, options); await engine.pushChunk(owner.wc, s.sessionId, Buffer.from([1]), 1);
    const stop = engine.stopSession(owner.wc, s.sessionId); await vi.waitFor(() => expect(model.transcribe).toHaveBeenCalledTimes(1));
    await engine.cancelSession(owner.wc, s.sessionId); const capture = await read();
    expect(capture.status).toBe('cancelled'); expect(capture.missing).toContain('call.1.finish');
    await expect(engine.startSession(other.wc)).rejects.toThrow('busy');
    finish([{ text: 'LATE_PRIVATE_RESULT' }]); await stop;
    expect(owner.send.mock.calls.some(([name]) => name === IpcEvents.voice.partial)).toBe(false);
    expect(await read()).toEqual(capture); const next = await engine.startSession(other.wc); await engine.cancelSession(other.wc, next.sessionId);
  });
  it('records preparation failure without leaking native diagnostics', async () => {
    vi.mocked(runtime.load).mockRejectedValueOnce(new Error('/private/model SECRET_DIAGNOSTIC'));
    await expect(engine.startSession(owner.wc, options)).rejects.toThrow('capture could not be started');
    expect((await read()).status).toBe('failed'); expect(JSON.stringify(await read())).not.toContain('SECRET_DIAGNOSTIC');
  });
  it('never processes unconfirmed audio and preserves the verified prefix on a storage failure', async () => {
    const s = await engine.startSession(owner.wc, options);
    vi.spyOn(CaptureWriter.prototype, 'input').mockRejectedValueOnce(new Error('/private/disk SECRET_DISK'));
    await expect(engine.pushChunk(owner.wc, s.sessionId, Buffer.from([1]), 1)).rejects.toThrow('could not be confirmed');
    await vi.waitFor(async () => expect((await read()).status).toBe('failed'));
    expect(runtime.decode).not.toHaveBeenCalled(); expect(model.transcribe).not.toHaveBeenCalled(); expect((await read()).artifacts).toEqual({});
    expect(JSON.stringify(owner.send.mock.calls)).not.toContain('SECRET_DISK');
  });
  it('rejects an interrupted journal append before forwarding newly captured audio', async () => {
    const s = await engine.startSession(owner.wc, options);
    const file = path.join(root, s.sessionId, 'events.jsonl'); await fs.appendFile(file, '{"partial":');
    await expect(engine.pushChunk(owner.wc, s.sessionId, Buffer.from([1]), 1)).rejects.toThrow('could not be confirmed');
    const snapshot = await read(); expect(snapshot.status).toBe('interrupted'); expect(snapshot.missing).toContain('capture.torn_tail');
    expect(snapshot.artifacts).toEqual({}); expect(runtime.decode).not.toHaveBeenCalled(); expect(model.transcribe).not.toHaveBeenCalled();
    expect(await fs.readFile(path.join(root, s.sessionId, 'input-1.bin'))).toEqual(Buffer.from([1]));
    expect((await fs.readFile(file, 'utf8')).endsWith('{"partial":')).toBe(true);
  });
  it('fails closed if persisting the stop transition fails, and releases the reservation', async () => {
    const s = await engine.startSession(owner.wc, options);
    vi.spyOn(CaptureWriter.prototype, 'event').mockRejectedValueOnce(new Error('SECRET_STOP'));
    await expect(engine.stopSession(owner.wc, s.sessionId)).rejects.toThrow('processing failed');
    expect((await read()).status).toBe('failed'); expect(model.transcribe).not.toHaveBeenCalled();
    const next = await engine.startSession(other.wc); await engine.cancelSession(other.wc, next.sessionId);
  });
  it('does not journal or execute a call beyond the common limit', async () => {
    const previous = VOICE_LIMITS.calls;
    try {
      VOICE_LIMITS.calls = 0;
      const s = await engine.startSession(owner.wc, options); await engine.pushChunk(owner.wc, s.sessionId, Buffer.from([1]), 1);
      await expect(engine.stopSession(owner.wc, s.sessionId)).rejects.toThrow('processing failed');
      const snapshot = await read(); expect(snapshot.status).toBe('failed');
      expect(snapshot.events.some((event) => event.eventType === 'call.started')).toBe(false); expect(model.transcribe).not.toHaveBeenCalled();
    } finally { VOICE_LIMITS.calls = previous; }
  });
  it('rejects conflicting or out-of-order sequences without recognizing them', async () => {
    const s = await engine.startSession(owner.wc, options);
    await expect(engine.pushChunk(owner.wc, s.sessionId, Buffer.from([1]), 2)).rejects.toThrow('could not be confirmed');
    expect(model.transcribe).not.toHaveBeenCalled(); await vi.waitFor(async () => expect((await read()).status).toBe('interrupted'));
    expect(await fs.readdir(path.join(root, s.sessionId))).toEqual(['events.jsonl']);
  });
});
describe('capture authorization over the existing IPC', () => {
  it('requires main-process permission in addition to explicit per-session consent', async () => {
    const denied = createVoiceHandlers(() => true, engine);
    expect(() => denied[IpcChannels.voice.start]!(owner.event, options)).toThrow('authorization');
    await expect(denied[IpcChannels.voice.capture]!(owner.event, options.capture.requestId, true)).rejects.toThrow('authorization');
    await expect(fs.stat(root)).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('limits export to the trusted main frame and returns only a receipt by default', async () => {
    const handlers = createVoiceHandlers(() => true, engine, (sender) => sender === owner.wc);
    await completed();
    const receipt = await handlers[IpcChannels.voice.capture]!(owner.event, options.capture.requestId);
    expect(receipt).toEqual({ sessionId: options.capture.requestId, status: 'completed', claimed: false });
    const evidence = await handlers[IpcChannels.voice.capture]!(owner.event, options.capture.requestId, true) as LocalCaptureSnapshot;
    expect(evidence.artifacts['1']).toHaveProperty('base64');
    await expect(handlers[IpcChannels.voice.capture]!(other.event, options.capture.requestId, true)).rejects.toThrow('authorization');
    await expect(handlers[IpcChannels.voice.capture]!({ sender: owner.wc, senderFrame: {} } as never, options.capture.requestId, true)).rejects.toThrow('denied');
    await expect(handlers[IpcChannels.voice.capture]!(owner.event, '../path', true)).rejects.toThrow('Invalid');
    await expect(handlers[IpcChannels.voice.capture]!(owner.event, options.capture.requestId, 'true')).rejects.toThrow('authorization');
  });
  it('rejects extra paths, arbitrary destinations and forged consent before creating files', async () => {
    const handlers = createVoiceHandlers(() => true, engine, () => true);
    for (const capture of [{ ...options.capture, path: '/tmp/exfiltrate' }, { ...options.capture, endpoint: 'https://example.com' }, { ...options.capture, consent: false }]) {
      expect(() => handlers[IpcChannels.voice.start]!(owner.event, { capture })).toThrow('authorization');
    }
    await expect(fs.stat(root)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
