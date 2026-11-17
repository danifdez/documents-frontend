/** Single-owner local dictation. Cancelled native work drains before reuse. */
import { randomUUID } from 'node:crypto';
import type { WebContents } from 'electron';
import type { LocalModelProgress, LocalVoicePartial, StartLocalResult } from './types';
import { ensureModelDownloaded, isModelReady, modelPath, MODEL_MANIFEST } from './modelManager';
import { IpcEvents } from '../../ipc/channels';
import { decodeAudio } from './decodeAudio';
import { endianness } from 'node:os';
import { CAPTURE_LIMITS, captureHash, localCaptureStore, type LocalCaptureStore, type CaptureWriter } from './captureStore';
import type { LocalVoiceStartOptions, LocalCaptureSnapshot } from '../../types/voice';

interface WhisperLike {
  transcribe(pcm: Float32Array, opts: { language: string; print_realtime: boolean; print_progress: boolean; print_timestamps: boolean; print_special: boolean }): Promise<{ result: Promise<{ text: string }[]> }>;
  free(): Promise<void>;
}
interface WhisperCtor { new (file: string, opts: { gpu: boolean }): WhisperLike }
export interface VoiceRuntime {
  available(): boolean;
  hasModel(): Promise<boolean>;
  load(progress: (p: LocalModelProgress) => void): Promise<WhisperLike>;
  decode(input: Buffer, signal: AbortSignal): Promise<Float32Array>;
}

let WhisperClass: WhisperCtor | null = null;
let ffmpegPath: string | null = null;
let bindingsAttempted = false;
function tryLoadBindings(): boolean {
  if (!bindingsAttempted) {
    bindingsAttempted = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional native modules
      const sw = require('smart-whisper');
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional native modules
      const ffmpeg = require('ffmpeg-static');
      if (typeof sw?.Whisper === 'function' && typeof ffmpeg === 'string') {
        WhisperClass = sw.Whisper;
        ffmpegPath = ffmpeg;
      }
    } catch { /* Local voice remains unavailable. */ }
  }
  return WhisperClass !== null && ffmpegPath !== null;
}
const defaultRuntime: VoiceRuntime = {
  available: tryLoadBindings,
  hasModel: isModelReady,
  async load(progress) {
    if (!tryLoadBindings()) throw new Error('Local voice is unavailable');
    await ensureModelDownloaded(progress);
    return new WhisperClass!(modelPath(), { gpu: false });
  },
  decode: (input, signal) => decodeAudio(ffmpegPath!, input, signal),
};

export const VOICE_LIMITS = {
  chunkBytes: 256 * 1024,
  audioBytes: 32 * 1024 * 1024,
  chunks: 4096,
  calls: 128,
  textBytes: 16 * 1024,
  sessionMs: 5 * 60 * 1000,
  callMs: 60 * 1000,
};
type Phase = 'starting' | 'recording' | 'stopping' | 'closed';
interface Session {
  id: string;
  owner: WebContents;
  phase: Phase;
  loading: boolean;
  chunks: Buffer[];
  bytes: number;
  calls: number;
  abort: AbortController;
  capture?: CaptureWriter;
  captureClosed: boolean;
  captureClosing?: Promise<void>;
  inputWrites: Promise<void>;
  queuedBytes: number;
  endStatus?: 'completed' | 'cancelled' | 'failed';
  endReason?: string;
  pending?: Promise<void>;
  stop?: Promise<void>;
  interval?: ReturnType<typeof setInterval>;
  deadline?: ReturnType<typeof setTimeout>;
  detach(): void;
}

export class LocalEngine {
  private session: Session | null = null;
  private whisper: WhisperLike | null = null;
  private preloadPromise: Promise<void> | null = null;
  private closing = false;
  constructor(private readonly runtime: VoiceRuntime = defaultRuntime, private readonly captures: LocalCaptureStore = localCaptureStore) {}

