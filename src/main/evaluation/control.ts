/** Private, bounded local transport. The renderer still invokes the guarded voice IPC. */
import { app, BrowserWindow, ipcMain } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as net from 'node:net';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { IpcChannels, IpcEvents } from '../../ipc/channels';
import type { EvaluationInput, EvaluationOperation } from '../../ipc/evaluation';
import { captureHash, canonical, captureId } from '../voice/captureStore';
import { LocalEngine } from '../voice/localEngine';
import { createVoiceHandlers } from '../ipc/voice-handlers';
import { registerIpcHandlers } from '../ipc/registry';
import { laboratoryProfile } from './profile';
import { hasExactOwnKeys } from '../../utils/hasExactOwnKeys';
const LIMIT = 8 * 1024 * 1024;
const PAGE = 'data:text/html;charset=utf-8,' + encodeURIComponent('<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; frame-src \'none\'"><title>Documents evaluation</title>');
function exact(value: unknown, names: string[]): asserts value is Record<string, unknown> {
  if (!hasExactOwnKeys(value, names)) throw new Error('Invalid evaluation request');
}
export function checkedEvaluationInput(value: unknown, mode: string): EvaluationInput {
  exact(value, ['media_type', 'chunks', 'execution']); exact(value.execution, ['delivery', 'finish', 'evidence_mode']);
  if (typeof value.media_type !== 'string' ||
      !['audio/wav','audio/webm','audio/webm;codecs=opus','audio/ogg','audio/ogg;codecs=opus'].includes(value.media_type) ||
      !Array.isArray(value.chunks) || value.chunks.length > 4096 || value.execution.delivery !== 'ordered_ack' ||
      (value.execution.finish !== 'stop' && value.execution.finish !== 'cancel') || value.execution.evidence_mode !== mode) throw new Error('Invalid evaluation conditions');
  let bytes = 0;
  for (const chunk of value.chunks) {
    exact(chunk, ['size', 'sha256', 'base64']);
    if (!Number.isSafeInteger(chunk.size) || Number(chunk.size) < 1 || Number(chunk.size) > 256 * 1024 || typeof chunk.base64 !== 'string' || chunk.base64.length > 349528) throw new Error('Invalid evaluation audio');
    const body = Buffer.from(chunk.base64, 'base64'); bytes += body.length;
    if (bytes > 4 * 1024 * 1024 || body.length !== chunk.size || body.toString('base64') !== chunk.base64 || captureHash(body) !== chunk.sha256) throw new Error('Invalid evaluation audio');
  }
  return value as unknown as EvaluationInput;
}
function privateToken(profile: string): string {
  const file = path.join(profile, 'evaluation-control.json');
  if (!fs.existsSync(file)) {
    const fd = fs.openSync(file, 'wx', 0o600);
    try { fs.writeFileSync(fd, JSON.stringify({ protocol: 'documents-evaluation/1', token: randomBytes(32).toString('hex') })); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
  }
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.uid !== process.getuid!() || stat.nlink !== 1 || (stat.mode & 0o777) !== 0o600 || stat.size > 256) throw new Error('Invalid evaluation credentials');
    const value = JSON.parse(fs.readFileSync(fd, 'utf8')); exact(value, ['protocol', 'token']);
    if (value.protocol !== 'documents-evaluation/1' || typeof value.token !== 'string' || !/^[a-f0-9]{64}$/.test(value.token)) throw new Error('Invalid evaluation credentials');
    return value.token;
  } finally { fs.closeSync(fd); }
}
function handleEvaluationConnection(socket: net.Socket, dispatch: (raw: Buffer) => Promise<unknown>): void {
  let raw = Buffer.alloc(0);
  let handled = false;
  socket.setTimeout(15000, () => socket.destroy());
  function respond(ok: boolean, value: unknown) {
    if (socket.destroyed) return;
    const output = JSON.stringify({ ok, value }) + '\n';
    socket.end(Buffer.byteLength(output) <= LIMIT ? output : '{"ok":false,"value":null}\n');
  }
  socket.on('error', (): undefined => undefined);
  socket.on('data', (part) => {
    if (handled) {
      socket.destroy();
      return;
    }
    raw = Buffer.concat([raw, Buffer.isBuffer(part) ? part : Buffer.from(part)]);
    if (raw.length > LIMIT) {
      socket.destroy();
      return;
    }
    if (!raw.includes(10)) return;
    handled = true;
    void dispatch(raw).then(value => respond(true, value), () => respond(false, null));
  });
}

