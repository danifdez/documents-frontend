// @vitest-environment node
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { loadVoiceBindings, resolveVoiceDecoder, validateEngineIdentity, VerifiedRuntimeFile } from '@/main/voice/runtimeIdentity';

let root: string;
beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'voice-runtime-')); });
afterEach(() => { vi.unstubAllEnvs(); fs.rmSync(root, { recursive: true, force: true }); });
function file(name: string, body = 'fixture', mode = 0o600): string {
  const location = path.join(root, name); fs.mkdirSync(path.dirname(location), { recursive: true });
  fs.writeFileSync(location, body, { mode }); return location;
}
function fixture() {
  const manifest = file('smart-whisper/package.json', JSON.stringify({ name: 'smart-whisper', version: '0.8.1' }));
  const entry = file('smart-whisper/dist/index.js');
  const native = file('smart-whisper/build/Release/smart-whisper.node');
  const ffmpeg = file('ffmpeg-static/package.json', '{}');
  const decoder = file('ffmpeg-static/ffmpeg', 'simulated executable; never run', 0o700);
  const Whisper = vi.fn(() => { throw new Error('Models must not be constructed'); });
  const cache: NodeRequire['cache'] = {};
  const load = vi.fn((id: string) => {
    expect(id).toBe('smart-whisper');
    const child = { filename: native, children: [] } as unknown as NodeJS.Module;
    cache[native] = child; cache[entry] = { filename: entry, children: [child] } as unknown as NodeJS.Module;
    return { Whisper };
  });
  const resolve = vi.fn((id: string) => ({ 'smart-whisper': entry, 'smart-whisper/package.json': manifest,
    'ffmpeg-static/package.json': ffmpeg })[id]!);
  const loader = Object.assign(load, { resolve, cache }) as unknown as NodeRequire;
  return { loader, load, native, decoder, entry, manifest, Whisper };
}

