import { VoiceCancelledError, type VoiceDriver, type VoiceEngine, type VoicePartial } from '../../types/voice';

/** The existing IPC bridge owns processing; this driver orders delivery and close. */
export class LocalWhisperDriver implements VoiceDriver {
  readonly engine: VoiceEngine = 'local';
  private sessionId: string | null = null;
  private generation = 0;
  private starting?: Promise<void>;
  private stopping?: Promise<void>;
  private chunks = Promise.resolve();
  private partialCbs = new Set<(p: VoicePartial) => void>();
  private errorCbs = new Set<(err: Error) => void>();
  private unsubPartial?: () => void;
  private unsubError?: () => void;
  private completion?: { resolve(): void; reject(error: Error): void };

  start(): Promise<void> {
    const bridge = window.voice;
    if (!bridge?.isLocalAvailable()) return Promise.reject(new Error('Local voice is unavailable'));
    if (this.starting || this.stopping || this.sessionId) return Promise.reject(new Error('Local voice is already active'));
    const generation = ++this.generation;
    this.chunks = Promise.resolve();
    this.unsubPartial = bridge.onPartialLocal((payload) => {
      if (generation !== this.generation || payload.sessionId !== this.sessionId) return;
      for (const callback of this.partialCbs) {
        try { callback({ text: payload.text, isFinal: payload.isFinal }); } catch { /* Keep finalization independent of listeners. */ }
      }
      if (payload.isFinal) this.completion?.resolve();
    });
    this.unsubError = bridge.onErrorLocal((payload) => {
      if (generation !== this.generation || payload.sessionId !== this.sessionId) return;
      const error = new Error(payload.message);
      this.completion?.reject(error);
      this.emitError(error);
      void this.cancel();
    });
    const work = (async () => {
      try {
        const { sessionId } = await bridge.startLocal();
        if (generation !== this.generation) {
          await bridge.cancelLocal(sessionId).catch((): undefined => undefined);
          throw new VoiceCancelledError();
        }
        this.sessionId = sessionId;
      } catch (error) {
        if (generation === this.generation) this.teardown();
        throw error;
      }
    })();
    this.starting = work;
    void work.finally(() => { if (this.starting === work) this.starting = undefined; }).catch((): undefined => undefined);
    return work;
  }

  pushChunk(chunk: Blob): void {
    const bridge = window.voice;
    const id = this.sessionId;
    const generation = this.generation;
    if (!bridge || !id || this.stopping) return;
    this.chunks = this.chunks.then(async () => {
      if (generation !== this.generation) return;
      const bytes = await chunk.arrayBuffer();
      if (generation === this.generation) await bridge.pushChunkLocal(id, bytes);
    }).catch(() => {
      if (generation !== this.generation) return;
      const error = new Error('Local voice audio could not be delivered');
      this.completion?.reject(error);
      this.emitError(error);
      void this.cancel();
    });
  }

  stop(): Promise<void> {
    if (this.stopping) return this.stopping;
    const bridge = window.voice;
    const id = this.sessionId;
    const generation = this.generation;
    if (!bridge || !id) return Promise.resolve();
    const final = new Promise<void>((resolve, reject) => { this.completion = { resolve, reject }; });
    const timer = setTimeout(() => {
      this.completion?.reject(new Error('Local voice processing timed out'));
      void bridge.cancelLocal(id).catch((): undefined => undefined);
    }, 60000);
    const work = (async () => {
      // Blob conversion and IPC delivery must finish before requesting the final pass.
      const delivery = (async () => {
        await this.chunks;
        if (generation !== this.generation) throw new VoiceCancelledError();
        await bridge.stopLocal(id);
      })();
      await Promise.all([final, delivery]);
    })().finally(() => {
      clearTimeout(timer);
      if (generation === this.generation) this.teardown();
      if (this.stopping === work) this.stopping = undefined;
    });
    // A final/error can precede the last queued chunk's delivery.
    void final.catch((): undefined => undefined);
    this.stopping = work;
    return work;
  }

  async cancel(): Promise<void> {
    const bridge = window.voice;
    const id = this.sessionId;
    const pendingStart = !!this.starting;
    this.generation++;
    this.completion?.reject(new VoiceCancelledError());
    this.teardown();
    if (bridge && (id || pendingStart)) {
      try { await bridge.cancelLocal(id ?? undefined); } catch { /* Session may already be closed. */ }
    }
  }
  onPartial(cb: (p: VoicePartial) => void): () => void {
    this.partialCbs.add(cb);
    return () => this.partialCbs.delete(cb);
  }
  onError(cb: (error: Error) => void): () => void {
    this.errorCbs.add(cb);
    return () => this.errorCbs.delete(cb);
  }
  private emitError(error: Error) {
    for (const callback of this.errorCbs) {
      try { callback(error); } catch { /* One listener must not prevent cancellation. */ }
    }
  }
  private teardown() {
    this.generation++;
    this.unsubPartial?.(); this.unsubPartial = undefined;
    this.unsubError?.(); this.unsubError = undefined;
    this.completion = undefined;
    this.sessionId = null;
  }
}