export async function startEvaluation(profile: string, preload: string, engine = new LocalEngine(undefined, undefined, { allowModelDownload: false }), mode: 'observed' | 'simulated' = 'observed') {
  laboratoryProfile(profile);
  const endpoint = path.join(profile, 'evaluation.sock');
  if (Buffer.byteLength(endpoint) > 100 || fs.existsSync(endpoint)) throw new Error('Evaluation endpoint already exists');
  const token = privateToken(profile);
  const window = new BrowserWindow({ show: false, webPreferences: { preload, sandbox: true, contextIsolation: true, nodeIntegration: false } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  window.webContents.session.setPermissionCheckHandler(() => false);
  const trusted = (sender: Electron.WebContents) => sender === window.webContents && sender.getURL() === PAGE;
  registerIpcHandlers(createVoiceHandlers(trusted, engine, trusted));
  const pending = new Map<string, { resolve(value: unknown): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> }>();
  ipcMain.handle(IpcChannels.evaluation.result, (event, message: unknown) => {
    if (!trusted(event.sender) || event.senderFrame !== event.sender.mainFrame) throw new Error('Evaluation access denied');
    exact(message, ['id', 'ok', 'value']);
    if (typeof message.id !== 'string' || typeof message.ok !== 'boolean') throw new Error('Unknown evaluation response');
    const item = pending.get(message.id);
    if (!item) throw new Error('Unknown evaluation response');
    clearTimeout(item.timer);
    pending.delete(message.id);
    if (message.ok) item.resolve(message.value); else item.reject(new Error('Evaluation operation failed'));
  });
  const invoke = (operation: EvaluationOperation, requestId: string, input?: EvaluationInput, requestHash?: string) => new Promise<unknown>((resolve, reject) => {
    if (pending.size >= 16 || window.isDestroyed()) { reject(new Error('Evaluation unavailable')); return; }
    const id = randomUUID();
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Evaluation operation is unconfirmed')); }, operation === 'run' ? 360000 : 15000);
    pending.set(id, { resolve, reject, timer });
    window.webContents.send(IpcEvents.evaluation.request, { id, operation, requestId, input, requestHash });
  });
  await window.loadURL(PAGE);
  const jobs = new Map<string, string>();
  async function submit(requestId: string, value: unknown) {
    const input = checkedEvaluationInput(value, mode);
    const hash = captureHash(canonical(input));
    const job = jobs.get(requestId);
    if (job !== undefined) {
      if (job !== hash) throw new Error('Evaluation input conflict');
      return { request_id: requestId, submitted: true };
    }
    if (jobs.size >= 64) throw new Error('Evaluation session limit exceeded');
    jobs.set(requestId, hash);
    try {
      const status = await invoke('status', requestId) as { status: string };
      if (status.status === 'not_found') {
        // The renderer completes the sequence even if this connection disappears.
        void invoke('run', requestId, input, hash).catch((): undefined => undefined);
      } else {
        const capture = await invoke('capture', requestId) as { capture: { requestHash?: string } };
        if (capture.capture.requestHash !== hash) throw new Error('Evaluation request identity differs');
      }
    } catch {
      throw new Error('Evaluation submission is unconfirmed');
    }
    return { request_id: requestId, submitted: true };
  }

  function shutdown() {
    if (server.listening) server.close();
    void engine.shutdown().finally(() => app.quit()).catch((): undefined => undefined);
  }

  async function dispatch(raw: Buffer): Promise<unknown> {
    if (raw.indexOf(10) !== raw.length - 1) throw new Error('Invalid evaluation framing');
    const request: unknown = JSON.parse(raw.toString('utf8'));
    exact(request, ['token', 'operation', 'requestId', 'input']);
    if (typeof request.token !== 'string') throw new Error('Evaluation access denied');
    const supplied = Buffer.from(request.token);
    const expected = Buffer.from(token);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      throw new Error('Evaluation access denied');
    }

    if (request.operation === 'health') return { protocol: 'documents-evaluation/1', evidence_mode: mode, pid: process.pid };
    if (request.operation === 'shutdown') {
      setTimeout(shutdown, 100);
      return { stopping: true };
    }

    if (typeof request.requestId !== 'string') throw new Error('Invalid evaluation request ID');
    const id = captureId(request.requestId);
    if (request.operation === 'run') return submit(id, request.input);
    if (request.operation !== 'status' && request.operation !== 'capture' && request.operation !== 'cancel' || request.input !== null) {
      throw new Error('Unknown evaluation operation');
    }
    return invoke(request.operation, id);
  }

  const server = net.createServer(socket => handleEvaluationConnection(socket, dispatch));
  server.maxConnections = 16;
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(endpoint, () => { fs.chmodSync(endpoint, 0o600); resolve(); }); });
  window.on('closed', () => app.quit());
  app.on('will-quit', () => {
    if (server.listening) server.close();
    for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error('Evaluation closed')); }
    pending.clear();
  });
  return { window, engine };
}