describe('local voice dependencies without model loading', () => {
  it('fingerprints regular files, detects replacement and refuses unsafe types or permissions', () => {
    const location = file('binary', 'original'); const selected = new VerifiedRuntimeFile(location);
    expect(selected.identity).toEqual({ sizeBytes: 8, sha256: 'sha256:' + createHash('sha256').update('original').digest('hex') });
    fs.renameSync(location, `${location}.old`); file('binary', 'original');
    expect(() => selected.verify()).toThrow('changed');
    fs.symlinkSync(`${location}.old`, path.join(root, 'link'));
    expect(() => new VerifiedRuntimeFile(path.join(root, 'link'))).toThrow('Invalid');
    expect(() => new VerifiedRuntimeFile(root)).toThrow('Invalid');
    expect(() => new VerifiedRuntimeFile(file('empty', ''))).toThrow('Invalid');
    const writable = file('writable'); fs.chmodSync(writable, 0o666);
    expect(() => new VerifiedRuntimeFile(writable)).toThrow('Invalid');
  });
  it('prefers a real executable beside the installed package and ignores ambient overrides', () => {
    const manifest = file('ffmpeg-static/package.json', '{}');
    const executable = file('ffmpeg-static/ffmpeg', 'simulated decoder', 0o700);
    vi.stubEnv('FFMPEG_BIN', '/private/UNTRUSTED'); vi.stubEnv('PATH', '/private/UNTRUSTED');
    const selected = resolveVoiceDecoder(manifest);
    expect(selected.source).toBe('bundled'); expect(selected.file.file).toBe(executable);
    expect(JSON.stringify(selected.file.identity)).not.toContain(root);
  });
  it('uses the unpacked decoder for a packaged application', () => {
    const manifest = file('app.asar/node_modules/ffmpeg-static/package.json', '{}');
    const executable = file('app.asar.unpacked/node_modules/ffmpeg-static/ffmpeg', 'simulated decoder', 0o700);
    expect(resolveVoiceDecoder(manifest).file.file).toBe(executable);
  });
  it.runIf(process.platform === 'linux')('reuses the system FFmpeg only when the bundled executable is absent', () => {
    const selected = resolveVoiceDecoder(file('ffmpeg-static/package.json', '{}'));
    expect(selected.source).toBe('system'); expect(selected.file.file).toBe('/usr/bin/ffmpeg');
    expect(selected.file.identity).toEqual(new VerifiedRuntimeFile('/usr/bin/ffmpeg', true, true).identity);
  });
  it('rejects a non-executable or symlinked bundled binary instead of silently bypassing it', () => {
    const manifest = file('ffmpeg-static/package.json', '{}'); const executable = file('ffmpeg-static/ffmpeg');
    expect(() => resolveVoiceDecoder(manifest)).toThrow();
    fs.renameSync(executable, `${executable}.old`); fs.symlinkSync(`${executable}.old`, executable);
    expect(() => resolveVoiceDecoder(manifest)).toThrow('Invalid');
  });
  it('binds the adapter, addon and decoder to module loading without constructing any model', () => {
    const f = fixture(); const bindings = loadVoiceBindings(f.loader); const identity = bindings.identity();
    validateEngineIdentity(identity);
    expect(f.load).toHaveBeenCalledTimes(1); expect(f.Whisper).not.toHaveBeenCalled();
    expect(identity).toMatchObject({ adapter: { name: 'smart-whisper', version: '0.8.1' },
      nativeBinary: new VerifiedRuntimeFile(f.native).identity, decoder: { source: 'bundled' },
      runtime: { platform: process.platform, arch: process.arch, node: process.versions.node } });
    expect(bindings.decoder).toBe(f.decoder);
    expect(JSON.stringify(identity)).not.toContain(root);
  });
  it.each(['native', 'decoder', 'entry', 'manifest'] as const)('refuses a changed %s after selection', (which) => {
    const f = fixture(); const bindings = loadVoiceBindings(f.loader);
    fs.appendFileSync(f[which], 'changed');
    expect(() => bindings.verify()).toThrow('changed'); expect(() => bindings.identity()).toThrow('changed');
    expect(f.Whisper).not.toHaveBeenCalled();
  });
  it('rejects addon replacement during module loading', () => {
    const f = fixture(); const load = f.load.getMockImplementation()!;
    f.load.mockImplementation((id) => { const result = load(id); fs.appendFileSync(f.native, 'replacement'); return result; });
    expect(() => loadVoiceBindings(f.loader)).toThrow('changed'); expect(f.Whisper).not.toHaveBeenCalled();
  });
  it('does not claim an addon already cached before verification or absent from the wrapper dependencies', () => {
    const f = fixture(); f.loader.cache[f.native] = {} as NodeJS.Module;
    expect(() => loadVoiceBindings(f.loader)).toThrow('before verification'); expect(f.load).not.toHaveBeenCalled();
    delete f.loader.cache[f.native]; const load = f.load.getMockImplementation()!;
    f.load.mockImplementation((id) => { const result = load(id); f.loader.cache[f.entry]!.children = []; return result; });
    expect(() => loadVoiceBindings(f.loader)).toThrow('unconfirmed');
  });
  it('refuses extra fields, paths, invalid hashes or runtime values in identity evidence', () => {
    const identity = loadVoiceBindings(fixture().loader).identity();
    for (const mutate of [
      (v: typeof identity) => Object.assign(v.decoder, { path: '/private/UNTRUSTED' }),
      (v: typeof identity) => { v.nativeBinary.sha256 = 'not-a-hash'; },
      (v: typeof identity) => { v.nativeBinary.sizeBytes = -1; },
      (v: typeof identity) => { v.runtime.node = '/private/UNTRUSTED'; },
    ]) {
      const changed = structuredClone(identity); mutate(changed); expect(() => validateEngineIdentity(changed)).toThrow('Invalid');
    }
  });
});
