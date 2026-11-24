/** Main-process dependency selection and evidence; never accepts IPC paths. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { hasExactOwnKeys } from '../../utils/hasExactOwnKeys';

export interface BinaryIdentity { sha256: string; sizeBytes: number }
export interface VoiceEngineIdentity {
  adapter: { name: 'smart-whisper'; version: string; entry: BinaryIdentity };
  nativeBinary: BinaryIdentity;
  decoder: { source: 'bundled' | 'system'; binary: BinaryIdentity };
  runtime: { platform: string; arch: string; node: string; electron: string | null; modules: string | null };
  verification: 'module_load_and_file_checks';
}
export const ENGINE_IDENTITY_MISSING = ['engine.whisper_cpp_revision', 'engine.shared_library_identities'];
const MAX_BINARY_BYTES = 256 * 1024 * 1024;
function signature(stat: fs.BigIntStats): string {
  return [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs, stat.mode, stat.nlink, stat.uid, stat.gid].join(':');
}
function physicalPath(file: string): string {
  return file.replace(`.asar${path.sep}`, `.asar.unpacked${path.sep}`);
}

function verifySystemPath(file: string): void {
  // The filesystem root also identifies its owner inside a mapped UID namespace.
  const owner = fs.lstatSync(path.parse(file).root, { bigint: true }).uid;
  for (let current = file; ; current = path.dirname(current)) {
    const stat = fs.lstatSync(current, { bigint: true });
    if (stat.isSymbolicLink() || stat.uid !== owner || (stat.mode & 0o022n) !== 0n) {
      throw new Error('Untrusted local voice system dependency');
    }
    if (current === path.dirname(current)) return;
  }
}

/** Keep a digest bound to one regular file, and refuse replacement after selection. */
export class VerifiedRuntimeFile {
  readonly identity: BinaryIdentity;
  private readonly stamp: string;
  constructor(readonly file: string, executable = false, system = false) {
    const first = fs.lstatSync(file, { bigint: true });
    if (!first.isFile() || first.isSymbolicLink() || first.size <= 0n || first.size > BigInt(MAX_BINARY_BYTES) ||
        (process.platform !== 'win32' && (first.mode & 0o002n) !== 0n)) {
      throw new Error('Invalid local voice dependency');
    }
    if (system) verifySystemPath(file);
    if (executable) fs.accessSync(file, fs.constants.X_OK);
    const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    try {
      const before = fs.fstatSync(fd, { bigint: true });
      if (signature(before) !== signature(first)) throw new Error('Local voice dependency changed');
      const hash = createHash('sha256'); const chunk = Buffer.alloc(64 * 1024); let bytes = 0;
      for (;;) {
        const read = fs.readSync(fd, chunk, 0, chunk.length, null);
        if (!read) break;
        bytes += read;
        if (bytes > MAX_BINARY_BYTES) throw new Error('Local voice dependency limit exceeded');
        hash.update(chunk.subarray(0, read));
      }
      if (bytes !== Number(before.size) || signature(before) !== signature(fs.fstatSync(fd, { bigint: true }))) throw new Error('Local voice dependency changed');
      this.stamp = signature(before);
      this.identity = { sha256: 'sha256:' + hash.digest('hex'), sizeBytes: bytes };
      this.verify();
    } finally { fs.closeSync(fd); }
  }
  verify(): void {
    if (signature(fs.lstatSync(this.file, { bigint: true })) !== this.stamp) throw new Error('Local voice dependency changed');
  }
}

