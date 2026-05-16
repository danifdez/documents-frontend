import { io, Socket } from 'socket.io-client';
import { VoiceCancelledError, type VoiceDriver, type VoiceEngine, type VoicePartial, type VoiceQueuedInfo } from '../../types/voice';

function getAuthToken(): string | null {
  const wsId = localStorage.getItem('activeWorkspaceId') || 'default';
  return localStorage.getItem(`accessToken_${wsId}`);
}

function getNamespaceUrl(): string {
  const base = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/voice`;
}

/**
 * Driver that talks to `VoiceGateway` (NestJS) over the `/voice` Socket.IO
 * namespace. The connection is opened lazily in start() and torn down in
 * stop(); we never share the socket with NotificationGateway because the
 * gateway lives in a dedicated namespace.
 */
export class BackendWhisperDriver implements VoiceDriver {
  readonly engine: VoiceEngine = 'remote';

  private socket: Socket | null = null;
  private partialCbs = new Set<(p: VoicePartial) => void>();
  private errorCbs = new Set<(err: Error) => void>();
  private queuedCbs = new Set<(info: VoiceQueuedInfo) => void>();
  private stopResolver: (() => void) | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  /** Reject of the promise returned by start() while it has not yet resolved.
   *  If the user cancels while queued, we invoke it to unblock the
   *  component's await. */
  private startReject: ((err: Error) => void) | null = null;

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // `forceNew: true` prevents socket.io from reusing the existing
      // Manager toward the same host (NotificationGateway). If it reused
      // it, the options of this io() would be ignored and `autoConnect`
      // would leave the socket in a disconnected state without firing
      // `connect_error`.
      const socket = io(getNamespaceUrl(), {
        auth: { token: getAuthToken() },
        autoConnect: false,
        forceNew: true,
        reconnection: false,
        timeout: 5000,
      });
      this.socket = socket;
      this.startReject = reject;

      const settleResolve = () => {
        this.startReject = null;
        cleanup();
        resolve();
      };
      const settleReject = (err: Error) => {
        this.startReject = null;
        cleanup();
        reject(err);
      };
      const onError = (err: { message?: string }) => {
        settleReject(new Error(err?.message || 'could not start dictation'));
      };
      const onConnectError = (err: Error) => {
        settleReject(new Error(err.message || 'could not connect to the voice server'));
      };
      const cleanup = () => {
        socket.off('voice:ready', settleResolve);
        socket.off('voice:assigned', settleResolve);
        socket.off('voice:error', onError);
        socket.off('connect_error', onConnectError);
      };

      socket.on('voice:ready', settleResolve);
      socket.on('voice:assigned', settleResolve);
      socket.on('voice:error', onError);
      socket.on('connect_error', onConnectError);

      socket.on('voice:partial', (payload: VoicePartial) => this.onPartialFromServer(payload));
      socket.on('voice:queued', (info: VoiceQueuedInfo) => this.onQueuedFromServer(info));
      socket.on('disconnect', () => this.onSocketLost());

      socket.once('connect', () => socket.emit('voice:start', {}));
      socket.connect();
    });
  }

  pushChunk(chunk: Blob): void {
    const socket = this.socket;
    if (!socket || socket.disconnected) return;
    chunk.arrayBuffer().then((buf) => {
      if (!socket.disconnected) socket.emit('voice:chunk', buf);
    }).catch((err) => {
      this.emitError(err instanceof Error ? err : new Error(String(err)));
    });
  }

  stop(): Promise<void> {
    return new Promise<void>((resolve) => {
      const socket = this.socket;
      if (!socket || socket.disconnected) {
        this.teardown();
        resolve();
        return;
      }
      this.stopResolver = () => {
        resolve();
        this.teardown();
      };
      this.stopTimer = setTimeout(() => {
        if (this.stopResolver) {
          const r = this.stopResolver;
          this.stopResolver = null;
          r();
        }
      }, 5000);
      socket.emit('voice:stop', {});
    });
  }

  async cancel(): Promise<void> {
    const socket = this.socket;
    if (socket && !socket.disconnected) {
      try { socket.emit('voice:cancel', {}); } catch { /* ignore */ }
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

  onQueued(cb: (info: VoiceQueuedInfo) => void): () => void {
    this.queuedCbs.add(cb);
    return () => this.queuedCbs.delete(cb);
  }

  // ── Internals ─────────────────────────────────────────────────────────

  private onPartialFromServer(payload: VoicePartial) {
    for (const cb of this.partialCbs) {
      try { cb(payload); } catch { /* swallow */ }
    }
    if (payload.isFinal && this.stopResolver) {
      const r = this.stopResolver;
      this.stopResolver = null;
      if (this.stopTimer) { clearTimeout(this.stopTimer); this.stopTimer = null; }
      r();
    }
  }

  private onQueuedFromServer(info: VoiceQueuedInfo) {
    for (const cb of this.queuedCbs) {
      try { cb(info); } catch { /* swallow */ }
    }
  }

  private onSocketLost() {
    if (this.stopResolver) {
      // Fine — we asked for stop and the server closed afterwards.
      return;
    }
    this.emitError(new Error('connection lost with the voice server'));
    this.teardown();
  }

  private emitError(err: Error) {
    for (const cb of this.errorCbs) {
      try { cb(err); } catch { /* swallow */ }
    }
  }

  private teardown() {
    if (this.stopTimer) { clearTimeout(this.stopTimer); this.stopTimer = null; }
    this.stopResolver = null;
    if (this.socket) {
      this.socket.removeAllListeners();
      if (!this.socket.disconnected) this.socket.disconnect();
      this.socket = null;
    }
  }
}
