import { app, BrowserWindow } from 'electron';
import { LocalEngine } from '../../../../src/main/voice/localEngine';
import { createVoiceHandlers } from '../../../../src/main/ipc/voice-handlers';
import { registerIpcHandlers } from '../../../../src/main/ipc/registry';
import { captureId } from '../../../../src/main/voice/captureStore';
import { IpcChannels } from '../../../../src/ipc/channels';
app.setPath('userData', process.env.VOICE_TEST_PROFILE!);
const inputs: number[][] = [];
let loads = 0;
let armedCapture: string | undefined;
const pending: ((segments: { text: string }[]) => void)[] = [];
const engine = new LocalEngine({
  available: () => true, hasModel: async () => true,
  load: async () => { loads++; return { transcribe: async () => ({ result: new Promise((resolve) => pending.push(resolve)) }), free: async () => undefined }; },
  decode: async (input) => { inputs.push([...input]); return new Float32Array([1]); },
  // Deliberately simulated dependency evidence, independent of installed native modules.
  identity: () => {
    const binary = { sha256: 'sha256:' + '0'.repeat(64), sizeBytes: 16 };
    return { adapter: { name: 'smart-whisper', version: '0.8.1', entry: binary }, nativeBinary: binary,
      decoder: { source: 'system', binary }, runtime: { platform: process.platform, arch: process.arch,
        node: process.versions.node, electron: process.versions.electron, modules: process.versions.modules },
      verification: 'module_load_and_file_checks' };
  },
});
Object.assign(globalThis, { voiceTest: {
  inputs: () => inputs, loads: () => loads,
  finish: (text: string) => pending.shift()?.([{ text }]),
  armEditorCapture: (requestId: string) => {
    if (!process.argv.includes('--evaluation-capture') || armedCapture) throw new Error('Editor fixture capture is not available');
    armedCapture = captureId(requestId);
  },
} });
app.whenReady().then(async () => {
  const windows = [new BrowserWindow({ show: false, webPreferences: { preload: process.env.VOICE_TEST_PRELOAD! } }),
    new BrowserWindow({ show: false, webPreferences: { preload: process.env.VOICE_TEST_PRELOAD! } })];
  const captureAllowed = (sender: Electron.WebContents) => process.argv.includes('--evaluation-capture') && sender === windows[0].webContents;
  const handlers = createVoiceHandlers((sender) => windows.some((window) => window.webContents === sender), engine, captureAllowed);
  const start = handlers[IpcChannels.voice.start]!;
  const chunk = handlers[IpcChannels.voice.chunk]!;
  let editorCapture: { id: string; sequence: number } | undefined;
  // Authorize the fixture's next UI session via the existing capture protocol.
  handlers[IpcChannels.voice.start] = (event, options?: unknown) => {
    if (options !== undefined || !armedCapture || !captureAllowed(event.sender) || event.senderFrame !== event.sender.mainFrame) {
      return start(event, options);
    }
    const requestId = armedCapture;
    armedCapture = undefined;
    editorCapture = { id: requestId, sequence: 0 };
    return start(event, { capture: { requestId, consent: 'granted', purpose: 'evaluation', mediaType: 'audio/webm;codecs=opus' } });
  };
  handlers[IpcChannels.voice.chunk] = (event, id: unknown, data: unknown, sequence?: number) => {
    if (editorCapture && id === editorCapture.id && sequence === undefined && captureAllowed(event.sender) && event.senderFrame === event.sender.mainFrame) {
      sequence = ++editorCapture.sequence;
    }
    return chunk(event, id, data, sequence);
  };
  registerIpcHandlers(handlers);
  for (const window of windows) await window.loadFile(process.env.VOICE_TEST_HTML!);
});
app.on('window-all-closed', () => app.quit());
