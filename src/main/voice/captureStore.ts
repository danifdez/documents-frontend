/** Opt-in local voice evidence. No paths or destinations are supplied by IPC. */
import { app } from 'electron';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import type { LocalCaptureOptions, LocalCaptureSnapshot, LocalCaptureEvent } from '../../types/voice';
import { ENGINE_IDENTITY_MISSING, validateEngineIdentity } from './runtimeIdentity';

export const CAPTURE_LIMITS = { audioBytes: 4 * 1024 * 1024, journalBytes: 16 * 1024 * 1024,
  eventBytes: 128 * 1024, events: 5000, records: 64 };
export const CAPTURE_MISSING = ['model.loaded_instance_identity', 'engine.native_binary_identity',
  'engine.effective_generation_defaults', 'code.runtime_fingerprints', 'renderer.delivery_ack', 'editor.effects'];
export function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]])) : item);
}
export const captureHash = (value: Buffer | string): string => 'sha256:' + createHash('sha256').update(value).digest('hex');
export function captureId(id: string): string {
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) throw new Error('Invalid local capture ID');
  return id;
}
async function directory(dir: string, create = false): Promise<void> {
  if (create) await fsp.mkdir(dir, { recursive: true, mode: 0o700 });
  const stat = await fsp.lstat(dir);
  if (!stat.isDirectory() || stat.isSymbolicLink() ||
      (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)) throw new Error('Local capture storage is not private');
}
async function readPrivate(file: string, limit: number): Promise<Buffer> {
  const stat = await fsp.lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > limit ||
      (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)) throw new Error('Invalid local capture file');
  const handle = await fsp.open(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    const opened = await handle.stat();
    if (opened.ino !== stat.ino || opened.dev !== stat.dev || opened.nlink !== 1 || !opened.isFile()) throw new Error('Local capture file changed');
    const bytes = Buffer.alloc(stat.size);
    let offset = 0;
    while (offset < bytes.length) {
      const read = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (!read.bytesRead) throw new Error('Local capture file was truncated');
      offset += read.bytesRead;
    }
    return bytes;
  } finally { await handle.close(); }
}
async function syncDirectory(dir: string): Promise<void> {
  if (process.platform === 'win32') return;
  const handle = await fsp.open(dir, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
  try { await handle.sync(); } finally { await handle.close(); }
}
async function writePrivate(file: string, body: Buffer): Promise<void> {
  const handle = await fsp.open(file, 'wx', 0o600);
  try { await handle.writeFile(body); await handle.sync(); } finally { await handle.close(); }
  await syncDirectory(path.dirname(file));
}

export class CaptureWriter {
  private events: LocalCaptureEvent[] = [];
  private bytes = 0;
  private inputBytes = 0;
  private inputs: { hash: string; size: number }[] = [];
  private tail = Promise.resolve();
  failed = false;
  private closed = false;
  private closing?: Promise<void>;
  constructor(readonly options: LocalCaptureOptions, private readonly dir: string, private readonly finished: () => void) {}
  private queue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.tail.then(async () => { if (this.failed || this.closed) throw new Error('Local capture is unconfirmed'); return operation(); });
    this.tail = next.then((): undefined => undefined, () => { this.failed = true; this.finished(); });
    return next;
  }
  private async append(eventType: string, payload: Record<string, unknown>): Promise<void> {
    const base = { sequence: this.events.length + 1, occurredAt: new Date().toISOString(), eventType, payload,
      previousHash: this.events.at(-1)?.contentHash ?? null };
    const event: LocalCaptureEvent = { ...base, contentHash: captureHash(canonical(base)) };
    const bytes = Buffer.from(canonical(event) + '\n');
    if (bytes.length > CAPTURE_LIMITS.eventBytes || this.bytes + bytes.length > CAPTURE_LIMITS.journalBytes || this.events.length >= CAPTURE_LIMITS.events) throw new Error('Local capture limit exceeded');
    const file = path.join(this.dir, 'events.jsonl');
    const handle = await fsp.open(file, fs.constants.O_WRONLY | fs.constants.O_APPEND | fs.constants.O_NOFOLLOW);
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.nlink !== 1 || stat.size !== this.bytes ||
          (process.platform !== 'win32' && (stat.mode & 0o077) !== 0)) throw new Error('Local capture journal changed');
      await handle.writeFile(bytes); await handle.sync();
      this.bytes += bytes.length; this.events.push(event);
    } finally { await handle.close(); }
  }
  event(type: string, payload: Record<string, unknown>): Promise<void> { return this.queue(() => this.append(type, payload)); }
  input(sequence: number, body: Buffer): Promise<boolean> {
    return this.queue(async () => {
      const hash = captureHash(body); const previous = this.inputs[sequence - 1];
      if (previous) {
        if (previous.hash !== hash || previous.size !== body.length) throw new Error('Local capture input conflict');
        return false;
      }
      if (!Number.isSafeInteger(sequence) || sequence !== this.inputs.length + 1 || sequence > 4096 ||
          !body.length || body.length > 256 * 1024 || this.inputBytes + body.length > CAPTURE_LIMITS.audioBytes) throw new Error('Local capture input limit or order exceeded');
      await writePrivate(path.join(this.dir, `input-${sequence}.bin`), body);
      await this.append('source.observed', { sequence, sha256: hash, size: body.length,
        totalBytes: this.inputBytes + body.length, delivery: 'captured_before_processing' });
      this.inputs.push({ hash, size: body.length }); this.inputBytes += body.length;
      return true;
    });
  }
  close(status: 'completed' | 'cancelled' | 'failed', reason: string): Promise<void> {
    if (this.closing) return this.closing;
    this.closing = this.queue(async () => {
      if (this.events.some((event) => event.eventType === 'session.closed')) return;
      await this.append('session.closed', { status, reason }); this.closed = true; this.finished();
    });
    return this.closing;
  }
}

