// @vitest-environment node
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { c as archive } from 'tar';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReleaseArtifact, ReleaseManifest } from '@/services/standalone/release-manifest';

const desktop = vi.hoisted(() => ({ getPath: vi.fn(), exec: vi.fn(), https: vi.fn(), http: vi.fn(), packaged: true }));
vi.mock('electron', () => ({ app: { getVersion: () => 'test-version', get isPackaged() { return desktop.packaged; }, getPath: desktop.getPath } }));
vi.mock('node:https', () => ({ default: { get: desktop.https } }));
vi.mock('node:http', () => ({ default: { get: desktop.http } }));
vi.mock('node:child_process', () => ({ execFile: desktop.exec, execFileSync: vi.fn(), spawn: vi.fn() }));

let root: string;
let release: string;
let systemResources: string;
let userData: string;
let downloads: string;
let originalResources: PropertyDescriptor | undefined;
const target = 'linux-x64';

async function component(
  name: 'backend' | 'node' | 'postgres',
  version: string,
  extra: Partial<ReleaseArtifact> = {},
  manifestVersion = version,
) {
  const payload = path.join(release, name);
  fs.mkdirSync(path.join(payload, 'bin'), { recursive: true });
  const entrypoint = `bin/${name}`;
  fs.writeFileSync(path.join(payload, entrypoint), `${name} ${version}\n`);
  fs.writeFileSync(path.join(payload, 'component-manifest.json'), JSON.stringify({
    schemaVersion: 1, component: name, version: manifestVersion, target, entrypoint,
  }));
  const file = `${name}-${version}.tar.gz`;
  await archive({ gzip: true, cwd: payload, file: path.join(release, file) }, ['bin', 'component-manifest.json']);
  const content = fs.readFileSync(path.join(release, file));
  return { version, file, size: content.length, sha256: createHash('sha256').update(content).digest('hex'), ...extra };
}

function writeRelease(components: ReleaseManifest['targets'][string]) {
  const manifest: ReleaseManifest = { schemaVersion: 1, release: 'fixture', targets: { [target]: components } };
  fs.writeFileSync(path.join(release, 'release.json'), JSON.stringify(manifest));
}

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  desktop.packaged = true;
  root = fs.mkdtempSync(path.join(tmpdir(), 'documents-release-test-'));
  release = path.join(root, 'release');
  systemResources = path.join(root, 'resources');
  userData = path.join(root, 'profile');
  downloads = path.join(root, 'downloads');
  for (const directory of [release, systemResources, userData, downloads]) fs.mkdirSync(directory);
  fs.writeFileSync(path.join(systemResources, 'standalone-release-source.json'), JSON.stringify({
    schemaVersion: 1, directory: release,
  }));
  originalResources = Object.getOwnPropertyDescriptor(process, 'resourcesPath');
  Object.defineProperty(process, 'resourcesPath', { configurable: true, value: systemResources });
  desktop.getPath.mockImplementation((name) => name === 'temp' ? downloads : userData);
});

afterEach(() => {
  if (originalResources) Object.defineProperty(process, 'resourcesPath', originalResources);
  else Reflect.deleteProperty(process, 'resourcesPath');
  vi.unstubAllEnvs();
  fs.rmSync(root, { recursive: true, force: true });
});

describe('installation from a packaged standalone release', () => {
  it('unpacks selected bundled services and records installed versions after checking each executable', async () => {
    const node = await component('node', '24.1.0');
    const backend = await component('backend', '4.5.6');
    writeRelease({ node, backend });
    desktop.exec.mockImplementation((_bin, _args, _options, done) => done(null, 'v24.1.0', ''));

    const { installProfile } = await import('@/services/standalone/download-manager');
    const { readInstalledComponent } = await import('@/services/standalone/installed-components');
    const progress = vi.fn();
    await installProfile(['backend'], progress);

    expect(desktop.exec).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/\/bin\/node$/), ['--version'], expect.any(Object), expect.any(Function));
    expect(readInstalledComponent(userData, 'node')?.state).toMatchObject({ version: node.version, sha256: node.sha256 });
    const installed = readInstalledComponent(userData, 'backend')!;
    expect(installed.state).toMatchObject({ version: backend.version, sha256: backend.sha256 });
    expect(fs.readFileSync(path.join(installed.root, 'bin/backend'), 'utf8')).toBe('backend 4.5.6\n');
    expect(progress.mock.calls[0][0]).toMatchObject({ component: 'node', step: 1, totalSteps: 2, overallPercent: 0 });
    expect(progress.mock.calls.at(-1)?.[0]).toMatchObject({ component: 'backend', step: 2, totalSteps: 2, overallPercent: 100 });
    expect(fs.readdirSync(downloads)).toEqual([]);
  });

  it('replaces a matching installation and leaves an existing version active when a new package fails verification', async () => {
    const backend = await component('backend', '4.5.6');
    const bad = await component('postgres', '16.3', { sha256: '0'.repeat(64) });
    const wrongVersion = await component('node', '24.1.0', {}, '25.1.0');
    writeRelease({ backend, postgres: bad, node: wrongVersion });

    const { downloadComponent } = await import('@/services/standalone/download-manager');
    const { readInstalledComponent } = await import('@/services/standalone/installed-components');
    await downloadComponent('backend');
    const installed = readInstalledComponent(userData, 'backend')!;
    fs.writeFileSync(path.join(installed.root, 'previous.tmp'), 'old');
    await downloadComponent('backend');
    expect(fs.existsSync(path.join(installed.root, 'previous.tmp'))).toBe(false);
    await expect(downloadComponent('postgres')).rejects.toThrow('Checksum mismatch for postgres');
    await expect(downloadComponent('node')).rejects.toThrow('node package does not match the selected release');
    expect(readInstalledComponent(userData, 'backend')?.state.sha256).toBe(backend.sha256);
    expect(readInstalledComponent(userData, 'postgres')).toBeNull();
    expect(readInstalledComponent(userData, 'node')).toBeNull();
    expect(fs.readdirSync(downloads)).toEqual([]);
  });
});

