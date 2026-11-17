import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { BackendWhisperDriver } from '@/services/voice/BackendWhisperDriver';
import { VoiceCancelledError } from '@/types/voice';

const { connect } = vi.hoisted(() => ({ connect: vi.fn() }));
vi.mock('socket.io-client', () => ({ io: connect }));

class VoiceSocket extends EventEmitter {
  disconnected = true;
  emit = vi.fn();
  receive = super.emit.bind(this);
  connect() {
    this.disconnected = false;
    this.receive('connect');
  }
  disconnect() { this.disconnected = true; }
}

let socket: VoiceSocket;
let driver: BackendWhisperDriver;

beforeEach(() => {
  vi.useFakeTimers();
  socket = new VoiceSocket();
  connect.mockReturnValue(socket);
  driver = new BackendWhisperDriver();
});

afterEach(async () => {
  await driver.cancel();
  vi.useRealTimers();
});

async function start() {
  const started = driver.start();
  socket.receive('voice:ready');
  await started;
}

function deferredChunk() {
  let release!: (value: ArrayBuffer) => void;
  const pending = new Promise<ArrayBuffer>((resolve) => { release = resolve; });
  return { blob: { arrayBuffer: () => pending } as Blob, release };
}

it('sends deferred audio in source order and finishes the stream after the final chunk', async () => {
  await start();
  const first = deferredChunk();
  const a = Uint8Array.of(1).buffer;
  const b = Uint8Array.of(2).buffer;
  driver.pushChunk(first.blob);
  driver.pushChunk({ arrayBuffer: async () => b } as Blob);
  const stopped = driver.stop();
  await vi.advanceTimersByTimeAsync(0);
  expect(socket.emit.mock.calls).toEqual([['voice:start', {}]]);
  first.release(a);
  await vi.advanceTimersByTimeAsync(0);
  expect(socket.emit.mock.calls.slice(1)).toEqual([['voice:chunk', a], ['voice:chunk', b], ['voice:stop', {}]]);
  socket.receive('voice:partial', { text: 'final', isFinal: true });
  await stopped;
});

it('drops delayed audio and results after cancellation during stop', async () => {
  await start();
  const chunk = deferredChunk();
  const output = vi.fn();
  driver.onPartial(output);
  driver.pushChunk(chunk.blob);
  await vi.advanceTimersByTimeAsync(0);
  const stopped = driver.stop();
  await driver.cancel();
  await stopped;
  chunk.release(Uint8Array.of(1).buffer);
  await vi.advanceTimersByTimeAsync(0);
  socket.receive('voice:partial', { text: 'late', isFinal: true });
  expect(output).not.toHaveBeenCalled();
  expect(socket.emit.mock.calls.slice(1)).toEqual([['voice:cancel', {}]]);
});

it('rejects loss or cancellation while waiting for worker assignment', async () => {
  const started = driver.start();
  socket.receive('disconnect');
  await expect(started).rejects.toThrow('Connection lost');
  socket = new VoiceSocket();
  connect.mockReturnValue(socket);
  const next = driver.start();
  await driver.cancel();
  await expect(next).rejects.toBeInstanceOf(VoiceCancelledError);
});

it('reports an error during stop separately from an empty final result', async () => {
  await start();
  const output = vi.fn();
  const failure = vi.fn();
  driver.onPartial(output);
  driver.onError(failure);
  const stopped = driver.stop();
  socket.receive('voice:error', { message: 'Voice worker failed' });
  await stopped;
  expect(failure).toHaveBeenCalledWith(new Error('Voice worker failed'));
  expect(output).not.toHaveBeenCalled();
});
