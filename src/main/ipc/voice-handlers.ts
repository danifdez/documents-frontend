import type { IpcMainInvokeEvent, WebContents } from 'electron';
import { localEngine, type LocalEngine, VOICE_LIMITS } from '../voice/localEngine';
import { IpcChannels } from '../../ipc/channels';
import type { IpcHandlerMap } from './registry';

/** Voice controls are limited to a trusted application window's main frame. */
export function createVoiceHandlers(isTrustedWindow: (sender: WebContents) => boolean, engine: LocalEngine = localEngine): IpcHandlerMap {
  const owner = (event: IpcMainInvokeEvent) => {
    if (event.sender.isDestroyed() || !event.senderFrame || event.senderFrame !== event.sender.mainFrame || !isTrustedWindow(event.sender)) {
      throw new Error('Local voice access denied');
    }
    return event.sender;
  };
  const id = (value: unknown): string => {
    if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      throw new Error('Invalid local voice session');
    }
    return value;
  };
  return {
    [IpcChannels.voice.isAvailable]: (event) => { owner(event); return engine.isAvailable(); },
    [IpcChannels.voice.hasModel]: (event) => { owner(event); return engine.hasModel(); },
    [IpcChannels.voice.preload]: (event) => engine.preload(owner(event)),
    [IpcChannels.voice.start]: (event) => engine.startSession(owner(event)),
    [IpcChannels.voice.chunk]: (event, sessionId: unknown, input: unknown) => {
      const sender = owner(event);
      const session = id(sessionId);
      if (!(input instanceof ArrayBuffer || input instanceof Uint8Array) || !input.byteLength || input.byteLength > VOICE_LIMITS.chunkBytes) {
        throw new Error('Invalid local voice audio chunk');
      }
      engine.pushChunk(sender, session, Buffer.from(input instanceof ArrayBuffer ? new Uint8Array(input) : input));
    },
    [IpcChannels.voice.stop]: (event, sessionId: unknown) => engine.stopSession(owner(event), id(sessionId)),
    [IpcChannels.voice.cancel]: (event, sessionId?: unknown) => engine.cancelSession(owner(event), sessionId === undefined ? undefined : id(sessionId)),
  };
}