describe('downloads through the release manifest', () => {
  const manifestUrl = 'https://fixture.example/releases/release.json';
  const artifactBase = 'https://fixture.example/releases/';
  const mirror = 'http://fixture-mirror.example/component';
  function respond(statusCode: number, headers: Record<string, string>, body = Buffer.alloc(0)) {
    return (_url: string, consume: (response: Readable) => void) => {
      const request = Object.assign(new EventEmitter(), { setTimeout: vi.fn(), destroy: vi.fn() });
      const response = Object.assign(Readable.from(body.length ? [body] : []), { statusCode, headers });
      queueMicrotask(() => consume(response));
      return request;
    };
  }

  beforeEach(() => {
    desktop.packaged = false;
    vi.stubEnv('DOCUMENTS_RELEASE_MANIFEST_URL', manifestUrl);
  });

  it('follows a component redirect and activates the matching package after download', async () => {
    const backend = await component('backend', '4.5.6');
    writeRelease({ backend });
    const manifest = fs.readFileSync(path.join(release, 'release.json'));
    const artifact = fs.readFileSync(path.join(release, backend.file));
    desktop.https.mockImplementationOnce(respond(200, { 'content-length': String(manifest.length) }, manifest))
      .mockImplementationOnce(respond(302, { location: mirror }));
    desktop.http.mockImplementationOnce(respond(200, { 'content-length': String(artifact.length) }, artifact));

    const { downloadComponent } = await import('@/services/standalone/download-manager');
    const { readInstalledComponent } = await import('@/services/standalone/installed-components');
    const progress = vi.fn();
    await downloadComponent('backend', progress);
    expect(desktop.https.mock.calls.map(([url]) => url)).toEqual([manifestUrl, artifactBase + backend.file]);
    expect(desktop.http).toHaveBeenCalledExactlyOnceWith(mirror, expect.any(Function));
    expect(readInstalledComponent(userData, 'backend')?.state.sha256).toBe(backend.sha256);
    expect(progress.mock.calls.some(([event]) => event.percent === 50)).toBe(true);
    expect(fs.readdirSync(downloads)).toEqual([]);
  });

  it('retries fetching a failed manifest and rejects an incomplete download before activation', async () => {
    const backend = await component('backend', '4.5.6');
    writeRelease({ backend });
    const manifest = fs.readFileSync(path.join(release, 'release.json'));
    const part = Buffer.from('short archive fixture');
    desktop.https.mockImplementationOnce(respond(503, {}))
      .mockImplementationOnce(respond(200, {}, manifest))
      .mockImplementationOnce(respond(200, { 'content-length': String(part.length) }, part));
    const { downloadComponent } = await import('@/services/standalone/download-manager');
    const { readInstalledComponent } = await import('@/services/standalone/installed-components');
    await expect(downloadComponent('backend')).rejects.toThrow('Download failed: HTTP 503');
    await expect(downloadComponent('backend')).rejects.toThrow('Downloaded size mismatch');
    expect(desktop.https.mock.calls.map(([url]) => url)).toEqual([manifestUrl, manifestUrl, artifactBase + backend.file]);
    expect(readInstalledComponent(userData, 'backend')).toBeNull();
    expect(fs.readdirSync(downloads)).toEqual([]);
  });

  it('rejects a manifest advertised above the size limit before writing a file', async () => {
    desktop.https.mockImplementationOnce(respond(200, { 'content-length': String(6 * 1024 * 1024) }));
    const { downloadComponent } = await import('@/services/standalone/download-manager');
    await expect(downloadComponent('backend')).rejects.toThrow('Download exceeds expected size');
    expect(desktop.https).toHaveBeenCalledOnce();
    expect(fs.readdirSync(downloads)).toEqual([]);
  });
});