/** Ignore PATH and ffmpeg-static's ambient override; only installation paths qualify. */
export function resolveVoiceDecoder(packageFile: string): { source: 'bundled' | 'system'; file: VerifiedRuntimeFile } {
  const bundled = physicalPath(path.join(path.dirname(packageFile), process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'));
  let installed = true;
  try { fs.lstatSync(bundled); }
  catch (error) {
    // Invalid or changed installed binaries must not be hidden by a fallback.
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    installed = false;
  }
  if (installed) return { source: 'bundled', file: new VerifiedRuntimeFile(bundled, true) };
  if (process.platform === 'linux') return { source: 'system', file: new VerifiedRuntimeFile('/usr/bin/ffmpeg', true, true) };
  throw new Error('Local voice decoder is unavailable');
}

function runtimeRequire(): NodeJS.Require {
  return require;
}

export function loadVoiceBindings(require: NodeJS.Require = runtimeRequire()) {
  const manifestPath = require.resolve('smart-whisper/package.json');
  const entry = new VerifiedRuntimeFile(physicalPath(require.resolve('smart-whisper')));
  const manifest = new VerifiedRuntimeFile(physicalPath(manifestPath));
  const nativePath = path.join(path.dirname(manifestPath), 'build', 'Release', 'smart-whisper.node');
  const nativeBinary = new VerifiedRuntimeFile(physicalPath(nativePath));
  const decoder = resolveVoiceDecoder(require.resolve('ffmpeg-static/package.json'));
  // An already-loaded addon cannot be retrospectively attested from its current file.
  if (require.cache[nativePath]) throw new Error('Local voice module was loaded before verification');
  const sw = require('smart-whisper');
  const loaded = require.cache[nativePath];
  const parent = require.cache[require.resolve('smart-whisper')];
  if (typeof sw?.Whisper !== 'function' || !loaded || !parent?.children.includes(loaded)) throw new Error('Local voice native module is unconfirmed');
  const metadata = JSON.parse(fs.readFileSync(manifest.file, 'utf8'));
  if (metadata.name !== 'smart-whisper' || typeof metadata.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(metadata.version)) throw new Error('Invalid local voice adapter version');
  const files = [entry, manifest, nativeBinary, decoder.file];
  const verify = () => { for (const file of files) file.verify(); };
  verify();
  const identity: VoiceEngineIdentity = {
    adapter: { name: 'smart-whisper', version: metadata.version, entry: entry.identity },
    nativeBinary: nativeBinary.identity, decoder: { source: decoder.source, binary: decoder.file.identity },
    runtime: { platform: process.platform, arch: process.arch, node: process.versions.node,
      electron: process.versions.electron ?? null, modules: process.versions.modules ?? null },
    verification: 'module_load_and_file_checks',
  };
  return { Whisper: sw.Whisper, decoder: decoder.file.file, verify, identity: () => { verify(); return identity; } };
}

/** Validate the bounded evidence shape without exporting paths or environment variables. */
export function validateEngineIdentity(value: unknown): asserts value is VoiceEngineIdentity {
  const keys = hasExactOwnKeys;
  const binary = (item: unknown) => keys(item, ['sha256', 'sizeBytes']) && typeof item.sha256 === 'string' && /^sha256:[0-9a-f]{64}$/.test(item.sha256) &&
    Number.isSafeInteger(item.sizeBytes) && Number(item.sizeBytes) > 0 && Number(item.sizeBytes) <= MAX_BINARY_BYTES;
  if (!keys(value, ['adapter', 'nativeBinary', 'decoder', 'runtime', 'verification']) || value.verification !== 'module_load_and_file_checks' ||
      !keys(value.adapter, ['name', 'version', 'entry']) || value.adapter.name !== 'smart-whisper' || typeof value.adapter.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(value.adapter.version) || !binary(value.adapter.entry) ||
      !binary(value.nativeBinary) || !keys(value.decoder, ['source', 'binary']) || (value.decoder.source !== 'bundled' && value.decoder.source !== 'system') || !binary(value.decoder.binary) ||
      !keys(value.runtime, ['platform', 'arch', 'node', 'electron', 'modules']) ||
      typeof value.runtime.platform !== 'string' ||
      !['linux', 'darwin', 'win32', 'freebsd', 'openbsd', 'aix', 'sunos', 'android'].includes(value.runtime.platform) ||
      typeof value.runtime.arch !== 'string' ||
      !['x64', 'arm64', 'arm', 'ia32', 'ppc64', 's390x', 'riscv64', 'loong64'].includes(value.runtime.arch) ||
      typeof value.runtime.node !== 'string' || !/^\d+\.\d+\.\d+$/.test(value.runtime.node) ||
      !(value.runtime.electron === null || typeof value.runtime.electron === 'string' && /^\d+\.\d+\.\d+$/.test(value.runtime.electron)) ||
      !(value.runtime.modules === null || typeof value.runtime.modules === 'string' && /^\d{1,5}$/.test(value.runtime.modules))) throw new Error('Invalid local voice engine identity');
}