export class LocalCaptureStore {
  private live = new Set<string>();
  constructor(private readonly root: () => string) {}
  async open(options: LocalCaptureOptions, identity: Record<string, unknown>): Promise<{ claimed: boolean; writer?: CaptureWriter; status: LocalCaptureSnapshot['status'] }> {
    if (options.consent !== 'granted' || options.purpose !== 'evaluation' || !['audio/wav', 'audio/webm', 'audio/webm;codecs=opus', 'audio/ogg', 'audio/ogg;codecs=opus'].includes(options.mediaType)) throw new Error('Local capture consent required');
    if (options.requestHash !== undefined && !/^sha256:[0-9a-f]{64}$/.test(options.requestHash)) throw new Error('Invalid capture request hash');
    const id = captureId(options.requestId);
    await directory(this.root(), true);
    const dir = path.join(this.root(), id);
    try { await fsp.lstat(dir); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const names = await fsp.readdir(this.root());
    if (!names.includes(id) && names.filter((name) => /^[0-9a-f-]{36}$/.test(name)).length >= CAPTURE_LIMITS.records) throw new Error('Local capture storage is full');
    try { await fsp.mkdir(dir, { mode: 0o700 }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const capture = await this.read(id);
      if (canonical(capture.capture) !== canonical(options)) throw new Error('Local capture identity conflicts');
      return { claimed: false, status: capture.status };
    }
    await syncDirectory(this.root());
    await writePrivate(path.join(dir, 'events.jsonl'), Buffer.alloc(0));
    this.live.add(id);
    const writer = new CaptureWriter(options, dir, () => this.live.delete(id));
    await writer.event('session.accepted', { capture: options, identity, missing: CAPTURE_MISSING });
    return { claimed: true, writer, status: 'running' };
  }
  async lookup(requestId: string): Promise<LocalCaptureSnapshot | null> {
    const id = captureId(requestId);
    for (const dir of [this.root(), path.join(this.root(), id)]) {
      try { await directory(dir); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
    }
    return this.read(id);
  }
  async read(requestId: string): Promise<LocalCaptureSnapshot> {
    const id = captureId(requestId); await directory(this.root());
    const dir = path.join(this.root(), id); await directory(dir);
    const raw = await readPrivate(path.join(dir, 'events.jsonl'), CAPTURE_LIMITS.journalBytes);
    const lines = raw.toString('utf8').split('\n'); const torn = lines.pop() !== '';
    const events: LocalCaptureEvent[] = []; let previous: string | null = null;
    for (const line of lines) {
      if (Buffer.byteLength(line) > CAPTURE_LIMITS.eventBytes || events.length >= CAPTURE_LIMITS.events) throw new Error('Local capture event limit exceeded');
      const event = JSON.parse(line) as LocalCaptureEvent;
      const { contentHash, ...base } = event;
      if (typeof event.eventType !== 'string' || !event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload) ||
          typeof event.occurredAt !== 'string' || !Number.isFinite(Date.parse(event.occurredAt)) || event.sequence !== events.length + 1 || event.previousHash !== previous || captureHash(canonical(base)) !== contentHash) throw new Error('Local capture integrity differs');
      events.push(event); previous = contentHash;
    }
    const capture = events[0]?.payload.capture as LocalCaptureOptions | undefined;
    if (events[0]?.eventType !== 'session.accepted' || capture?.requestId !== id || capture.consent !== 'granted' || capture.purpose !== 'evaluation') throw new Error('Local capture authorization is unconfirmed');
    const artifacts: LocalCaptureSnapshot['artifacts'] = {};
    let bytes = 0; let count = 0;
    for (const event of events.filter((item) => item.eventType === 'source.observed')) {
      const value = event.payload;
      if (value.sequence !== ++count || count > 4096 || typeof value.size !== 'number' || value.size > 256 * 1024) throw new Error('Local capture input order differs');
      const body = await readPrivate(path.join(dir, `input-${count}.bin`), 256 * 1024);
      bytes += body.length;
      if (!body.length || body.length !== value.size || captureHash(body) !== value.sha256 || bytes !== value.totalBytes || bytes > CAPTURE_LIMITS.audioBytes) throw new Error('Local capture audio differs');
      artifacts[String(count)] = { sha256: String(value.sha256), size: body.length, base64: body.toString('base64') };
    }
    const calls = new Map<number, { final: boolean; completed?: string; sent?: boolean }>();
    const observed: Buffer[] = [];
    for (const event of events) {
      const value = event.payload;
      if (event.eventType === 'source.observed') observed.push(Buffer.from(artifacts[String(value.sequence)].base64, 'base64'));
      if (event.eventType === 'call.started') {
        const input = value.input as Record<string, unknown> | undefined;
        const audio = Buffer.concat(observed);
        if (value.index !== calls.size + 1 || calls.size >= 128 || typeof value.final !== 'boolean' ||
            value.nativeRequested !== (audio.length > 0) || input?.sha256 !== captureHash(audio) ||
            input.bytes !== audio.length || input.chunks !== observed.length) throw new Error('Local capture call input differs');
        calls.set(value.index as number, { final: value.final });
      }
      if (event.eventType === 'call.completed') {
        const call = calls.get(value.index as number);
        if (!call || call.completed !== undefined || call.final !== value.final || typeof value.text !== 'string' ||
            Buffer.byteLength(value.text) > 16 * 1024) throw new Error('Local capture call result differs');
        call.completed = value.text;
      }
      if (event.eventType === 'output.sent') {
        const call = calls.get(value.index as number);
        if (!call || call.completed === undefined || call.sent || call.final !== value.final ||
            value.textSha256 !== captureHash(call.completed)) throw new Error('Local capture output differs');
        call.sent = true;
      }
    }
    const closed = events.filter((event) => event.eventType === 'session.closed');
    if (closed.length > 1 || (closed.length && events.at(-1) !== closed[0])) throw new Error('Local capture terminal order differs');
    const status = closed[0]?.payload.status;
    if (status !== undefined && !['completed', 'cancelled', 'failed'].includes(String(status))) throw new Error('Invalid local capture state');
    if (status === 'completed' && ![...calls.values()].some((call) => call.final && call.sent)) throw new Error('Local capture final is unconfirmed');
    const identities = events.filter((event) => event.eventType === 'engine.observed');
    if (identities.length > 1 || (identities.length && identities[0].sequence !== 2)) throw new Error('Local capture engine identity order differs');
    if (identities.length) validateEngineIdentity(identities[0].payload);
    const missing = identities.length ? [...CAPTURE_MISSING.filter((item) => item !== 'engine.native_binary_identity'), ...ENGINE_IDENTITY_MISSING] : [...CAPTURE_MISSING];
    if (torn) missing.push('capture.torn_tail');
    if (!closed.length) missing.push('capture.terminal_unconfirmed');
    const started = events.filter((event) => event.eventType === 'call.started');
    for (const event of started) if (!events.some((end) => end.eventType === 'call.completed' && end.payload.index === event.payload.index)) missing.push(`call.${String(event.payload.index)}.finish`);
    const snapshot: LocalCaptureSnapshot = { schemaVersion: 'voice-local-capture/1', requestId: id, capture,
      status: torn ? 'interrupted' : status as LocalCaptureSnapshot['status'] ?? (this.live.has(id) ? 'running' : 'interrupted'),
      events, artifacts, missing };
    snapshot.manifestHash = captureHash(canonical(snapshot));
    return snapshot;
  }
}
export const localCaptureStore = new LocalCaptureStore(() => path.join(app.getPath('userData'), 'evaluation', 'voice'));
