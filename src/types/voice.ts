export type VoiceEngine = 'local' | 'remote';

export interface VoicePartial {
  /** Accumulated text so far (not a diff). Overlapping windows may rewrite
   *  the last words, so the container should replace the content rather
   *  than concatenate. */
  text: string;
  /** true only on the last event emitted after stop(). */
  isFinal: boolean;
}

export interface VoiceQueuedInfo {
  position: number;
  /** Estimate in seconds. 0 if unknown. */
  eta: number;
}

/** Thrown by `driver.start()` when the user cancels while the promise is
 *  pending (typically from the queue). Containers can distinguish this
 *  from real errors and exit silently to `idle`. */
export class VoiceCancelledError extends Error {
  constructor() {
    super('voice session cancelled');
    this.name = 'VoiceCancelledError';
  }
}

export interface VoiceDriver {
  readonly engine: VoiceEngine;
  start(): Promise<void>;
  /** Fire-and-forget. Transport errors arrive through onError. */
  pushChunk(chunk: Blob): void;
  /** Resolves when the partial with isFinal=true arrives (or after timeout). */
  stop(): Promise<void>;
  /** Abort without waiting for the final partial. Used when cancelling
   *  while queued or when unmounting the component. */
  cancel(): Promise<void>;
  onPartial(cb: (p: VoicePartial) => void): () => void;
  onError(cb: (err: Error) => void): () => void;
  /** Optional: the remote driver emits it when the client is queued. */
  onQueued?(cb: (info: VoiceQueuedInfo) => void): () => void;
}
