/** Runs in preload; all operations continue through the existing guarded IPC. */
import { ipcRenderer } from 'electron';
import { IpcChannels, IpcEvents } from './ipc/channels';
import type { EvaluationRequest } from './ipc/evaluation';
import type { VoiceLocalBridge } from './types/electron';
export function attachEvaluationRelay(voice: VoiceLocalBridge): void {
  ipcRenderer.on(IpcEvents.evaluation.request, (_event, request: EvaluationRequest) => {
    const execute = async () => {
      const id = request.requestId;
      if (request.operation === 'status') return voice.getStatusLocal(id);
      if (request.operation === 'capture') return voice.getCaptureLocal(id, true);
      if (request.operation === 'cancel') { await voice.cancelLocal(id); return voice.getStatusLocal(id); }
      if (request.operation !== 'run' || !request.input || !request.requestHash) throw new Error('Invalid evaluation operation');
      const { input } = request;
      const started = await voice.startLocal({ capture: { requestId: id, consent: 'granted', purpose: 'evaluation', mediaType: input.media_type, requestHash: request.requestHash } });
      if (started.claimed) {
        for (let index = 0; index < input.chunks.length; index++) {
          const body = Uint8Array.from(atob(input.chunks[index].base64), (char) => char.charCodeAt(0));
          await voice.pushChunkLocal(id, body.buffer, index + 1);
        }
        if (input.execution.finish === 'cancel') await voice.cancelLocal(id); else await voice.stopLocal(id);
      }
      return voice.getCaptureLocal(id, true);
    };
    void execute().then((value) => ipcRenderer.invoke(IpcChannels.evaluation.result, { id: request.id, ok: true, value }),
      () => ipcRenderer.invoke(IpcChannels.evaluation.result, { id: request.id, ok: false, value: null })).catch((): undefined => undefined);
  });
}
