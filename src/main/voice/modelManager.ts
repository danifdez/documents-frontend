/** Verified, bounded preparation of the existing local Whisper model. */
import { app } from 'electron';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import * as https from 'node:https';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { LocalModelProgress } from './types';

// Upstream LFS metadata: https://huggingface.co/ggerganov/whisper.cpp/blob/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-base-q8_0.bin
export const MODEL_MANIFEST = {
  name: 'whisper-base.ggml',
  revision: '5359861c739e955e79d9a303bcbc70fb988958b1',
  url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-base-q8_0.bin',
  sha256: 'c577b9a86e7e048a0b7eada054f4dd79a56bbfa911fbdacf900ac5b567cbb7d9',
  sizeBytes: 81768585,
} as const;
export const MODEL_DOWNLOAD_LIMITS = { idleMs: 15000, totalMs: 300000, redirects: 4 };
interface ModelManifest { name: string; url: string; sha256: string; sizeBytes: number }
const DOWNLOAD_HOSTS = new Set(['huggingface.co', 'us.aws.cdn.hf.co']);
function signature(stat: fs.BigIntStats): string {
  return [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs, stat.nlink].join(':');
}
function downloadUrl(value: string, base?: URL): URL {
  const url = new URL(value, base);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash ||
      (url.port && url.port !== '443') || !DOWNLOAD_HOSTS.has(url.hostname)) {
    throw new Error('Local voice model download destination rejected');
  }
  return url;
}

/** A testable instance; production paths and manifests never come from IPC data. */
export class ModelManager {
  private pending?: Promise<void>;
  private verified?: { file: string; signature: string };
  constructor(private readonly directory: () => string,
    private readonly manifest: ModelManifest = MODEL_MANIFEST,
    private readonly get: typeof https.get = https.get) {
    if (path.basename(manifest.name) !== manifest.name || ['.', '..'].includes(manifest.name) || !/^[0-9a-f]{64}$/.test(manifest.sha256) ||
        !Number.isSafeInteger(manifest.sizeBytes) || manifest.sizeBytes <= 0) throw new Error('Invalid local voice model manifest');
    downloadUrl(manifest.url);
  }
  modelPath(): string { return path.join(this.directory(), this.manifest.name); }

