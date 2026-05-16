/**
 * Local transcription engine that runs in Electron's main process.
 *
 * Stack:
 *   - `smart-whisper` for inference (native bindings around whisper.cpp).
 *   - `ffmpeg-static` to decode the webm/opus chunks coming from the
 *     renderer's `MediaRecorder` into PCM s16le 16 kHz mono. We then convert
 *     to Float32, which is what smart-whisper expects.
 *
 * Pseudo-streaming: smart-whisper does not expose native streaming, but we
 * re-transcribe the full accumulated buffer every `STREAMING_INTERVAL_MS`
 * while recording and emit `partial` with `isFinal:false`. The renderer
 * already replaces the dictated range on every partial, so visually the
 * text grows as the user speaks. On `stop` we wait for the in-flight
 * transcription (its result is discarded), run the final pass on the full
 * buffer, and emit `isFinal:true`. The quadratic cost is acceptable for
 * dictations <60s.
 *
 * Single session at a time (the local engine is for a single user).
 *
 * Events emitted to the renderer (via `webContents.send`):
 *   - `voice:local:partial`          { sessionId, text, isFinal }
 *   - `voice:local:error`            { sessionId, message }
 *   - `voice:local:loading-progress` { downloaded, total, percent }
 */
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import type { WebContents } from 'electron';
import type { LocalModelProgress, LocalVoicePartial, StartLocalResult } from './types';
import { ensureModelDownloaded, isModelReady, modelPath } from './modelManager';

// Lazy bindings: we load `smart-whisper` and `ffmpeg-static` via lazy
// `require` so that (1) a native compilation failure does not prevent the
// app from starting, and (2) the app falls back to the remote engine
// transparently when the bindings are not available.

interface WhisperLike {
  transcribe(pcm: Float32Array, opts?: { language?: string }): Promise<{ result: Promise<{ text: string }[]> }>;
  free(): Promise<void>;
}
interface WhisperCtor {
  new (modelPath: string, opts: { gpu: boolean }): WhisperLike;
}

let WhisperClass: WhisperCtor | null = null;
let ffmpegPath: string | null = null;
let bindingsLoaded = false;
let bindingsAttempted = false;

function tryLoadBindings(): boolean {
  if (bindingsAttempted) return bindingsLoaded;
  bindingsAttempted = true;
  try {
    const sw = require('smart-whisper');
    const ffmpeg = require('ffmpeg-static');
    if (typeof sw?.Whisper !== 'function') return false;
    if (typeof ffmpeg !== 'string') return false;
    WhisperClass = sw.Whisper as WhisperCtor;
    ffmpegPath = ffmpeg;
    bindingsLoaded = true;
    return true;
  } catch {
    WhisperClass = null;
    ffmpegPath = null;
    bindingsLoaded = false;
    return false;
  }
}