  isAvailable(): boolean { return this.runtime.available(); }
  hasModel(): Promise<boolean> { return this.runtime.hasModel(); }
  preload(recipient?: WebContents): Promise<void> {
    if (this.closing) return Promise.reject(new Error('Local voice is shutting down'));
    if (!this.isAvailable()) return Promise.resolve();
    if (!this.preloadPromise) {
      this.preloadPromise = this.runtime.load((progress) => {
        if (recipient && !recipient.isDestroyed()) {
          try { recipient.send(IpcEvents.voice.loadingProgress, progress); } catch { /* Window closed. */ }
        }
      }).then((whisper) => { this.whisper = whisper; }).catch(() => {
        this.preloadPromise = null;
        throw new Error('Local voice model could not be prepared');
      });
    }
    return this.preloadPromise;
  }

  async startSession(owner: WebContents, options?: LocalVoiceStartOptions): Promise<StartLocalResult> {
    if (this.closing || this.session || owner.isDestroyed()) throw new Error('Local voice is busy or unavailable');
    // Reserve before awaiting model preparation; no second caller can take over.
    const s: Session = { id: options?.capture.requestId ?? randomUUID(), owner, phase: 'starting', loading: true,
      chunks: [], bytes: 0, calls: 0, captureClosed: true, inputWrites: Promise.resolve(), queuedBytes: 0, abort: new AbortController(), detach: () => undefined };
    this.session = s;
    const lost = () => this.close(s, 'cancelled', 'owner_unavailable');
    const navigation = (details: { isMainFrame: boolean; isSameDocument: boolean }) => {
      if (details.isMainFrame && !details.isSameDocument) this.close(s, 'cancelled', 'navigation');
    };
    owner.once('destroyed', lost);
    owner.once('render-process-gone', lost);
    owner.on('did-start-navigation', navigation);
    s.detach = () => {
      owner.removeListener('destroyed', lost);
      owner.removeListener('render-process-gone', lost);
      owner.removeListener('did-start-navigation', navigation);
    };
    s.deadline = setTimeout(() => this.fail(s, 'Local voice session limit exceeded'), VOICE_LIMITS.sessionMs);
    try {
      if (options) {
        const accepted = await this.captures.open(options.capture, {
          expectedModel: MODEL_MANIFEST,
          engine: { family: 'whisper.cpp', adapter: 'smart-whisper', requestedGpu: false, language: 'auto' },
        });
        if (!accepted.claimed) {
          this.close(s, 'cancelled', 'recovered');
          return { sessionId: s.id, claimed: false, status: accepted.status };
        }
        s.capture = accepted.writer;
        s.captureClosed = false;
        if (s.phase === 'closed') { this.close(s); throw new Error('Local voice session was cancelled'); }
      }
      if (!this.isAvailable()) throw new Error('Local voice is unavailable');
      await this.preload(owner);
      if (s.phase !== 'starting' || owner.isDestroyed()) throw new Error('Local voice session was cancelled');
      s.phase = 'recording';
      if (s.capture) await s.capture.event('session.recording', {});
      if (s.phase !== 'recording') throw new Error('Local voice session was cancelled');
      s.interval = setInterval(() => {
        if (!s.pending && s.phase === 'recording' && s.chunks.length) {
          void this.run(s, false).catch((): undefined => undefined);
        }
      }, 2000);
      return { sessionId: s.id, ...(s.capture ? { claimed: true, status: 'running' as const } : {}) };
    } catch (error) {
      this.close(s, 'failed', 'preparation_failed');
      if (options) {
        await s.captureClosing?.catch((): undefined => undefined);
        throw new Error('Local voice capture could not be started');
      }
      throw error;
    } finally {
      s.loading = false;
      this.release(s);
    }
  }

