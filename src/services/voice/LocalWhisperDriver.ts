import { VoiceCancelledError, type VoiceDriver, type VoiceEngine, type VoicePartial } from '../../types/voice';

/**
 * Local engine driver. Talks to the main process `localEngine` through the
 * `window.voice` bridge exposed by the preload (Task 08).
 *
 * The local engine does not support queueing (it is for a single user), so
 * this implementation does not expose `onQueued`.
 */
export class LocalWhisperDriver implements VoiceDriver {
  readonly engine: VoiceEngine = 'local';

  private sessionId: string | null = null;
  private partialCbs = new Set<(p: VoicePartial) => void>();
  private errorCbs = new Set<(err: Error) => void>();
  private unsubPartial: (() => void) | null = null;
  private unsubError: (() => void) | null = null;
  private stopResolver: (() => void) | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private startReject: ((err: Error) => void) | null = null;

  async start(): Promise<void> {
    const bridge = window.voice;
    if (!bridge) {
      throw new Error('local engine not available in this environment');
    }
    if (!bridge.isLocalAvailable()) {
      throw new Error('local engine not available (native bindings failed to load)');
    }
    return new Promise<void>((resolve, reject) => {
      this.startReject = reject;
      this.unsubPartial = bridge.onPartialLocal((payload) => this.onMainPartial(payload));
      this.unsubError = bridge.onErrorLocal((payload) => this.onMainError(payload));
      console.log('[local-driver] start: subscribed listeners, calling bridge.startLocal()');
      bridge.startLocal()
        .then(({ sessionId }) => {
          console.log('[local-driver] start: got sessionId', sessionId);
          this.sessionId = sessionId;
          this.startReject = null;
          resolve();
        })
        .catch((err) => {
          console.error('[local-driver] start: startLocal rejected', err);
          this.startReject = null;
          this.teardown();
          reject(err instanceof Error ? err : new Error(String(err)));
        });
    });
  }

  pushChunk(chunk: Blob): void {
    const bridge = window.voice;
    if (!bridge || !this.sessionId) return;
    chunk.arrayBuffer()
      .then((buf) => bridge.pushChunkLocal(this.sessionId!, buf))
      .catch((err) => this.emitError(err instanceof Error ? err : new Error(String(err))));
  }

  stop(): Promise<void> {
    const bridge = window.voice;
    console.log('[local-driver] stop called, bridge?=', !!bridge, 'sessionId=', this.sessionId);
    if (!bridge || !this.sessionId) {
      console.warn('[local-driver] stop: shortcut (no bridge or no sessionId)');
      this.teardown();
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.stopResolver = () => {
        console.log('[local-driver] stop: resolver invoked');
        resolve();
        this.teardown();
      };
      // CPU inference of whisper-base on 5-10s of audio can take 10-20s
      // on modest machines. We leave a wide margin: if after 60s the
      // partial hasn't arrived, we assume the engine is stuck.
      this.stopTimer = setTimeout(() => {
        if (this.stopResolver) {
          console.warn('[local-driver] stop: 60s timeout (transcription took too long)');
          const r = this.stopResolver;
          this.stopResolver = null;
          r();
        }
      }, 60000);
      console.log('[local-driver] stop: emitting bridge.stopLocal');
      bridge.stopLocal(this.sessionId!).catch((err) => {
        console.error('[local-driver] stop: stopLocal rejected', err);
        this.emitError(err instanceof Error ? err : new Error(String(err)));
      });
    });
  }

  async cancel(): Promise<void> {
    const bridge = window.voice;
    if (bridge && this.sessionId) {
      try { await bridge.cancelLocal(this.sessionId); } catch { /* ignore */ }
    }
    if (this.startReject) {
      const reject = this.startReject;
      this.startReject = null;
      reject(new VoiceCancelledError());
    }
    this.teardown();
  }

  onPartial(cb: (p: VoicePartial) => void): () => void {
    this.partialCbs.add(cb);
    return () => this.partialCbs.delete(cb);
  }

  onError(cb: (err: Error) => void): () => void {
    this.errorCbs.add(cb);
    return () => this.errorCbs.delete(cb);
  }

  // ── Internals ─────────────────────────────────────────────────────────

  private onMainPartial(payload: { sessionId: string; text: string; isFinal: boolean }) {
    console.log('[local-driver] onMainPartial', payload, 'expected sessionId=', this.sessionId, 'cbs=', this.partialCbs.size);
    if (payload.sessionId !== this.sessionId) {
      console.warn('[local-driver] dropping: sessionId mismatch');
      return;
    }
    const part: VoicePartial = { text: payload.text, isFinal: payload.isFinal };
    for (const cb of this.partialCbs) {
      try { cb(part); } catch (e) { console.error('[local-driver] cb threw', e); }
    }
    if (payload.isFinal && this.stopResolver) {
      const r = this.stopResolver;
      this.stopResolver = null;
      if (this.stopTimer) { clearTimeout(this.stopTimer); this.stopTimer = null; }
      r();
    }
  }

  private onMainError(payload: { sessionId: string; message: string }) {
    if (payload.sessionId !== this.sessionId) return;
    this.emitError(new Error(payload.message));
  }

  private emitError(err: Error) {
    for (const cb of this.errorCbs) {
      try { cb(err); } catch { /* swallow */ }
    }
  }

  private teardown() {
    if (this.stopTimer) { clearTimeout(this.stopTimer); this.stopTimer = null; }
    this.stopResolver = null;
    if (this.unsubPartial) { this.unsubPartial(); this.unsubPartial = null; }
    if (this.unsubError) { this.unsubError(); this.unsubError = null; }
    this.sessionId = null;
  }
}
