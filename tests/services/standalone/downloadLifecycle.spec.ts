// @vitest-environment node
import { EventEmitter } from 'node:events';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkInstalled, detectGpu, downloadAll, getBundledNodePath, getPlatformSuffix,
  installProfile, isStandaloneReady, setupModels, uninstallModels, uninstallServices,
} from '@/services/standalone/download-manager';
import { getModelsBinaryPath } from '@/services/standalone/models-binary';

const state = vi.hoisted(() => ({
  exists: vi.fn(), remove: vi.fn(), exec: vi.fn(), spawn: vi.fn(), activeRoot: vi.fn(),
  installed: vi.fn(), removeModels: vi.fn(), target: vi.fn(),
}));
vi.mock('electron', () => ({ app: { getPath: () => '/test/profile', getVersion: () => 'test-version' } }));
vi.mock('node:fs', () => ({ default: { existsSync: state.exists, rmSync: state.remove } }));
vi.mock('node:child_process', () => ({ execFile: vi.fn(), execFileSync: state.exec, spawn: state.spawn }));
vi.mock('@/services/standalone/installed-components', () => ({
  getActiveComponentRoot: state.activeRoot, readInstalledComponent: state.installed,
  getCurrentTarget: state.target,
  legacyComponentRoot: (_profile: string, component: string) => path.join('/test/legacy', component),
  removeModelsRuntime: state.removeModels, getComponentBase: vi.fn(), activateInstalledComponent: vi.fn(),
}));

const installed = new Set<string>();
const platform = Object.getOwnPropertyDescriptor(process, 'platform')!;
const services = path.join('/test/profile', 'standalone-services');
const modelRoot = path.join('/test/runtime', 'models');
let child: EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };

beforeEach(() => {
  vi.resetAllMocks();
  installed.clear();
  state.exists.mockImplementation((location: string) => installed.has(location));
  state.target.mockReturnValue('linux-x64');
  state.activeRoot.mockReturnValue(null);
  state.installed.mockReturnValue(null);
  child = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: new EventEmitter() });
  state.spawn.mockReturnValue(child);
});

afterEach(() => {
  Object.defineProperty(process, 'platform', platform);
  vi.restoreAllMocks();
});

describe('standalone component selection', () => {
  it('recognizes a mixed existing install and skips runtime downloads when core services are already available', async () => {
    const nodeRoot = path.join('/test/runtime', 'node');
    const node = path.join(nodeRoot, 'bin', 'node');
    state.activeRoot.mockImplementation((_profile, component) => component === 'node' ? nodeRoot : null);
    state.installed.mockImplementation((_profile, component) => component === 'backend' ? { version: '1.0' } : null);
    installed.add(node);
    installed.add(path.join('/test/legacy', 'postgres', 'bin', 'postgres' + (process.platform === 'win32' ? '.exe' : '')));
    expect(getBundledNodePath()).toBe(node);
    expect(getPlatformSuffix()).toBe('linux-x64');
    expect(checkInstalled()).toEqual({ node: true, backend: true, postgres: true, models: false });
    expect(isStandaloneReady()).toBe(true);
    const progress = vi.fn();
    await downloadAll(progress);
    await installProfile(['backend', 'postgres'], progress);
    expect(state.spawn).not.toHaveBeenCalled();
    expect(progress).not.toHaveBeenCalled();
  });

  it('falls back to the legacy Node executable and requires all core services for readiness', () => {
    const legacy = path.join('/test/legacy', 'node', 'node.exe');
    expect(getBundledNodePath()).toBeNull();
    expect(isStandaloneReady()).toBe(false);
    installed.add(legacy);
    expect(getBundledNodePath()).toBe(legacy);
    expect(checkInstalled()).toMatchObject({ node: true, backend: false, postgres: false });
  });

  it('removes only the standalone runtime trees through the filesystem boundaries', async () => {
    await uninstallServices();
    expect(state.remove).not.toHaveBeenCalled();
    installed.add(services);
    await uninstallServices();
    expect(state.remove).toHaveBeenCalledExactlyOnceWith(services, { recursive: true, force: true });
    await uninstallModels();
    expect(state.removeModels).toHaveBeenCalledExactlyOnceWith('/test/profile');
  });
});

