import { localEngine } from '../voice/localEngine';
import { IpcChannels } from '../../ipc/channels';
import type { IpcHandlerMap } from './registry';

// The engine is only actually available if the native bindings load
// (see `main/voice/localEngine.ts`). When they don't, `isAvailable`
// returns `false` and the renderer factory falls back to the remote driver.
export function createVoiceHandlers(): IpcHandlerMap {
  return {
    [IpcChannels.voice.isAvailable]: () => localEngine.isAvailable(),
    [IpcChannels.voice.hasModel]: () => localEngine.hasModel(),
    [IpcChannels.voice.preload]: async (event) => {
      localEngine.bindRenderer(event.sender);
      return localEngine.preload();
    },
    [IpcChannels.voice.start]: async (event) => {
      localEngine.bindRenderer(event.sender);
      return localEngine.startSession();
    },
    [IpcChannels.voice.chunk]: (_e, sessionId: string, buf: ArrayBuffer | Uint8Array) => {
      const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf as ArrayBuffer);
      localEngine.pushChunk(sessionId, b);
    },
    [IpcChannels.voice.stop]: (_e, sessionId: string) => localEngine.stopSession(sessionId),
    [IpcChannels.voice.cancel]: (_e, sessionId: string) => localEngine.cancelSession(sessionId),
  };
}
