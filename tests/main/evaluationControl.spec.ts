// @vitest-environment node
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IpcChannels, IpcEvents } from '@/ipc/channels';
import type { EvaluationInput, EvaluationRequest } from '@/ipc/evaluation';
import { attachEvaluationRelay } from '@/evaluation-relay';
import { checkedEvaluationInput, startEvaluation } from '@/main/evaluation/control';
import { captureHash } from '@/main/voice/captureStore';
import type { VoiceLocalBridge } from '@/types/electron';

const state = vi.hoisted(() => ({
  exists: vi.fn(), open: vi.fn(), write: vi.fn(), fsync: vi.fn(), close: vi.fn(), stat: vi.fn(), read: vi.fn(), chmod: vi.fn(),
  startServer: vi.fn(), handler: vi.fn(), send: vi.fn(), on: vi.fn(), quit: vi.fn(), appOn: vi.fn(),
  register: vi.fn(), checkProfile: vi.fn(), setUrl: vi.fn(),
}));
vi.mock('electron', () => ({
  app: { quit: state.quit, on: state.appOn },
  BrowserWindow: class {
    webContents = {
      mainFrame: {}, on: vi.fn(), send: state.send, getURL: () => state.setUrl.mock.lastCall?.[0],
      setWindowOpenHandler: vi.fn(), session: { setPermissionRequestHandler: vi.fn(), setPermissionCheckHandler: vi.fn() },
    };
    loadURL = state.setUrl;
    on = vi.fn();
    isDestroyed() { return false; }
  },
  ipcMain: { handle: state.handler },
  ipcRenderer: { on: state.on, invoke: vi.fn() },
}));
vi.mock('node:fs', async (original) => ({
  ...(await original<typeof import('node:fs')>()), existsSync: state.exists, openSync: state.open, closeSync: state.close,
  fstatSync: state.stat, fsyncSync: state.fsync, writeFileSync: state.write, readFileSync: state.read, chmodSync: state.chmod,
}));
vi.mock('node:net', async (original) => ({ ...(await original<typeof import('node:net')>()), createServer: state.startServer }));
vi.mock('@/main/voice/localEngine', () => ({
  LocalEngine: class { shutdown = vi.fn().mockResolvedValue(undefined); },
}));
vi.mock('@/main/ipc/voice-handlers', () => ({ createVoiceHandlers: vi.fn(() => ({})) }));
vi.mock('@/main/ipc/registry', () => ({ registerIpcHandlers: state.register }));
vi.mock('@/main/evaluation/profile', () => ({ laboratoryProfile: state.checkProfile }));

const token = 'a'.repeat(64);
const profile = '/test/evaluation';
const requestId = '4d271901-a958-409d-9b2a-a0db25e4abd0';
const bytes = Buffer.from([10, 20, 30, 40]);
const input: EvaluationInput = {
  media_type: 'audio/wav',
  chunks: [{ size: bytes.length, base64: bytes.toString('base64'), sha256: captureHash(bytes) }],
  execution: { delivery: 'ordered_ack', finish: 'stop', evidence_mode: 'simulated' },
};

let server: EventEmitter & { listen: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn>; listening: boolean };

