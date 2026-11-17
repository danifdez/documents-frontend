import type { IpcMainInvokeEvent, WebContents } from 'electron';
import { localEngine, type LocalEngine, VOICE_LIMITS } from '../voice/localEngine';
import type { LocalVoiceStartOptions } from '../../types/voice';
import { IpcChannels } from '../../ipc/channels';
import type { IpcHandlerMap } from './registry';

/** Voice controls are limited to a trusted application window's main frame. */
export function createVoiceHandlers(isTrustedWindow: (sender: WebContents) => boolean, engine: LocalEngine = localEngine, captureAllowed: (sender: WebContents) => boolean = () => false): IpcHandlerMap {
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
    [IpcChannels.voice.start]: (event, options?: unknown) => {
      const sender = owner(event);
      if (options === undefined) return engine.startSession(sender);
      const value = options as LocalVoiceStartOptions;
      if (!value || typeof value !== 'object' || Object.keys(value).join() !== 'capture' || !value.capture ||
          typeof value.capture !== 'object' || Array.isArray(value.capture) ||
          Object.keys(value.capture).sort().join() !== 'consent,mediaType,purpose,requestId' ||
          value.capture.consent !== 'granted' || value.capture.purpose !== 'evaluation' ||
          !['audio/wav', 'audio/webm', 'audio/webm;codecs=opus', 'audio/ogg', 'audio/ogg;codecs=opus'].includes(value.capture.mediaType) ||
          !captureAllowed(sender)) throw new Error('Local voice capture authorization required');
      id(value.capture.requestId);
      return engine.startSession(sender, value);
    },
    [IpcChannels.voice.chunk]: (event, sessionId: unknown, input: unknown, sequence?: number) => {
      const sender = owner(event);
      const session = id(sessionId);
      if (!(input instanceof ArrayBuffer || input instanceof Uint8Array) || !input.byteLength || input.byteLength > VOICE_LIMITS.chunkBytes) {
        throw new Error('Invalid local voice audio chunk');
      }
      if (sequence !== undefined && (!Number.isSafeInteger(sequence) || sequence < 1 || sequence > VOICE_LIMITS.chunks)) throw new Error('Invalid local capture input sequence');
      return engine.pushChunk(sender, session, Buffer.from(input instanceof ArrayBuffer ? new Uint8Array(input) : input), sequence);
    },
    [IpcChannels.voice.stop]: (event, sessionId: unknown) => engine.stopSession(owner(event), id(sessionId)),
    [IpcChannels.voice.capture]: async (event, requestId: string, exportEvidence = false) => {
      const sender = owner(event);
      if (!captureAllowed(sender) || typeof exportEvidence !== 'boolean') throw new Error('Local voice capture authorization required');
      const capture = await engine.capture(id(requestId));
      return exportEvidence ? capture : { sessionId: capture.requestId, status: capture.status, claimed: false };
    },
    [IpcChannels.voice.cancel]: (event, sessionId?: unknown) => engine.cancelSession(owner(event), sessionId === undefined ? undefined : id(sessionId)),
  };
}
