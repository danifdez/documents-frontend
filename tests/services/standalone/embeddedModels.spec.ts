// @vitest-environment node
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmbeddedModelsService, type ModelsConfig } from '@/services/standalone/embedded-models';
import { getModelsBinaryPath } from '@/services/standalone/models-binary';

const system = vi.hoisted(() => ({
  exists: vi.fn(), mkdir: vi.fn(), write: vi.fn(), log: vi.fn(), spawn: vi.fn(), root: vi.fn(),
}));
vi.mock('electron', () => ({ app: { getPath: () => '/test/profile' } }));
vi.mock('node:fs', () => ({ default: {
  existsSync: system.exists, mkdirSync: system.mkdir, writeFileSync: system.write, createWriteStream: system.log,
} }));
vi.mock('node:child_process', () => ({ spawn: system.spawn }));
vi.mock('@/services/standalone/installed-components', () => ({
  getActiveComponentRoot: system.root, legacyComponentRoot: () => '/test/legacy',
}));

const config: ModelsConfig = {
  backendUrl: 'http://127.0.0.1:32105', enrollmentToken: 'fixture-enrollment',
  postgres: { host: '127.0.0.1', port: 5501, user: 'archive', password: 'fixture-password', database: 'archive' },
  features: { relationships: false, datasets: true }, gpu: false,
};
const services = '/test/runtime/models';
const storage = '/test/profile/models-service/data';
const data = '/test/profile/local-server/models';

class Worker extends EventEmitter {
  stdout = { pipe: vi.fn() };
  stderr = { pipe: vi.fn() };
  kill = vi.fn();
}
let child: Worker;

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  child = new Worker();
  system.spawn.mockReturnValue(child);
  system.root.mockReturnValue(services);
  system.exists.mockReturnValue(true);
  system.log.mockReturnValue({ fixture: 'log stream' });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('embedded models worker', () => {
  it('refuses a missing bundle and recognizes an installed fallback', async () => {
    system.root.mockReturnValue(null);
    system.exists.mockReturnValue(false);
    const worker = new EmbeddedModelsService();
    expect(EmbeddedModelsService.isInstalled()).toBe(false);
    await expect(worker.start(config)).rejects.toThrow('Models service not installed');
    expect(system.spawn).not.toHaveBeenCalled();
    expect(system.mkdir).not.toHaveBeenCalled();

    system.exists.mockReturnValue(true);
    expect(EmbeddedModelsService.isInstalled()).toBe(true);
    expect(system.exists).toHaveBeenLastCalledWith(getModelsBinaryPath('/test/legacy'));
  });

  it.each([false, true])('uses the sandboxed runtime and selected GPU option (%s)', async (gpu) => {
    const worker = new EmbeddedModelsService();
    await worker.start({ ...config, gpu });
    expect(worker.running).toBe(true);
    const [configFile, contents] = system.write.mock.calls[0];
    expect(configFile).toBe(data + '/config.json');
    expect(JSON.parse(contents)).toEqual({
      database: { host: '127.0.0.1', port: 5501, name: 'archive', user: 'archive', password: 'fixture-password' },
      features: config.features, llm_defaults: { model_dir: storage + '/models' },
    });
    expect(system.spawn).toHaveBeenCalledExactlyOnceWith(getModelsBinaryPath(services), [], expect.objectContaining({
      cwd: services, env: expect.objectContaining({
        BACKEND_URL: config.backendUrl, MODELS_ENROLLMENT_TOKEN: config.enrollmentToken, MODELS_CONFIG_PATH: configFile,
        MODELS_MODEL_DIR: storage + '/models', HF_HOME: storage + '/hf-cache',
        LLM_N_GPU_LAYERS: gpu ? '-1' : '0', LLAMA_SERVER_GPU_LAYERS: gpu ? '-1' : '0',
      }),
    }));
    expect(child.stdout.pipe).toHaveBeenCalledWith({ fixture: 'log stream' });
    expect(child.stderr.pipe).toHaveBeenCalledWith({ fixture: 'log stream' });
    await worker.start(config);
    expect(system.spawn).toHaveBeenCalledTimes(1);
  });

  it('escalates a slow shutdown and resets state when the process exits', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const worker = new EmbeddedModelsService();
    await worker.stop();
    await worker.start(config);
    const stopped = worker.stop();
    expect(child.kill).toHaveBeenCalledExactlyOnceWith('SIGTERM');
    await vi.advanceTimersByTimeAsync(5000);
    expect(child.kill).toHaveBeenLastCalledWith('SIGKILL');
    child.emit('exit', 4);
    await stopped;
    expect(worker.running).toBe(false);
    expect(error).toHaveBeenCalledExactlyOnceWith('Models worker exited with code 4');
  });
});