beforeEach(() => {
  vi.resetAllMocks();
  state.read.mockReturnValue(JSON.stringify({ protocol: 'documents-evaluation/1', token }));
  state.stat.mockReturnValue({ isFile: () => true, uid: process.getuid!(), nlink: 1, mode: 0o600, size: 120 });
  state.open.mockReturnValue(5);
  state.exists.mockImplementation((file: string) => file.endsWith('evaluation-control.json'));
  server = Object.assign(new EventEmitter(), {
    listen: vi.fn((_location, callback) => callback()), close: vi.fn(), listening: true,
  });
  state.startServer.mockReturnValue(server);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function openEvaluation() {
  const { window, engine } = await startEvaluation(profile, '/test/preload.js', undefined, 'simulated');
  expect(state.checkProfile).toHaveBeenCalledWith(profile);
  expect(state.chmod).toHaveBeenCalledWith(profile + '/evaluation.sock', 0o600);
  const send = state.startServer.mock.calls[0][0];
  const respond = state.handler.mock.calls.find(([name]) => name === IpcChannels.evaluation.result)![1];
  return {
    engine,
    answer(value: unknown, operation: EvaluationRequest['operation'], ok = true) {
      const request = state.send.mock.calls.findLast(([_, payload]) => payload.operation === operation)?.[1];
      expect(request).toBeDefined();
      respond({ sender: window.webContents, senderFrame: window.webContents.mainFrame }, { id: request.id, ok, value });
    },
    request(operation: string, body: EvaluationInput | null = null) {
      const socket = Object.assign(new EventEmitter(), { setTimeout: vi.fn(), end: vi.fn(), destroy: vi.fn(), destroyed: false });
      send(socket);
      const response = new Promise<unknown>((resolve) => {
        socket.end.mockImplementation((data) => resolve(JSON.parse(data)));
      });
      const line = JSON.stringify({ token, operation, requestId, input: body }) + '\n';
      socket.emit('data', Buffer.from(line.slice(0, 24)));
      socket.emit('data', Buffer.from(line.slice(24)));
      return response;
    },
  };
}

describe('local voice evaluation', () => {
  it('validates the audio byte count and checksum and preserves the accepted evidence mode', () => {
    expect(checkedEvaluationInput(input, 'simulated')).toEqual(input);
    expect(() => checkedEvaluationInput(null, 'simulated')).toThrow('Invalid evaluation request');
    expect(() => checkedEvaluationInput(input, 'observed')).toThrow('Invalid evaluation conditions');
    expect(() => checkedEvaluationInput({ ...input, media_type: 'text/plain' }, 'simulated')).toThrow('Invalid evaluation conditions');
    expect(() => checkedEvaluationInput({ ...input, chunks: [{ ...input.chunks[0], size: 0 }] }, 'simulated')).toThrow('Invalid evaluation audio');
    expect(() => checkedEvaluationInput({ ...input, chunks: [{ ...input.chunks[0], sha256: 'different' }] }, 'simulated')).toThrow('Invalid evaluation audio');
  });

  it('returns health locally and forwards a status result through the renderer callback', async () => {
    const service = await openEvaluation();
    await expect(service.request('health')).resolves.toEqual({ ok: true, value: {
      protocol: 'documents-evaluation/1', evidence_mode: 'simulated', pid: process.pid,
    } });

    const pending = service.request('status');
    expect(state.send).toHaveBeenCalledWith(IpcEvents.evaluation.request, expect.objectContaining({ operation: 'status', requestId }));
    service.answer({ status: 'completed' }, 'status');
    await expect(pending).resolves.toEqual({ ok: true, value: { status: 'completed' } });
    const failed = service.request('capture');
    service.answer(null, 'capture', false);
    await expect(failed).resolves.toEqual({ ok: false, value: null });
  });

  it('submits a new recording once, acknowledges a matching retry, and rejects reused IDs with different audio', async () => {
    const service = await openEvaluation();
    const submitted = service.request('run', input);
    service.answer({ status: 'not_found' }, 'status');
    await expect(submitted).resolves.toEqual({ ok: true, value: { request_id: requestId, submitted: true } });
    expect(state.send).toHaveBeenLastCalledWith(IpcEvents.evaluation.request, expect.objectContaining({
      operation: 'run', requestId, input, requestHash: expect.stringMatching(/^sha256:/),
    }));
    service.answer({ status: 'completed' }, 'run');
    await expect(service.request('run', input)).resolves.toEqual({ ok: true, value: { request_id: requestId, submitted: true } });
    expect(state.send).toHaveBeenCalledTimes(2);
    await expect(service.request('run', { ...input, execution: { ...input.execution, finish: 'cancel' } }))
      .resolves.toEqual({ ok: false, value: null });
  });

  it('closes pending work on quit and handles an orderly shutdown request', async () => {
    vi.useFakeTimers();
    const service = await openEvaluation();
    const pending = service.request('status');
    const close = state.appOn.mock.calls.find(([name]) => name === 'will-quit')![1];
    close();
    await expect(pending).resolves.toEqual({ ok: false, value: null });
    await expect(service.request('shutdown')).resolves.toEqual({ ok: true, value: { stopping: true } });
    await vi.advanceTimersByTimeAsync(100);
    expect(service.engine.shutdown).toHaveBeenCalledTimes(1);
    expect(state.quit).toHaveBeenCalledTimes(1);
    expect(server.close).toHaveBeenCalled();
  });

  it.each(['stop', 'cancel'] as const)('passes ordered audio through the preload relay and finishes with %s', async (finish) => {
    const { ipcRenderer } = await import('electron');
    const voice = {
      startLocal: vi.fn().mockResolvedValue({ claimed: true }),
      pushChunkLocal: vi.fn().mockResolvedValue(undefined),
      stopLocal: vi.fn().mockResolvedValue(undefined), cancelLocal: vi.fn().mockResolvedValue(undefined),
      getCaptureLocal: vi.fn().mockResolvedValue({ state: 'captured' }),
    };
    attachEvaluationRelay(voice as unknown as VoiceLocalBridge);
    const [channel, relay] = state.on.mock.calls[0];
    expect(channel).toBe(IpcEvents.evaluation.request);
    relay({}, { operation: 'run', id: 'relay-1', input: { ...input, execution: { ...input.execution, finish } },
      requestId, requestHash: 'fixture-hash',
    } satisfies EvaluationRequest);
    await vi.waitFor(() => expect(ipcRenderer.invoke).toHaveBeenCalledWith(IpcChannels.evaluation.result, {
      id: 'relay-1', ok: true, value: { state: 'captured' },
    }));
    expect(voice.pushChunkLocal).toHaveBeenCalledExactlyOnceWith(requestId, Uint8Array.from(bytes).buffer, 1);
    expect(voice.getCaptureLocal).toHaveBeenCalledExactlyOnceWith(requestId, true);
    expect(finish === 'stop' ? voice.stopLocal : voice.cancelLocal).toHaveBeenCalledExactlyOnceWith(requestId);
  });
});
