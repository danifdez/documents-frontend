// @vitest-environment node
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ spawn: vi.fn() }));
vi.mock('node:child_process', () => ({ spawn: mock.spawn }));
import { decodeAudio, DECODE_LIMITS } from '@/main/voice/decodeAudio';
let child: EventEmitter & { stdout: PassThrough; stdin: PassThrough; kill: ReturnType<typeof vi.fn> };
beforeEach(() => {
  vi.useFakeTimers(); child = Object.assign(new EventEmitter(), { stdout: new PassThrough(), stdin: new PassThrough(), kill: vi.fn(() => { queueMicrotask(() => child.emit('close', null)); return true; }) });
  mock.spawn.mockReset().mockReturnValue(child);
});
afterEach(() => vi.useRealTimers());
describe('bounded local voice decoder', () => {
  it('uses pipe-only permitted formats, clean environment and bounded diagnostics', async () => {
    const decoded = decodeAudio('/fixed/ffmpeg', Buffer.from([1]), new AbortController().signal);
    const [, args, options] = mock.spawn.mock.calls[0];
    expect(args).toContain('-nostdin'); expect(args[args.indexOf('-protocol_whitelist') + 1]).toBe('pipe');
    expect(args[args.indexOf('-format_whitelist') + 1]).toBe('wav,matroska,webm,ogg');
    expect(options).toMatchObject({ env: { LANG: 'C' }, stdio: ['pipe', 'pipe', 'ignore'] });
    child.stdout.emit('data', Buffer.from([0, 64])); child.emit('close', 0);
    expect(await decoded).toEqual(new Float32Array([.5]));
  });
  it.each(['timeout', 'cancel', 'overflow'])('kills and waits for child close on %s', async (reason) => {
    const abort = new AbortController(); const pending = decodeAudio('/fixed/ffmpeg', Buffer.from([1]), abort.signal);
    const rejection = expect(pending).rejects.toThrow('decoding failed');
    if (reason === 'cancel') abort.abort();
    else if (reason === 'timeout') await vi.advanceTimersByTimeAsync(DECODE_LIMITS.timeoutMs);
    else child.stdout.emit('data', Buffer.alloc(DECODE_LIMITS.bytes + 1));
    await vi.advanceTimersByTimeAsync(0); await rejection; expect(child.kill).toHaveBeenCalledWith('SIGKILL');
  });
  it('rejects an aborted request without starting a process', async () => {
    const abort = new AbortController(); abort.abort();
    await expect(decodeAudio('/fixed/ffmpeg', Buffer.from([1]), abort.signal)).rejects.toThrow('cancelled');
    expect(mock.spawn).not.toHaveBeenCalled();
  });
  it('rejects empty, truncated and unsuccessful output without exposing diagnostics', async () => {
    for (const [code, bytes] of [[0, 0], [0, 1], [1, 2]]) {
      const pending = decodeAudio('/fixed/ffmpeg', Buffer.from([1]), new AbortController().signal);
      const rejected = expect(pending).rejects.toThrow('Local voice decoding failed');
      child.stdout.emit('data', Buffer.alloc(bytes)); child.emit('close', code); await rejected;
    }
  });
});
