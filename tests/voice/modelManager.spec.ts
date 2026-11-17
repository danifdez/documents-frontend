// @vitest-environment node
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { writeFileSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { PassThrough } from 'node:stream';
import type { IncomingMessage, ClientRequest } from 'node:http';
import type { get } from 'node:https';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('electron', () => ({ app: { getPath: () => { throw new Error('Personal profiles must not be accessed'); } } }));
import { ModelManager, MODEL_MANIFEST, MODEL_DOWNLOAD_LIMITS } from '@/main/voice/modelManager';
const body = Buffer.from('small verified test weights');
const manifest = { name: 'fixture.ggml', url: 'https://huggingface.co/fixture/resolve/revision/file', sizeBytes: body.length,
  sha256: createHash('sha256').update(body).digest('hex') };
interface Reply { status?: number; headers?: Record<string, string>; body?: Buffer; hang?: boolean; fail?: boolean; stall?: boolean }
let directory: string;
let replies: Reply[];
let requests: { url: URL; options: Record<string, unknown>; idle?: () => void }[];
let manager: ModelManager;
let requested: () => void;
let requestReady: Promise<void>;
function transport(url: URL, options: Record<string, unknown>, callback: (r: IncomingMessage) => void): ClientRequest {
  const request = new EventEmitter() as EventEmitter & { setTimeout: ReturnType<typeof vi.fn>; destroy(error: Error): void };
  const entry = { url, options, idle: undefined as (() => void) | undefined }; requests.push(entry); requested();
  let response: PassThrough | undefined;
  const destroy = (error: Error) => { response?.destroy(error); request.emit('error', error); };
  request.setTimeout = vi.fn((_ms: number, idle: () => void) => { entry.idle = idle; return request; });
  request.destroy = destroy;
  const abort = options.signal as AbortSignal;
  abort.addEventListener('abort', () => destroy(new Error('aborted')), { once: true });
  queueMicrotask(() => {
    const reply = replies.shift();
    if (!reply) { destroy(new Error('Unexpected request')); return; }
    if (reply.hang) return;
    response = new PassThrough(); response.on('error', () => undefined);
    Object.assign(response, { statusCode: reply.status ?? 200, headers: reply.headers ?? {} });
    callback(response as unknown as IncomingMessage);
    if (reply.stall) { response.write(body.subarray(0, 3)); return; }
    if (reply.fail) response.destroy(new Error('PRIVATE_NETWORK_DIAGNOSTIC'));
    else if (!(reply.status && reply.status >= 300 && reply.status < 400)) response.end(reply.body ?? body);
  });
  return request as unknown as ClientRequest;
}
beforeEach(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'voice-model-simulated-'));
  replies = []; requests = [];
  requestReady = new Promise<void>((resolve) => { requested = resolve; });
  manager = new ModelManager(() => directory, manifest, transport as unknown as typeof get);
});
afterEach(async () => { vi.useRealTimers(); await fs.rm(directory, { recursive: true, force: true }); });
async function remaining() { return (await fs.readdir(directory)).sort(); }

