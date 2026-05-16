/**
 * Contracts shared between the local engine in the main process and the IPC
 * handlers consumed from the renderer. These types also describe the
 * `window.voice` bridge (see `src/types/voice-ipc.ts`).
 */

export interface LocalVoicePartial {
  text: string;
  isFinal: boolean;
}

export interface LocalVoiceError {
  message: string;
}

export interface LocalModelProgress {
  /** Bytes downloaded so far. */
  downloaded: number;
  /** Expected total size, if known. */
  total: number | null;
  /** 0–100. */
  percent: number;
}

/**
 * Result of starting a local session. The renderer receives a sessionId
 * to correlate partials/errors with this specific session (even though
 * we currently support only one session at a time, we keep the id for
 * future concurrency).
 */
export interface StartLocalResult {
  sessionId: string;
}

/** Reasons why the local engine may not be available. */
export type LocalUnavailableReason =
  | 'no-bindings'    // whisper.cpp native bindings fail to load
  | 'no-model'       // the binding exists but the model hasn't been downloaded yet
  | 'init-failed';   // bindings loaded but initialization failed