  private async directoryReady(): Promise<boolean> {
    const stat = await fsp.lstat(this.directory());
    return stat.isDirectory() && !stat.isSymbolicLink();
  }
  private async verify(file: string): Promise<boolean> {
    if (!(await this.directoryReady())) return false;
    const first = await fsp.lstat(file, { bigint: true });
    if (!first.isFile() || first.isSymbolicLink() || first.nlink !== 1n || first.size !== BigInt(this.manifest.sizeBytes)) return false;
    const handle = await fsp.open(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    try {
      const before = await handle.stat({ bigint: true });
      if (!before.isFile() || before.nlink !== 1n || signature(before) !== signature(first)) return false;
      const cached = this.verified;
      if (!cached || cached.file !== file || cached.signature !== signature(before)) {
        const hash = createHash('sha256');
        let bytes = 0;
        for await (const chunk of handle.createReadStream({ autoClose: false, end: this.manifest.sizeBytes })) {
          bytes += chunk.length;
          if (bytes > this.manifest.sizeBytes) return false;
          hash.update(chunk);
        }
        if (bytes !== this.manifest.sizeBytes || hash.digest('hex') !== this.manifest.sha256) return false;
      }
      const after = await handle.stat({ bigint: true });
      const current = await fsp.lstat(file, { bigint: true });
      if (current.isSymbolicLink() || signature(before) !== signature(after) || signature(after) !== signature(current)) return false;
      this.verified = { file, signature: signature(after) };
      return true;
    } finally { await handle.close(); }
  }
  async isReady(): Promise<boolean> {
    try { return await this.verify(this.modelPath()); } catch { return false; }
  }
  ensure(progress?: (value: LocalModelProgress) => void): Promise<void> {
    if (this.pending) return this.pending;
    const pending = this.prepare(progress).catch(() => { throw new Error('Local voice model could not be prepared'); });
    this.pending = pending;
    void pending.finally(() => { if (this.pending === pending) this.pending = undefined; }).catch((): undefined => undefined);
    return pending;
  }
  private async prepare(progress?: (value: LocalModelProgress) => void): Promise<void> {
    if (await this.isReady()) return;
    await fsp.mkdir(this.directory(), { recursive: true, mode: 0o700 });
    if (!(await this.directoryReady())) throw new Error('Invalid local voice model directory');
    // Preserve existing invalid/unverified files; downloading never overwrites them.
    try { await fsp.lstat(this.modelPath()); throw new Error('Existing local voice model failed verification'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const temporary = await fsp.mkdtemp(path.join(this.directory(), '.download-'));
    const file = path.join(temporary, 'model.part');
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), MODEL_DOWNLOAD_LIMITS.totalMs);
    try {
      await this.download(downloadUrl(this.manifest.url), file, abort.signal, progress);
      if (!(await this.verify(file)) || abort.signal.aborted) throw new Error('Local voice model failed verification');
      try {
        // No-clobber publication on the same filesystem. The temporary link is
        // removed before normal readers accept the file (which must have nlink 1).
        await fsp.link(file, this.modelPath());
        await fsp.unlink(file);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || !(await this.isReady())) throw error;
      }
      if (!(await this.isReady())) throw new Error('Local voice model publication failed verification');
    } finally {
      clearTimeout(timer);
      abort.abort();
      await fsp.rm(temporary, { recursive: true, force: true });
    }
  }
  private async download(initial: URL, file: string, signal: AbortSignal,
    progress?: (value: LocalModelProgress) => void): Promise<void> {
    let url = initial;
    for (let redirect = 0; ; redirect++) {
      const response = await new Promise<import('node:http').IncomingMessage>((resolve, reject) => {
        const request = this.get(url, { agent: false, signal, rejectUnauthorized: true,
          headers: { Accept: 'application/octet-stream', 'Accept-Encoding': 'identity' } }, resolve);
        request.setTimeout(MODEL_DOWNLOAD_LIMITS.idleMs, () => request.destroy(new Error('Local voice model download timed out')));
        request.on('error', reject);
      });
      if ([301, 302, 303, 307, 308].includes(response.statusCode!)) {
        const location = response.headers.location;
        response.destroy();
        if (!location || redirect >= MODEL_DOWNLOAD_LIMITS.redirects) throw new Error('Local voice model redirect limit exceeded');
        url = downloadUrl(location, url);
        continue;
      }
      const declared = response.headers['content-length'];
      if (response.statusCode !== 200 ||
          (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity') ||
          (declared !== undefined && (!/^\d+$/.test(declared) || Number(declared) !== this.manifest.sizeBytes))) {
        response.destroy();
        throw new Error('Invalid local voice model response');
      }
      let received = 0;
      const expected = this.manifest.sizeBytes;
      const meter = new Transform({ transform(chunk: Buffer, _encoding, callback) {
        received += chunk.length;
        if (received > expected) { callback(new Error('Local voice model download size exceeded')); return; }
        try { progress?.({ downloaded: received, total: expected, percent: Math.floor(received / expected * 100) }); }
        catch { /* A closed progress recipient must not alter file verification. */ }
        callback(null, chunk);
      } });
      await pipeline(response, meter, fs.createWriteStream(file, { flags: 'wx', mode: 0o600 }), { signal });
      if (received !== expected) throw new Error('Incomplete local voice model download');
      return;
    }
  }
}
const manager = new ModelManager(() => path.join(app.getPath('userData'), 'voice-models'));
export const modelPath = (): string => manager.modelPath();
export const isModelReady = (): Promise<boolean> => manager.isReady();
export const ensureModelDownloaded = (progress?: (p: LocalModelProgress) => void): Promise<void> => manager.ensure(progress);
