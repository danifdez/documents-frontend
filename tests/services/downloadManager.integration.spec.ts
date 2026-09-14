import { createHash } from 'crypto';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { create as createTar } from 'tar';
import { vi } from 'vitest';

const electronPaths = vi.hoisted(() => ({ userData: '', temp: '' }));

vi.mock('electron', () => ({
  app: {
    getVersion: () => '1.0.0',
    getPath: (name: string) => electronPaths[name as keyof typeof electronPaths],
  },
}));

describe.skipIf(process.platform !== 'linux')('Standalone downloader integration', () => {
  let root: string;
  let server: http.Server | undefined;

  beforeEach(() => {
    vi.resetModules();
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'documents-downloader-'));
    electronPaths.userData = path.join(root, 'user-data');
    electronPaths.temp = path.join(root, 'temp');
    fs.mkdirSync(electronPaths.userData, { recursive: true });
    fs.mkdirSync(electronPaths.temp, { recursive: true });
  });

  afterEach(async () => {
    delete process.env.DOCUMENTS_RELEASE_MANIFEST_URL;
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('activates a verified archive and preserves it when the next download is corrupt', async () => {
    const bundle = path.join(root, 'bundle');
    fs.mkdirSync(path.join(bundle, 'dist', 'src'), { recursive: true });
    fs.writeFileSync(path.join(bundle, 'dist', 'src', 'main.js'), 'module.exports = {};');
    fs.writeFileSync(path.join(bundle, 'component-manifest.json'), JSON.stringify({
      schemaVersion: 1,
      component: 'backend',
      version: '1.0.0',
      target: 'linux-x64',
      entrypoint: 'dist/src/main.js',
    }));
    const archive = path.join(root, 'backend.tar.gz');
    await createTar({ gzip: true, cwd: bundle, file: archive }, ['.']);
    const artifact = fs.readFileSync(archive);
    const sha256 = createHash('sha256').update(artifact).digest('hex');
    const manifest = {
      schemaVersion: 1,
      release: '1.0.0',
      targets: {
        'linux-x64': {
          backend: { version: '1.0.0', file: 'components/backend.tar.gz', size: artifact.length, sha256 },
        },
      },
    };

    server = http.createServer((request, response) => {
      if (request.url === '/release.json') {
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify(manifest));
      } else if (request.url === '/components/backend.tar.gz') {
        response.setHeader('content-length', artifact.length);
        response.end(artifact);
      } else {
        response.statusCode = 404;
        response.end();
      }
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Local test server did not expose a port');
    process.env.DOCUMENTS_RELEASE_MANIFEST_URL = `http://127.0.0.1:${address.port}/release.json`;

    const downloader = await import('../../src/services/standalone/download-manager');
    await downloader.downloadComponent('backend');
    const statePath = path.join(electronPaths.userData, 'standalone-services', 'state', 'backend.json');
    const activeState = fs.readFileSync(statePath, 'utf8');
    expect(JSON.parse(activeState)).toMatchObject({ component: 'backend', version: '1.0.0', target: 'linux-x64', sha256 });

    manifest.targets['linux-x64'].backend.sha256 = 'b'.repeat(64);
    vi.resetModules();
    const corruptDownloader = await import('../../src/services/standalone/download-manager');
    await expect(corruptDownloader.downloadComponent('backend')).rejects.toThrow('Checksum mismatch');
    expect(fs.readFileSync(statePath, 'utf8')).toBe(activeState);
  });
});
