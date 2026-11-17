// @vitest-environment node
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('electron', () => ({ app: { getPath: () => { throw new Error('Personal profiles are forbidden'); } } }));
import { LocalCaptureStore, CAPTURE_LIMITS, captureHash } from '@/main/voice/captureStore';
import type { LocalCaptureOptions } from '@/types/voice';
let root: string; let store: LocalCaptureStore; let options: LocalCaptureOptions;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'local-voice-capture-'));
  store = new LocalCaptureStore(() => root);
  options = { requestId: randomUUID(), consent: 'granted', purpose: 'evaluation', mediaType: 'audio/wav' };
});
afterEach(async () => { vi.restoreAllMocks(); await fs.rm(root, { recursive: true, force: true }); });
describe('private durable local voice capture', () => {
  it('persists exact input once and recovers without modifying files', async () => {
    const { writer } = await store.open(options, { expectedModel: { available: false } });
    const audio = Buffer.from('Synthetic fixture');
    expect(await writer!.input(1, audio)).toBe(true); expect(await writer!.input(1, audio)).toBe(false);
    await writer!.close('cancelled', 'test_cancel'); await writer!.close('cancelled', 'test_cancel');
    const first = await store.read(options.requestId); const journal = await fs.readFile(path.join(root, options.requestId, 'events.jsonl'));
    const recovered = new LocalCaptureStore(() => root);
    for (let i = 0; i < 3; i++) expect(await recovered.read(options.requestId)).toEqual(first);
    expect(await recovered.open(options, {})).toMatchObject({ claimed: false, status: 'cancelled' });
    expect(await fs.readFile(path.join(root, options.requestId, 'events.jsonl'))).toEqual(journal);
    expect(first.events.map((event) => event.eventType)).toEqual(['session.accepted', 'source.observed', 'session.closed']);
    expect(Buffer.from(first.artifacts['1'].base64, 'base64')).toEqual(audio);
    expect(first.artifacts['1'].sha256).toBe(captureHash(audio));
    expect((await fs.stat(path.join(root, options.requestId))).mode & 0o777).toBe(0o700);
    expect((await fs.stat(path.join(root, options.requestId, 'events.jsonl'))).mode & 0o777).toBe(0o600);
    expect((await fs.stat(path.join(root, options.requestId, 'input-1.bin'))).mode & 0o777).toBe(0o600);
    expect(JSON.stringify(first)).not.toContain(root);
  });
  it('refuses absent/forged consent and never creates a record', async () => {
    await expect(store.open({ ...options, consent: 'denied' as never }, {})).rejects.toThrow('consent');
    await expect(store.open({ ...options, purpose: 'debug' as never }, {})).rejects.toThrow('consent');
    expect(await fs.readdir(root)).toEqual([]);
  });
  it('does not reopen incomplete captures after restart or invent a terminal result', async () => {
    const { writer } = await store.open(options, {}); await writer!.input(1, Buffer.from([1]));
    await writer!.event('call.started', { index: 1, final: true, nativeRequested: true, input: { sha256: captureHash(Buffer.from([1])), bytes: 1, chunks: 1 } });
    const recovered = new LocalCaptureStore(() => root);
    expect(await recovered.open(options, {})).toMatchObject({ claimed: false, status: 'interrupted' });
    const snapshot = await recovered.read(options.requestId);
    expect(snapshot.missing).toContain('capture.terminal_unconfirmed'); expect(snapshot.missing).toContain('call.1.finish');
    expect(snapshot.events.some((event) => event.eventType === 'call.completed')).toBe(false);
  });
  it('recovers only verified whole lines from a torn last append', async () => {
    const { writer } = await store.open(options, {}); await writer!.input(1, Buffer.from([1]));
    await fs.appendFile(path.join(root, options.requestId, 'events.jsonl'), '{"partial":');
    const before = await fs.readFile(path.join(root, options.requestId, 'events.jsonl'));
    const snapshot = await new LocalCaptureStore(() => root).read(options.requestId);
    expect(snapshot.status).toBe('interrupted'); expect(snapshot.missing).toContain('capture.torn_tail');
    expect(snapshot.events).toHaveLength(2); expect(await fs.readFile(path.join(root, options.requestId, 'events.jsonl'))).toEqual(before);
  });
  it.each(['audio', 'event', 'symlink', 'hardlink'])('rejects changed or aliased %s evidence', async (kind) => {
    const { writer } = await store.open(options, {}); await writer!.input(1, Buffer.from([1])); await writer!.close('cancelled', 'test');
    const dir = path.join(root, options.requestId); const audio = path.join(dir, 'input-1.bin');
    if (kind === 'audio') await fs.writeFile(audio, Buffer.from([2]));
    if (kind === 'event') {
      const file = path.join(dir, 'events.jsonl'); const content = (await fs.readFile(file, 'utf8')).replace('session.closed', 'session.forged'); await fs.writeFile(file, content);
    }
    if (kind === 'symlink' || kind === 'hardlink') {
      const other = path.join(root, 'other.bin'); await fs.writeFile(other, Buffer.from([1]), { mode: 0o600 }); await fs.unlink(audio);
      if (kind === 'symlink') await fs.symlink(other, audio); else await fs.link(other, audio);
    }
    await expect(store.read(options.requestId)).rejects.toThrow();
  });
  it('rejects input gaps/conflicts and never modifies a previously accepted body', async () => {
    const { writer } = await store.open(options, {}); await writer!.input(1, Buffer.from([1]));
    await expect(writer!.input(1, Buffer.from([2]))).rejects.toThrow('conflict');
    expect(await fs.readFile(path.join(root, options.requestId, 'input-1.bin'))).toEqual(Buffer.from([1]));
    const next = { ...options, requestId: randomUUID() }; const other = await store.open(next, {});
    await expect(other.writer!.input(2, Buffer.from([1]))).rejects.toThrow('order');
    expect(await fs.readdir(path.join(root, next.requestId))).toEqual(['events.jsonl']);
  });
  it('refuses to append after terminal or change the immutable grant', async () => {
    const { writer } = await store.open(options, {}); await writer!.close('cancelled', 'test');
    await expect(writer!.event('call.started', {})).rejects.toThrow('unconfirmed');
    await expect(store.open({ ...options, mediaType: 'audio/ogg' }, {})).rejects.toThrow('conflicts');
  });
  it('rejects path traversal, nonprivate roots and record-directory symlinks', async () => {
    await expect(store.read('../other')).rejects.toThrow('ID');
    await fs.chmod(root, 0o755); await expect(store.open(options, {})).rejects.toThrow('private'); await fs.chmod(root, 0o700);
    await fs.symlink(root, path.join(root, options.requestId)); await expect(store.open(options, {})).rejects.toThrow();
  });
  it('stops appending if the private journal permissions are weakened', async () => {
    const { writer } = await store.open(options, {}); const file = path.join(root, options.requestId, 'events.jsonl');
    const before = await fs.readFile(file); await fs.chmod(file, 0o644);
    await expect(writer!.event('session.recording', {})).rejects.toThrow('changed');
    expect(await fs.readFile(file)).toEqual(before); await expect(store.read(options.requestId)).rejects.toThrow('file');
  });
  it('rejects an internally hashed call bound to audio that was never observed', async () => {
    const { writer } = await store.open(options, {}); await writer!.input(1, Buffer.from([1]));
    await writer!.event('call.started', { index: 1, final: true, nativeRequested: true,
      input: { sha256: captureHash(Buffer.from([2])), bytes: 1, chunks: 1 } });
    await expect(store.read(options.requestId)).rejects.toThrow('call input differs');
  });
  it('bounds retained audio and event size without purging or accepting excess bytes', async () => {
    const { writer } = await store.open(options, {}); const chunk = Buffer.alloc(256 * 1024);
    for (let index = 1; index <= CAPTURE_LIMITS.audioBytes / chunk.length; index++) await writer!.input(index, chunk);
    await expect(writer!.input(17, Buffer.from([1]))).rejects.toThrow('limit');
    const snapshot = await new LocalCaptureStore(() => root).read(options.requestId);
    expect(Object.keys(snapshot.artifacts)).toHaveLength(16); expect(snapshot.status).toBe('interrupted');
    await expect(fs.stat(path.join(root, options.requestId, 'input-17.bin'))).rejects.toMatchObject({ code: 'ENOENT' });
    const next = await store.open({ ...options, requestId: randomUUID() }, {});
    await expect(next.writer!.event('call.completed', { text: 'x'.repeat(CAPTURE_LIMITS.eventBytes) })).rejects.toThrow('limit');
  });
  it('enforces record quota without purging prior data', async () => {
    for (let i = 0; i < CAPTURE_LIMITS.records; i++) await fs.mkdir(path.join(root, randomUUID()), { mode: 0o700 });
    await expect(store.open(options, {})).rejects.toThrow('full'); expect(await fs.readdir(root)).toHaveLength(CAPTURE_LIMITS.records);
  });
});