describe('desktop GPU detection', () => {
  it.each([
    ['Example RTX, 8188\nOther Adapter, 4096', 'Example RTX', 8],
    ['Legacy GPU, N/A', 'Legacy GPU', 0],
  ])('uses the first reported adapter when NVIDIA detection succeeds', (output, name, vramGB) => {
    Object.defineProperty(process, 'platform', { ...platform, value: 'linux' });
    state.exec.mockReturnValue(output);
    expect(detectGpu()).toEqual({ available: true, cuda: true, name, vramGB });
    expect(state.exec).toHaveBeenCalledExactlyOnceWith('/usr/bin/nvidia-smi',
      ['--query-gpu=name,memory.total', '--format=csv,noheader,nounits'],
      { timeout: 5000, encoding: 'utf-8' });
  });

  it('reports a Metal adapter without treating it as a CUDA device', () => {
    Object.defineProperty(process, 'platform', { ...platform, value: 'darwin' });
    state.exec.mockImplementationOnce(() => { throw new Error('NVIDIA utility unavailable'); });
    state.exec.mockReturnValueOnce('Chipset Model: Apple M3\nMetal: Supported');
    expect(detectGpu()).toEqual({ available: true, cuda: false, name: 'Apple M3', vramGB: 0 });
    expect(state.exec).toHaveBeenLastCalledWith('/usr/sbin/system_profiler', ['SPDisplaysDataType'],
      { timeout: 5000, encoding: 'utf-8' });
  });

  it('reports an unavailable GPU without a compatible system probe', () => {
    Object.defineProperty(process, 'platform', { ...platform, value: 'linux' });
    state.exec.mockReturnValue('  ');
    expect(detectGpu()).toEqual({ available: false, cuda: false, name: null, vramGB: 0 });
  });
});

describe('provisioning the local models runtime', () => {
  function addModels() {
    state.activeRoot.mockReturnValue(modelRoot);
    const binary = getModelsBinaryPath(modelRoot);
    installed.add(binary);
    return binary;
  }

  it('reports the missing binary before launching an installer', async () => {
    await expect(setupModels()).rejects.toThrow('Models service not found');
    expect(state.spawn).not.toHaveBeenCalled();
  });

  it('keeps model caches outside the bundle and reports parsed setup progress', async () => {
    const binary = addModels();
    const progress = vi.fn();
    const installing = setupModels(progress);
    const [executable, args, options] = state.spawn.mock.calls[0];
    expect([executable, args, options.cwd]).toEqual([binary, ['--setup'], modelRoot]);
    const data = path.join('/test/profile', 'models-service', 'data');
    const { HF_HOME, MODELS_MODEL_DIR, MODELS_DATA_DIR } = options.env;
    expect({ HF_HOME, MODELS_MODEL_DIR, MODELS_DATA_DIR }).toEqual({
      HF_HOME: path.join(data, 'hf-cache'), MODELS_MODEL_DIR: path.join(data, 'models'), MODELS_DATA_DIR: data,
    });
    child.stdout.emit('data', Buffer.from('setup initialized'));
    child.stdout.emit('data', Buffer.from('PROGRESS:embeddings:45\n'));
    child.emit('exit', 0);
    await installing;
    expect(progress.mock.calls.map(([event]) => event)).toEqual([
      { component: 'ai-models', downloaded: 0, total: 0, percent: 0 },
      { component: 'embeddings', downloaded: 45, total: 100, percent: 45 },
      { component: 'ai-models', downloaded: 100, total: 100, percent: 100 },
    ]);
  });

  it('reports nonzero status with the useful tail of installer stderr', async () => {
    addModels();
    const installing = setupModels();
    child.stderr.emit('data', Buffer.from('noise '.repeat(100) + 'storage is full'));
    child.emit('exit', 4);
    await expect(installing).rejects.toThrow(/Models setup failed \(exit 4\): .*storage is full/);
  });

  it('reports a process launch error from the models installer', async () => {
    addModels();
    const installing = setupModels();
    child.emit('error', new Error('Runtime cannot start'));
    await expect(installing).rejects.toThrow('Failed to run models setup: Runtime cannot start');
  });
});
