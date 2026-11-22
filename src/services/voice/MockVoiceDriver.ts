import type { VoiceDriver, VoiceEngine, VoicePartial } from '../../types/voice';

const PHRASES = [
  'hola',
  'hola mundo',
  'hola mundo esto',
  'hola mundo esto es',
  'hola mundo esto es una',
  'hola mundo esto es una prueba',
];

/**
 * Synthetic driver used in tests and during component development before the
 * real drivers exist. Emits accumulated text every `intervalMs` ms.
 */
export class MockVoiceDriver implements VoiceDriver {
  readonly engine: VoiceEngine;

  private timer: ReturnType<typeof setInterval> | null = null;
  private index = 0;
  private readonly partialCbs = new Set<(p: VoicePartial) => void>();
  private readonly errorCbs = new Set<(err: Error) => void>();
  private readonly intervalMs: number;
  private finalResolver: (() => void) | null = null;

  constructor(engine: VoiceEngine = 'remote', intervalMs = 500) {
    this.engine = engine;
    this.intervalMs = intervalMs;
  }

  start(): Promise<void> {
    this.index = 0;
    this.timer = setInterval(() => this.tick(), this.intervalMs);
    return Promise.resolve();
  }

  pushChunk(_chunk: Blob): void {
    // Mock ignores audio; keeps the contract signature.
  }

  async stop(): Promise<void> {
    this.clearTimer();
    return new Promise<void>((resolve) => {
      this.finalResolver = resolve;
      const text = PHRASES[Math.min(this.index, PHRASES.length - 1)] ?? '';
      this.emitPartial({ text, isFinal: true });
    });
  }

  cancel(): Promise<void> {
    this.clearTimer();
    this.finalResolver = null;
    return Promise.resolve();
  }

  onPartial(cb: (p: VoicePartial) => void): () => void {
    this.partialCbs.add(cb);
    return () => this.partialCbs.delete(cb);
  }

  onError(cb: (err: Error) => void): () => void {
    this.errorCbs.add(cb);
    return () => this.errorCbs.delete(cb);
  }

  private tick() {
    if (this.index >= PHRASES.length) return;
    this.emitPartial({ text: PHRASES[this.index], isFinal: false });
    this.index += 1;
  }

  private emitPartial(p: VoicePartial) {
    for (const cb of this.partialCbs) {
      try { cb(p); } catch { /* swallow */ }
    }
    if (p.isFinal && this.finalResolver) {
      const resolve = this.finalResolver;
      this.finalResolver = null;
      resolve();
    }
  }

  private clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