  private owned(owner: WebContents, id?: string): Session | null {
    const s = this.session;
    if (!s) return null;
    if (s.owner !== owner || (id !== s.id && !(id === undefined && s.loading))) {
      throw new Error('Local voice session is unavailable');
    }
    return s;
  }
  pushChunk(owner: WebContents, id: string, input: Buffer, sequence?: number): void | Promise<void> {
    const s = this.owned(owner, id);
    if (!s || s.phase === 'closed' || s.phase === 'stopping') return;
    if (s.phase !== 'recording' || !Buffer.isBuffer(input) || !input.length || input.length > VOICE_LIMITS.chunkBytes ||
        s.bytes + input.length > VOICE_LIMITS.audioBytes || s.chunks.length >= VOICE_LIMITS.chunks) {
      this.fail(s, 'Local voice input limit exceeded');
      throw new Error('Invalid local voice input');
    }
    if (s.capture) {
      if (!Number.isSafeInteger(sequence) || sequence! < 1 || sequence! > VOICE_LIMITS.chunks) throw new Error('Invalid local capture input sequence');
      const previous = s.chunks[sequence! - 1];
      if (previous) {
        if (!previous.equals(input)) { this.fail(s, 'Local voice capture input conflict'); throw new Error('Local capture input conflict'); }
        return Promise.resolve();
      }
      if (s.bytes + s.queuedBytes + input.length > CAPTURE_LIMITS.audioBytes) {
        this.fail(s, 'Local voice capture input limit exceeded'); throw new Error('Local capture input limit exceeded');
      }
      const body = Buffer.from(input); s.queuedBytes += body.length;
      const work = s.inputWrites.then(async () => {
        if (s.phase === 'closed') return;
        const stored = await s.capture!.input(sequence!, body);
        if (stored && !s.abort.signal.aborted) { s.bytes += body.length; s.chunks.push(body); }
      }).catch(() => {
        this.fail(s, 'Local voice capture could not be confirmed');
        throw new Error('Local voice capture could not be confirmed');
      }).finally(() => { s.queuedBytes -= body.length; });
      s.inputWrites = work.catch((): undefined => undefined);
      return work;
    }
    if (sequence !== undefined) throw new Error('Input sequence requires authorized capture');
    s.bytes += input.length;
    s.chunks.push(Buffer.from(input));
  }
  stopSession(owner: WebContents, id: string): Promise<void> {
    const s = this.owned(owner, id);
    if (!s || s.phase === 'closed') return Promise.resolve();
    if (s.stop) return s.stop;
    if (s.phase !== 'recording') return Promise.reject(new Error('Local voice session is not ready'));
    s.phase = 'stopping';
    clearInterval(s.interval);
    s.stop = (async () => {
      // Do not launch a final pass until the previous native call has drained.
      await s.inputWrites;
      if (s.phase === 'closed') { await s.captureClosing; return; }
      if (s.capture) await s.capture.event('session.stopping', {});
      await s.pending;
      if (s.abort.signal.aborted) { await s.captureClosing; return; }
      await this.run(s, true);
      await s.captureClosing;
    })().catch(async () => {
      this.fail(s, 'Local voice capture could not be confirmed');
      await s.captureClosing?.catch((): undefined => undefined);
      throw new Error('Local voice processing failed');
    });
    return s.stop;
  }
  async cancelSession(owner: WebContents, id?: string): Promise<void> {
    const s = this.owned(owner, id);
    if (s) { this.close(s, 'cancelled', 'operator_cancelled'); await s.captureClosing; }
  }

