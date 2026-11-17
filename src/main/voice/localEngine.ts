/** Single-owner local dictation. Cancelled native work drains before reuse. */
import { randomUUID } from 'node:crypto';
import type { WebContents } from 'electron';
import type { LocalModelProgress, LocalVoicePartial, StartLocalResult } from './types';
import { ensureModelDownloaded, isModelReady, modelPath } from './modelManager';
import { IpcEvents } from '../../ipc/channels';
import { decodeAudio } from './decodeAudio';

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
  constructor(private readonly runtime: VoiceRuntime = defaultRuntime) {}

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

  async startSession(owner: WebContents): Promise<StartLocalResult> {
    if (this.closing || this.session || owner.isDestroyed()) throw new Error('Local voice is busy or unavailable');
    if (!this.isAvailable()) throw new Error('Local voice is unavailable');
    // Reserve before awaiting model preparation; no second caller can take over.
    const s: Session = { id: randomUUID(), owner, phase: 'starting', loading: true,
      chunks: [], bytes: 0, calls: 0, abort: new AbortController(), detach: () => undefined };
    this.session = s;
    const lost = () => this.close(s);
    const navigation = (details: { isMainFrame: boolean; isSameDocument: boolean }) => {
      if (details.isMainFrame && !details.isSameDocument) this.close(s);
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
      await this.preload(owner);
      if (s.phase !== 'starting' || owner.isDestroyed()) throw new Error('Local voice session was cancelled');
      s.phase = 'recording';
      s.interval = setInterval(() => {
        if (!s.pending && s.phase === 'recording' && s.chunks.length) {
          void this.run(s, false).catch((): undefined => undefined);
        }
      }, 2000);
      return { sessionId: s.id };
    } catch (error) {
      this.close(s);
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
  pushChunk(owner: WebContents, id: string, input: Buffer): void {
    const s = this.owned(owner, id);
    if (!s || s.phase === 'closed' || s.phase === 'stopping') return;
    if (s.phase !== 'recording' || !Buffer.isBuffer(input) || !input.length || input.length > VOICE_LIMITS.chunkBytes ||
        s.bytes + input.length > VOICE_LIMITS.audioBytes || s.chunks.length >= VOICE_LIMITS.chunks) {
      this.fail(s, 'Local voice input limit exceeded');
      throw new Error('Invalid local voice input');
    }
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
      await s.pending;
      if (s.phase === 'closed') return;
      await this.run(s, true);
    })();
    return s.stop;
  }
  async cancelSession(owner: WebContents, id?: string): Promise<void> {
    const s = this.owned(owner, id);
    if (s) this.close(s);
  }

  private run(s: Session, final: boolean): Promise<void> {
    const audio = Buffer.concat(s.chunks);
    const expected: Phase = final ? 'stopping' : 'recording';
    const timer = setTimeout(() => this.fail(s, 'Local voice processing timed out'), VOICE_LIMITS.callMs);
    const work = (async () => {
      try {
        if (++s.calls > VOICE_LIMITS.calls) throw new Error('Call limit exceeded');
        let text = '';
        if (audio.length) {
          const pcm = await this.runtime.decode(audio, s.abort.signal);
          if (s.phase !== expected) return;
          if (!(await this.runtime.hasModel())) throw new Error('Local voice model verification failed');
          if (s.phase !== expected) return;
          const task = await this.whisper!.transcribe(pcm, { language: 'auto', print_realtime: false, print_progress: false, print_timestamps: false, print_special: false });
          const segments = await task.result;
          if (s.phase !== expected) return;
          if (!(await this.runtime.hasModel())) throw new Error('Local voice model verification failed');
          if (s.phase !== expected) return;
          text = segments.map((segment) => segment.text).join(' ').trim();
          if (Buffer.byteLength(text) > VOICE_LIMITS.textBytes) throw new Error('Output limit exceeded');
        }
        if (s.phase !== expected || s.owner.isDestroyed()) return;
        s.owner.send(IpcEvents.voice.partial, { sessionId: s.id, text, isFinal: final } satisfies LocalVoicePartial & { sessionId: string });
        if (final) this.close(s);
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
    this.close(s);
  }
  private close(s: Session) {
    s.phase = 'closed';
    clearInterval(s.interval);
    clearTimeout(s.deadline);
    s.abort.abort();
    s.chunks = [];
    this.release(s);
  }
  private release(s: Session) {
    if (s.phase === 'closed' && !s.loading && !s.pending && this.session === s) {
      s.detach();
      this.session = null;
    }
  }
  async shutdown(): Promise<void> {
    this.closing = true;
    const s = this.session;
    if (s) this.close(s);
    await this.preloadPromise?.catch((): undefined => undefined);
    await s?.pending?.catch((): undefined => undefined);
    await this.whisper?.free();
    this.whisper = null;
  }
}
export const localEngine = new LocalEngine();
