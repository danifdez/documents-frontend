import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  activateInstalledComponent,
  getComponentBase,
  getCurrentTarget,
  readInstalledComponent,
  removeModelsRuntime,
} from '../../src/services/standalone/installed-components';

function createBundle(userData: string, directory: string, version: string): void {
  const root = path.join(getComponentBase(userData, 'backend'), directory);
  fs.mkdirSync(path.join(root, 'dist', 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'dist', 'src', 'main.js'), '');
  fs.writeFileSync(path.join(root, 'component-manifest.json'), JSON.stringify({
    schemaVersion: 1,
    component: 'backend',
    version,
    target: 'linux-x64',
    entrypoint: 'dist/src/main.js',
  }));
}

describe('Installed standalone component state', () => {
  let userData: string;

  beforeEach(() => {
    userData = fs.mkdtempSync(path.join(os.tmpdir(), 'documents-installed-'));
  });

  afterEach(() => {
    fs.rmSync(userData, { recursive: true, force: true });
  });

  it('activates a verified version and resolves its entrypoint', () => {
    createBundle(userData, 'backend-1.0.0-a', '1.0.0');
    activateInstalledComponent(userData, {
      component: 'backend', version: '1.0.0', target: 'linux-x64', sha256: 'a'.repeat(64), path: 'backend-1.0.0-a',
    });

    expect(readInstalledComponent(userData, 'backend', 'linux-x64')?.root).toBe(
      path.join(userData, 'standalone-services', 'backend-1.0.0-a'),
    );
  });

  it('keeps the previous active path when a new version is activated', () => {
    createBundle(userData, 'backend-1.0.0-a', '1.0.0');
    createBundle(userData, 'backend-2.0.0-b', '2.0.0');
    activateInstalledComponent(userData, {
      component: 'backend', version: '1.0.0', target: 'linux-x64', sha256: 'a'.repeat(64), path: 'backend-1.0.0-a',
    });
    const state = activateInstalledComponent(userData, {
      component: 'backend', version: '2.0.0', target: 'linux-x64', sha256: 'b'.repeat(64), path: 'backend-2.0.0-b',
    });

    expect(state.previousPath).toBe('backend-1.0.0-a');
    expect(readInstalledComponent(userData, 'backend')?.state.version).toBe('2.0.0');
  });

  it('rejects tampered state and a component manifest for another target', () => {
    createBundle(userData, 'backend-1.0.0-a', '1.0.0');
    activateInstalledComponent(userData, {
      component: 'backend', version: '1.0.0', target: 'linux-x64', sha256: 'a'.repeat(64), path: 'backend-1.0.0-a',
    });

    expect(readInstalledComponent(userData, 'backend', 'darwin-arm64')).toBeNull();
    const statePath = path.join(userData, 'standalone-services', 'state', 'backend.json');
    fs.writeFileSync(statePath, JSON.stringify({ schemaVersion: 1, component: 'backend', path: '../outside' }));
    expect(readInstalledComponent(userData, 'backend')).toBeNull();
  });

  it('rejects unsupported architectures instead of treating them as x64', () => {
    expect(() => getCurrentTarget('linux', 'ia32')).toThrow('Unsupported architecture: ia32');
  });

  it('removes Models runtimes without deleting downloaded model data', () => {
    const base = getComponentBase(userData, 'models');
    fs.mkdirSync(path.join(base, 'data', 'models'), { recursive: true });
    fs.writeFileSync(path.join(base, 'data', 'models', 'weights.bin'), 'weights');
    fs.mkdirSync(path.join(base, 'models-1.0.0-cpu-a'), { recursive: true });
    fs.writeFileSync(path.join(base, 'state.json'), '{}');
    fs.writeFileSync(path.join(base, 'documents-models'), 'legacy runtime');

    removeModelsRuntime(userData);

    expect(fs.readFileSync(path.join(base, 'data', 'models', 'weights.bin'), 'utf8')).toBe('weights');
    expect(fs.existsSync(path.join(base, 'models-1.0.0-cpu-a'))).toBe(false);
    expect(fs.existsSync(path.join(base, 'state.json'))).toBe(false);
    expect(fs.existsSync(path.join(base, 'documents-models'))).toBe(false);
  });
});