/** Decode an audio buffer (webm/opus/ogg/wav) into PCM Float32 16 kHz mono. */
function decodeToPcmFloat32(input: Buffer): Promise<Float32Array> {
  if (!ffmpegPath) return Promise.reject(new Error('ffmpeg-static not available'));
  return new Promise((resolve, reject) => {
    const args = [
      '-loglevel', 'error',
      '-i', 'pipe:0',
      '-f', 's16le',
      '-acodec', 'pcm_s16le',
      '-ar', '16000',
      '-ac', '1',
      'pipe:1',
    ];
    const proc = spawn(ffmpegPath!, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const chunks: Buffer[] = [];
    proc.stdout.on('data', (b: Buffer) => chunks.push(b));
    let stderr = '';
    proc.stderr.on('data', (b: Buffer) => { stderr += b.toString(); });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited with ${code}: ${stderr.slice(0, 200)}`));
        return;
      }
      const s16 = Buffer.concat(chunks);
      const samples = s16.length / 2;
      const out = new Float32Array(samples);
      for (let i = 0; i < samples; i++) {
        const v = s16.readInt16LE(i * 2);
        out[i] = v / 32768;
      }
      resolve(out);
    });
    proc.stdin.end(input);
  });
}


const STREAMING_INTERVAL_MS = 2000;

class LocalEngine extends EventEmitter {
  private activeSessionId: string | null = null;
  private buffer: Buffer[] = [];
  private whisper: WhisperLike | null = null;
  private modelLoaded = false;
  private renderer: WebContents | null = null;
  // Pseudo-streaming state. `generation` is bumped when the session stops
  // so any in-flight transcription's result is discarded; `partialBusy`
  // avoids overlapping two transcriptions on the same whisper instance.
  private streamingInterval: ReturnType<typeof setInterval> | null = null;
  private partialBusy = false;
  private generation = 0;

  bindRenderer(wc: WebContents | null) {
    this.renderer = wc;
  }

  isAvailable(): boolean {
    return tryLoadBindings();
  }

  hasModel(): Promise<boolean> {
    return isModelReady();
  }

  /**
   * Preload: download the model if missing and instantiate the whisper
   * object in memory. Idempotent. Called from the renderer at startup and
   * when the user switches the engine to `local` in Settings, so the first
   * recording does not have to wait for the download or model load.
   */
  private preloadPromise: Promise<void> | null = null;
  preload(): Promise<void> {
    if (!this.isAvailable()) return Promise.resolve();
    if (this.preloadPromise) return this.preloadPromise;
    this.preloadPromise = (async () => {
      if (!(await isModelReady())) {
        await ensureModelDownloaded((p) => this.emitProgress(p));
      }
      if (!this.whisper) {
        this.whisper = new WhisperClass!(modelPath(), { gpu: false });
        this.modelLoaded = true;
      }
    })().catch((err) => {
      // Reset so the next call can retry.
      this.preloadPromise = null;
      throw err;
    });
    return this.preloadPromise;
  }

  async startSession(): Promise<StartLocalResult> {
    if (this.activeSessionId) {
      throw new Error('a local session is already active');
    }
    if (!this.isAvailable()) {
      throw new Error('local engine not available (bindings not loaded)');
    }
    await this.preload();
    const sessionId = randomUUID();
    this.activeSessionId = sessionId;
    this.buffer = [];
    this.generation += 1;
    const gen = this.generation;
    this.streamingInterval = setInterval(() => {
      void this.tryEmitStreamingPartial(sessionId, gen);
    }, STREAMING_INTERVAL_MS);
    return { sessionId };
  }

  private async tryEmitStreamingPartial(sessionId: string, gen: number): Promise<void> {
    if (this.partialBusy) return;
    if (gen !== this.generation) return;
    if (this.activeSessionId !== sessionId) return;
    if (this.buffer.length === 0) return;
    if (!this.whisper) return;
    this.partialBusy = true;
    try {
      const audio = Buffer.concat(this.buffer);
      const pcm = await decodeToPcmFloat32(audio);
      if (gen !== this.generation) return;
      const task = await this.whisper.transcribe(pcm, { language: 'auto' });
      const segments = await task.result;
      if (gen !== this.generation) return;
      const text = segments.map((s) => s.text).join(' ').trim();
      console.log('[voice/local] streaming partial text="' + text + '"');
      this.emitPartial(sessionId, { text, isFinal: false });
    } catch (e) {
      console.warn('[voice/local] streaming partial failed', e);
    } finally {
      this.partialBusy = false;
    }
  }

  pushChunk(sessionId: string, buf: Buffer): void {
    if (this.activeSessionId !== sessionId) return;
    this.buffer.push(buf);
  }

  async stopSession(sessionId: string): Promise<void> {
    console.log('[voice/local] stopSession sessionId=', sessionId, 'active=', this.activeSessionId, 'chunks=', this.buffer.length);
    if (this.activeSessionId !== sessionId) {
      console.warn('[voice/local] stopSession: id mismatch — ignoring');
      return;
    }
    // Stop streaming and invalidate any in-flight inference; its result will
    // be discarded by the `generation` check.
    this.generation += 1;
    if (this.streamingInterval) {
      clearInterval(this.streamingInterval);
      this.streamingInterval = null;
    }
    // Wait for the in-flight partial to finish so we do not run two
    // inferences in parallel on the same whisper instance.
    const waitStart = Date.now();
    while (this.partialBusy && Date.now() - waitStart < 30000) {
      await new Promise((r) => setTimeout(r, 100));
    }
    try {
      const audio = Buffer.concat(this.buffer);
      if (audio.length === 0 || !this.whisper) {
        console.warn('[voice/local] empty buffer or no whisper instance — emitting empty final');
        this.emitPartial(sessionId, { text: '', isFinal: true });
      } else {
        const pcm = await decodeToPcmFloat32(audio);
        const task = await this.whisper.transcribe(pcm, { language: 'auto' });
        const segments = await task.result;
        const text = segments.map((s) => s.text).join(' ').trim();
        console.log('[voice/local] final text="' + text + '"');
        this.emitPartial(sessionId, { text, isFinal: true });
      }
    } catch (err) {
      console.error('[voice/local] stopSession threw', err);
      this.emitError(sessionId, (err as Error).message);
    } finally {
      this.activeSessionId = null;
      this.buffer = [];
    }
  }

  async cancelSession(sessionId: string): Promise<void> {
    if (this.activeSessionId !== sessionId) return;
    this.generation += 1;
    if (this.streamingInterval) {
      clearInterval(this.streamingInterval);
      this.streamingInterval = null;
    }
    this.activeSessionId = null;
    this.buffer = [];
  }

  async shutdown(): Promise<void> {
    this.generation += 1;
    if (this.streamingInterval) {
      clearInterval(this.streamingInterval);
      this.streamingInterval = null;
    }
    this.activeSessionId = null;
    this.buffer = [];
    if (this.whisper) {
      try { await this.whisper.free(); } catch { /* ignore */ }
      this.whisper = null;
      this.modelLoaded = false;
    }
  }

  private emitPartial(sessionId: string, p: LocalVoicePartial) {
    if (!this.renderer || this.renderer.isDestroyed()) return;
    this.renderer.send('voice:local:partial', { sessionId, ...p });
  }

  private emitError(sessionId: string, message: string) {
    if (!this.renderer || this.renderer.isDestroyed()) return;
    this.renderer.send('voice:local:error', { sessionId, message });
  }

  private emitProgress(p: LocalModelProgress) {
    if (!this.renderer || this.renderer.isDestroyed()) return;
    this.renderer.send('voice:local:loading-progress', p);
  }
}

export const localEngine = new LocalEngine();