  private run(s: Session, final: boolean): Promise<void> {
    const audio = Buffer.concat(s.chunks);
    const expected: Phase = final ? 'stopping' : 'recording';
    const timer = setTimeout(() => this.fail(s, 'Local voice processing timed out'), VOICE_LIMITS.callMs);
    const work = (async () => {
      try {
        const index = s.calls + 1;
        if (index > VOICE_LIMITS.calls) throw new Error('Call limit exceeded');
        const parameters = { language: 'auto', print_realtime: false, print_progress: false, print_timestamps: false, print_special: false };
        if (s.capture) await s.capture.event('call.started', { index, final, parameters, nativeRequested: audio.length > 0, input: { sha256: captureHash(audio), bytes: audio.length, chunks: s.chunks.length } });
        if (s.phase !== expected) return;
        s.calls = index;
        let text = '';
        let details: Record<string, unknown> = {};
        if (audio.length) {
          const decodeStart = process.hrtime.bigint();
          const pcm = await this.runtime.decode(audio, s.abort.signal);
          const decodeEnd = process.hrtime.bigint();
          const decoded = s.capture ? { sha256: captureHash(Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength)), samples: pcm.length, sampleRate: 16000, channels: 1, encoding: 'float32', endianness: endianness() } : undefined;
          if (s.phase !== expected) return;
          if (!(await this.runtime.hasModel())) throw new Error('Local voice model verification failed');
          if (s.phase !== expected) return;
          const inferenceStart = process.hrtime.bigint();
          const task = await this.whisper!.transcribe(pcm, parameters);
          const segments = await task.result;
          const inferenceEnd = process.hrtime.bigint();
          if (s.phase !== expected) return;
          if (!(await this.runtime.hasModel())) throw new Error('Local voice model verification failed');
          if (s.phase !== expected) return;
          details = { decoded,
            decodeUs: Number((decodeEnd - decodeStart) / 1000n), inferenceUs: Number((inferenceEnd - inferenceStart) / 1000n), modelReadyBeforeAndAfter: true };
          text = segments.map((segment) => segment.text).join(' ').trim();
          if (Buffer.byteLength(text) > VOICE_LIMITS.textBytes) throw new Error('Output limit exceeded');
        }
        if (s.phase !== expected || s.owner.isDestroyed()) return;
        if (s.capture) await s.capture.event('call.completed', { index, final, nativeInvoked: audio.length > 0, text, ...details });
        if (s.phase !== expected || s.owner.isDestroyed()) return;
        s.owner.send(IpcEvents.voice.partial, { sessionId: s.id, text, isFinal: final } satisfies LocalVoicePartial & { sessionId: string });
        if (s.capture) await s.capture.event('output.sent', { index, final, textSha256: captureHash(text) });
        if (final) this.close(s, 'completed', 'final');
      } catch {
        if (s.phase !== 'closed') {
          this.fail(s, 'Local voice processing failed');
          throw new Error('Local voice processing failed');
        }
      }
    })();
    s.pending = work;
    // Always keep the reservation until the actual work settles, including timeout/cancel.
    void work.finally(() => {
      clearTimeout(timer);
      if (s.pending === work) s.pending = undefined;
      this.release(s);
    }).catch((): undefined => undefined);
    return work;
  }
  private fail(s: Session, message: string) {
    if (s.phase !== 'closed' && !s.owner.isDestroyed()) {
      try { s.owner.send(IpcEvents.voice.error, { sessionId: s.id, message }); } catch { /* Window closed. */ }
    }
    this.close(s, 'failed', 'processing_failed');
  }
  private close(s: Session, status: 'completed' | 'cancelled' | 'failed' = 'cancelled', reason = 'cancelled') {
    if (s.phase !== 'closed') { s.endStatus = status; s.endReason = reason; }
    s.phase = 'closed';
    clearInterval(s.interval);
    clearTimeout(s.deadline);
    s.abort.abort();
    s.chunks = [];
    if (s.capture && !s.captureClosing) {
      s.captureClosing = s.capture.close(s.endStatus ?? status, s.endReason ?? reason);
      const finished = () => { s.captureClosed = true; this.release(s); };
      void s.captureClosing.then(finished, () => {
        if (!s.owner.isDestroyed()) {
          try { s.owner.send(IpcEvents.voice.error, { sessionId: s.id, message: 'Local voice capture is unconfirmed' }); } catch { /* Window closed. */ }
        }
        finished();
      });
    }
    this.release(s);
  }
  private release(s: Session) {
    if (s.phase === 'closed' && !s.loading && !s.pending && s.captureClosed && this.session === s) {
      s.detach();
      this.session = null;
    }
  }
  async capture(requestId: string): Promise<LocalCaptureSnapshot> {
    try { return await this.captures.read(requestId); } catch { throw new Error('Local voice capture could not be read'); }
  }
  async shutdown(): Promise<void> {
    this.closing = true;
    const s = this.session;
    if (s) this.close(s, 'cancelled', 'shutdown');
    await this.preloadPromise?.catch((): undefined => undefined);
    await s?.pending?.catch((): undefined => undefined);
    await s?.captureClosing?.catch((): undefined => undefined);
    await this.whisper?.free();
    this.whisper = null;
  }
}
export const localEngine = new LocalEngine();
