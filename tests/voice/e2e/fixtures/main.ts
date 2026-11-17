import { app, BrowserWindow } from 'electron';
import { LocalEngine } from '../../../../src/main/voice/localEngine';
import { createVoiceHandlers } from '../../../../src/main/ipc/voice-handlers';
import { registerIpcHandlers } from '../../../../src/main/ipc/registry';
app.setPath('userData', process.env.VOICE_TEST_PROFILE!);
const inputs: number[][] = [];
let loads = 0;
const pending: ((segments: { text: string }[]) => void)[] = [];
const engine = new LocalEngine({
  available: () => true, hasModel: async () => true,
  load: async () => { loads++; return { transcribe: async () => ({ result: new Promise((resolve) => pending.push(resolve)) }), free: async () => undefined }; },
  decode: async (input) => { inputs.push([...input]); return new Float32Array([1]); },
});
Object.assign(globalThis, { voiceTest: {
  inputs: () => inputs, loads: () => loads,
  finish: (text: string) => pending.shift()?.([{ text }]),
} });
app.whenReady().then(async () => {
  const windows = [new BrowserWindow({ show: false, webPreferences: { preload: process.env.VOICE_TEST_PRELOAD! } }),
    new BrowserWindow({ show: false, webPreferences: { preload: process.env.VOICE_TEST_PRELOAD! } })];
  registerIpcHandlers(createVoiceHandlers((sender) => windows.some((window) => window.webContents === sender), engine,
    (sender) => process.argv.includes('--evaluation-capture') && sender === windows[0].webContents));
  for (const window of windows) await window.loadFile(process.env.VOICE_TEST_HTML!);
});
app.on('window-all-closed', () => app.quit());