describe('verified local model preparation', () => {
  it('pins the existing upstream artifact by revision, size and digest', () => {
    expect(MODEL_MANIFEST.url).toContain('/resolve/' + MODEL_MANIFEST.revision + '/ggml-base-q8_0.bin');
    expect(MODEL_MANIFEST.revision).toMatch(/^[0-9a-f]{40}$/); expect(MODEL_MANIFEST.sha256).toHaveLength(64);
    expect(MODEL_MANIFEST.sizeBytes).toBe(81768585);
  });
  it('accepts a valid existing file without network and detects same-size replacement', async () => {
    await fs.writeFile(manager.modelPath(), body);
    expect(await manager.isReady()).toBe(true); await manager.ensure(); expect(requests).toHaveLength(0);
    await fs.writeFile(manager.modelPath(), Buffer.alloc(body.length));
    expect(await manager.isReady()).toBe(false);
    await expect(manager.ensure()).rejects.toThrow('could not be prepared');
    expect(await fs.readFile(manager.modelPath())).toEqual(Buffer.alloc(body.length)); expect(requests).toHaveLength(0);
  });
  it.each(['symlink', 'hardlink', 'directory', 'empty'])('rejects an existing %s and preserves it', async (kind) => {
    const target = path.join(directory, 'source'); await fs.writeFile(target, body);
    if (kind === 'symlink') await fs.symlink(target, manager.modelPath());
    if (kind === 'hardlink') await fs.link(target, manager.modelPath());
    if (kind === 'directory') await fs.mkdir(manager.modelPath());
    if (kind === 'empty') await fs.writeFile(manager.modelPath(), '');
    expect(await manager.isReady()).toBe(false); const before = await fs.lstat(manager.modelPath());
    await expect(manager.ensure()).rejects.toThrow('could not be prepared');
    expect((await fs.lstat(manager.modelPath())).ino).toBe(before.ino); expect(await fs.readFile(target)).toEqual(body);
    expect(requests).toHaveLength(0);
  });
  it('does not follow a symlink used as the model directory', async () => {
    const link = path.join(directory, 'alias'); await fs.symlink(directory, link);
    const aliased = new ModelManager(() => link, manifest, transport as unknown as typeof get);
    expect(await aliased.isReady()).toBe(false); await expect(aliased.ensure()).rejects.toThrow('could not be prepared');
    expect(requests).toHaveLength(0); expect(await remaining()).toEqual(['alias']);
  });
  it('publishes one complete verified private file and shares concurrent preparation', async () => {
    replies.push({ headers: { 'content-length': String(body.length) } });
    const progress = vi.fn(); const first = manager.ensure(progress); const second = manager.ensure();
    expect(first).toBe(second); await first;
    expect(await manager.isReady()).toBe(true); expect(await remaining()).toEqual(['fixture.ggml']);
    const stat = await fs.stat(manager.modelPath()); expect(stat.mode & 0o777).toBe(0o600); expect(stat.nlink).toBe(1);
    expect(requests).toHaveLength(1); expect(requests[0].options).toMatchObject({ agent: false, rejectUnauthorized: true, headers: { Accept: 'application/octet-stream', 'Accept-Encoding': 'identity' } });
    expect(progress).toHaveBeenLastCalledWith({ downloaded: body.length, total: body.length, percent: 100 });
  });
  it('supports relative redirects and the observed HTTPS upstream CDN', async () => {
    replies.push({ status: 302, headers: { location: '/pinned-cache/file' } }, { status: 307, headers: { location: 'https://us.aws.cdn.hf.co/public-file?signed=fixture' } }, {});
    await manager.ensure(); expect(requests.map((r) => r.url.hostname)).toEqual(['huggingface.co', 'huggingface.co', 'us.aws.cdn.hf.co']);
    expect(await manager.isReady()).toBe(true);
  });
  it.each(['http://huggingface.co/file', 'https://127.0.0.1/file', 'https://huggingface.co.evil.test/file', 'https://user:secret@huggingface.co/file', 'https://huggingface.co:444/file', 'https://unapproved.test/file'])('rejects redirect %s before sending a request', async (location) => {
    replies.push({ status: 302, headers: { location } });
    await expect(manager.ensure()).rejects.toThrow('could not be prepared'); expect(requests).toHaveLength(1); expect(await remaining()).toEqual([]);
  });
  it('bounds redirect chains', async () => {
    replies.push(...Array.from({ length: 10 }, () => ({ status: 302, headers: { location: '/loop' } })));
    await expect(manager.ensure()).rejects.toThrow('could not be prepared');
    expect(requests).toHaveLength(MODEL_DOWNLOAD_LIMITS.redirects + 1); expect(await remaining()).toEqual([]);
  });
  it.each(['length', 'truncated', 'excess', 'digest', 'encoding', 'network', 'status'])('rejects %s without publishing or retaining partial files', async (kind) => {
    const reply: Reply = {};
    if (kind === 'length') reply.headers = { 'content-length': '123456789' };
    if (kind === 'truncated') reply.body = body.subarray(1);
    if (kind === 'excess') reply.body = Buffer.concat([body, Buffer.from([1])]);
    if (kind === 'digest') reply.body = Buffer.alloc(body.length);
    if (kind === 'encoding') reply.headers = { 'content-encoding': 'gzip' };
    if (kind === 'network') reply.fail = true;
    if (kind === 'status') reply.status = 404;
    replies.push(reply);
    await expect(manager.ensure()).rejects.toThrow('Local voice model could not be prepared');
    expect(await manager.isReady()).toBe(false); expect(await remaining()).toEqual([]);
    replies.push({}); await manager.ensure(); expect(await manager.isReady()).toBe(true);
  });
  it.each(['idle', 'total'])('terminates %s timeout and removes its private partial', async (kind) => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); replies.push({ hang: true });
    const pending = manager.ensure(); const rejected = expect(pending).rejects.toThrow('could not be prepared');
    await requestReady;
    expect(requests).toHaveLength(1);
    if (kind === 'idle') requests[0].idle!(); else await vi.advanceTimersByTimeAsync(MODEL_DOWNLOAD_LIMITS.totalMs);
    await rejected; expect(await remaining()).toEqual([]);
  });
  it('cleans an open private partial when the response stalls after receiving data', async () => {
    replies.push({ stall: true });
    let received!: () => void;
    const progress = new Promise<void>((resolve) => { received = resolve; });
    const pending = manager.ensure(() => received());
    const rejected = expect(pending).rejects.toThrow('could not be prepared');
    await progress;
    const temporary = (await remaining()).find((name) => name.startsWith('.download-'))!;
    expect((await fs.stat(path.join(directory, temporary))).mode & 0o777).toBe(0o700);
    requests[0].idle!(); await rejected;
    expect(await remaining()).toEqual([]);
  });
  it('preserves an unrelated partial and never overwrites a competing destination', async () => {
    await fs.writeFile(path.join(directory, 'fixture.ggml.part'), 'original partial');
    replies.push({});
    await expect(manager.ensure(() => { writeFileSync(manager.modelPath(), 'competing data'); })).rejects.toThrow('could not be prepared');
    expect(await fs.readFile(path.join(directory, 'fixture.ggml.part'), 'utf8')).toBe('original partial');
    expect(await fs.readFile(manager.modelPath(), 'utf8')).toBe('competing data');
    expect((await remaining()).some((name) => name.startsWith('.download-'))).toBe(false);
  });
});
