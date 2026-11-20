// @vitest-environment node
import { EventEmitter } from 'node:events';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmbeddedBackendService, type BackendConfig } from '@/services/standalone/embedded-backend';

const state = vi.hoisted(() => ({
  exists: vi.fn(), read: vi.fn(), write: vi.fn(), mkdir: vi.fn(), rm: vi.fn(), log: vi.fn(),
  spawn: vi.fn(), spawnSync: vi.fn(), fork: vi.fn(), request: vi.fn(),
  bundled: vi.fn(), active: vi.fn(), legacy: vi.fn(), freePort: vi.fn(), isPortAvailable: vi.fn(),
}));
vi.mock('electron', () => ({ app: { getPath: () => '/test/profile', getAppPath: () => '/test/checkout/frontend/app' } }));
vi.mock('node:fs', () => ({ default: {
  existsSync: state.exists, readFileSync: state.read, writeFileSync: state.write,
  mkdirSync: state.mkdir, rmSync: state.rm, createWriteStream: state.log,
} }));
vi.mock('node:child_process', () => ({ spawn: state.spawn, spawnSync: state.spawnSync, fork: state.fork }));
vi.mock('node:http', () => ({ default: { get: state.request } }));
vi.mock('@/services/standalone/embedded-postgres', () => ({
  findFreePort: state.freePort, isPortAvailable: state.isPortAvailable,
}));
vi.mock('@/services/standalone/download-manager', () => ({ getBundledNodePath: state.bundled }));
vi.mock('@/services/standalone/installed-components', () => ({
  getActiveComponentRoot: state.active, legacyComponentRoot: state.legacy,
}));

const component = '/test/services/backend-17';
const installed = path.join(component, 'dist', 'src', 'main.js');
const legacy = path.join('/test/services/backend', 'dist', 'src', 'main.js');
const log = path.join('/test/profile', 'local-server', 'logs', 'backend.log');
const processState = path.join('/test/profile', 'local-server', 'backend-process.json');
const config: BackendConfig = {
  postgresHost: '127.0.0.1', postgresPort: 5643, postgresUser: 'test',
  postgresPassword: 'test-secret', postgresDatabase: 'test_documents',
  storagePath: '/test/storage', modelsEnrollmentToken: 'test-token',
};
const filesystem = new Map<string, string>();
let child: BackendProcess;
let request: HealthRequest;

class BackendProcess extends EventEmitter {
  pid = 123;
  stdout = { pipe: vi.fn() };
  stderr = { pipe: vi.fn() };
  kill = vi.fn();
}

class HealthRequest extends EventEmitter {
  setTimeout = vi.fn();
  destroy = vi.fn();
}

function boot() {
  const backend = new EmbeddedBackendService();
  return { backend, start: backend.start(config) };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.spyOn(process, 'kill').mockImplementation(() => true);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  child = new BackendProcess();
  request = new HealthRequest();
  filesystem.clear();
  filesystem.set(installed, '// bundled backend');
  state.active.mockReturnValue(component);
  state.legacy.mockReturnValue('/test/services/backend');
  state.bundled.mockReturnValue('/test/runtime/node');
  state.exists.mockImplementation((location: string) => filesystem.has(location));
  state.read.mockImplementation((location: string) => {
    if (!filesystem.has(location)) throw new Error('ENOENT');
    return filesystem.get(location);
  });
  state.write.mockImplementation((location: string, value: string) => { filesystem.set(location, value); });
  state.rm.mockImplementation((location: string) => { filesystem.delete(location); });
  state.log.mockReturnValue({ write: vi.fn() });
  state.spawn.mockReturnValue(child);
  state.fork.mockReturnValue(child);
  state.freePort.mockResolvedValue(31234);
  state.isPortAvailable.mockResolvedValue(true);
  state.request.mockImplementation((_url: string, ready: () => void) => {
    queueMicrotask(ready);
    return request;
  });
});

afterEach(async () => {
  await vi.runOnlyPendingTimersAsync();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('embedded backend lifecycle', () => {
  it('finds the active and legacy installs and refuses to start when neither is present', async () => {
    expect(EmbeddedBackendService.isInstalled()).toBe(true);
    state.active.mockReturnValue(null);
    filesystem.set(legacy, '');
    expect(EmbeddedBackendService.isInstalled()).toBe(true);
    filesystem.delete(legacy);
    expect(EmbeddedBackendService.isInstalled()).toBe(false);
    const { backend, start } = boot();
    await expect(start).rejects.toThrow('Backend not found');
    expect(state.spawn).not.toHaveBeenCalled();
    expect(state.fork).not.toHaveBeenCalled();
    expect(backend.running).toBe(false);
  });

  it('starts the bundled Node process with loopback, separate storage and the requested features', async () => {
    const backend = new EmbeddedBackendService();
    await backend.start({ ...config, authEnabled: true, disabledFeatures: ['datasets', 'relationships'], port: 30521 });
    expect(backend.running).toBe(true);
    expect(backend.port).toBe(30521);
    expect(backend.url).toBe('http://127.0.0.1:30521');
    expect(state.isPortAvailable).toHaveBeenCalledExactlyOnceWith(30521);
    expect(state.freePort).not.toHaveBeenCalled();
    const [executable, args, options] = state.spawn.mock.calls[0];
    const { HOST, PORT, POSTGRES_PORT, DOCUMENTS_STORAGE_DIR, RUN_MIGRATIONS, AUTH_ENABLED, FEATURE_RAG, FEATURE_DATASETS, FEATURE_RELATIONSHIPS, PUPPETEER_CACHE_DIR } = options.env;
    expect([executable, args]).toEqual(['/test/runtime/node', [installed]]);
    expect({ HOST, PORT, POSTGRES_PORT, DOCUMENTS_STORAGE_DIR, RUN_MIGRATIONS, AUTH_ENABLED, FEATURE_RAG, FEATURE_DATASETS, FEATURE_RELATIONSHIPS, PUPPETEER_CACHE_DIR }).toEqual({
      HOST: '127.0.0.1', PORT: '30521', POSTGRES_PORT: '5643', DOCUMENTS_STORAGE_DIR: '/test/storage',
      RUN_MIGRATIONS: 'true', AUTH_ENABLED: 'true', FEATURE_RAG: 'true', FEATURE_DATASETS: 'false', FEATURE_RELATIONSHIPS: 'false',
      PUPPETEER_CACHE_DIR: path.join(component, 'runtime', 'puppeteer'),
    });
    expect(state.log).toHaveBeenCalledExactlyOnceWith(log, { flags: 'a' });
    expect(child.stdout.pipe).toHaveBeenCalledOnce();
    expect(child.stderr.pipe).toHaveBeenCalledOnce();
    expect(JSON.parse(filesystem.get(processState)!)).toEqual({ pid: child.pid, backendPath: installed });
    await backend.start(config);
    expect(state.spawn).toHaveBeenCalledOnce();
  });

  it('rejects an occupied configured port before creating files or processes', async () => {
    state.isPortAvailable.mockResolvedValue(false);
    const backend = new EmbeddedBackendService();
    await expect(backend.start({ ...config, port: 30521 })).rejects.toThrow('Local API port 30521 is already in use');
    expect(state.spawn).not.toHaveBeenCalled();
    expect(state.mkdir).not.toHaveBeenCalled();
    expect(backend.running).toBe(false);
  });

  it('uses the system runtime and falls back to its packaged fork if spawning throws', async () => {
    state.bundled.mockReturnValue(null);
    state.spawnSync.mockReturnValue({ status: 0, stdout: ' /system/node\n' });
    state.spawn.mockImplementation(() => { throw new Error('Runtime unavailable'); });
    const { backend, start } = boot();
    await start;
    expect(state.spawnSync).toHaveBeenCalledWith(process.platform === 'win32' ? 'where' : 'which', ['node'], { encoding: 'utf-8' });
    expect(state.spawn.mock.calls[0].slice(0, 2)).toEqual(['/system/node', [installed]]);
    expect(state.fork.mock.calls[0].slice(0, 2)).toEqual([installed, []]);
    expect(backend.url).toBe('http://127.0.0.1:31234');
  });

  it('waits for the health response, retrying after connection errors and timeouts', async () => {
    const error = new HealthRequest();
    const slow = new HealthRequest();
    state.request.mockImplementationOnce(() => error).mockImplementationOnce(() => slow);
    const { backend, start } = boot();
    await vi.advanceTimersByTimeAsync(0);
    expect(backend.running).toBe(false);
    error.emit('error', new Error('ECONNREFUSED'));
    await vi.advanceTimersByTimeAsync(500);
    const [timeout, cancel] = slow.setTimeout.mock.calls[0];
    expect(timeout).toBe(1000);
    cancel();
    expect(slow.destroy).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(500);
    await start;
    expect(backend.running).toBe(true);
    expect(state.request.mock.calls.map(([url]) => url)).toEqual(Array.from({ length: 3 }, () => backend.url));
  });

  it('rejects an early process exit and clears only the state that belongs to that process', async () => {
    state.request.mockReturnValue(request);
    const { backend, start } = boot();
    const failed = expect(start).rejects.toThrow('Backend exited before becoming ready (code=2');
    await vi.advanceTimersByTimeAsync(0);
    child.emit('exit', 2, null);
    await failed;
    expect(backend.running).toBe(false);
    expect(filesystem.has(processState)).toBe(false);
    await backend.stop();
    expect(child.kill).not.toHaveBeenCalled();
  });

  it('waits for exit after requesting shutdown, then escalates only for a still-running child', async () => {
    const { backend, start } = boot();
    await start;
    const stopped = backend.stop();
    expect(child.kill).toHaveBeenCalledExactlyOnceWith('SIGTERM');
    await vi.advanceTimersByTimeAsync(5000);
    expect(child.kill).toHaveBeenLastCalledWith('SIGKILL');
    child.emit('exit', null, 'SIGKILL');
    await stopped;
    expect(backend.running).toBe(false);
    expect(filesystem.has(processState)).toBe(false);
  });

  it.skipIf(process.platform !== 'linux')('leaves an unrelated live process untouched', async () => {
    filesystem.set(processState, JSON.stringify({ pid: 4111 }));
    filesystem.set('/proc/4111/cmdline', '/usr/bin/unrelated-process');
    const { backend, start } = boot();
    await start;
    expect(process.kill).toHaveBeenCalledExactlyOnceWith(4111, 0);
    expect(backend.running).toBe(true);
  });

  it.skipIf(process.platform !== 'linux')('removes verified orphan state after the previous backend exits', async () => {
    filesystem.set(processState, JSON.stringify({ pid: 4111 }));
    filesystem.set('/proc/4111/cmdline', installed);
    let alive = true;
    vi.mocked(process.kill).mockImplementation((pid, signal) => {
      if (pid !== 4111) throw new Error('Unexpected process');
      if (signal === 'SIGTERM') alive = false;
      if (!alive && signal === 0) throw Object.assign(new Error('Process exited'), { code: 'ESRCH' });
      return true;
    });
    const { backend, start } = boot();
    await start;
    expect(process.kill).toHaveBeenCalledWith(4111, 'SIGTERM');
    expect(process.kill).not.toHaveBeenCalledWith(4111, 'SIGKILL');
    expect(state.rm).toHaveBeenCalledWith(processState, { force: true });
    expect(JSON.parse(filesystem.get(processState)!).pid).toBe(child.pid);
    expect(backend.running).toBe(true);
  });
});
