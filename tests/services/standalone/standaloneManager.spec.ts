// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const services = vi.hoisted(() => ({
  postgres: { start: vi.fn(), stop: vi.fn(), running: false, port: 5515, credentials: { user: 'test', password: 'fixture', database: 'test' } },
  backend: { start: vi.fn(), stop: vi.fn(), running: false, port: 32119, url: 'http://127.0.0.1:32119' },
  models: { start: vi.fn(), stop: vi.fn(), running: false },
  modelsInstalled: vi.fn(), installedComponent: vi.fn(), gpu: vi.fn(),
  migrate: vi.fn(), mkdir: vi.fn(),
}));
vi.mock('electron', () => ({ app: { getPath: () => '/test/profile' } }));
vi.mock('node:fs', () => ({ default: { mkdirSync: services.mkdir } }));
vi.mock('@/services/standalone/local-data', () => ({
  getPersistentLocalDataDir: () => '/test/data', migrateLegacyLocalData: services.migrate,
}));
vi.mock('@/services/standalone/embedded-postgres', () => ({ EmbeddedPostgresService: class { constructor() { return services.postgres; } } }));
vi.mock('@/services/standalone/embedded-backend', () => ({ EmbeddedBackendService: class { constructor() { return services.backend; } } }));
vi.mock('@/services/standalone/embedded-models', () => ({
  EmbeddedModelsService: { isInstalled: services.modelsInstalled }, embeddedModels: services.models,
}));
vi.mock('@/services/standalone/installed-components', () => ({ readInstalledComponent: services.installedComponent }));
vi.mock('@/services/standalone/download-manager', () => ({ detectGpu: services.gpu }));

const load = async () => (await import('@/services/standalone/standalone-manager')).standaloneManager;

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  for (const service of [services.postgres, services.backend, services.models]) {
    service.running = false;
    service.start.mockImplementation(async () => { service.running = true; });
    service.stop.mockImplementation(async () => { service.running = false; });
  }
  services.modelsInstalled.mockReturnValue(false);
  services.gpu.mockReturnValue({ available: true, cuda: true });
});

afterEach(() => vi.restoreAllMocks());

describe('local server orchestration', () => {
  it('migrates data, starts the database first and reuses a running API', async () => {
    const manager = await load();
    expect(manager.getBackendUrl()).toBeNull();
    expect(await manager.applyFeatures({ canvas: false })).toBeNull();
    expect(await manager.start({ backendPort: 32119, features: { canvas: false, datasets: true } })).toBe(services.backend.url);
    expect(services.migrate).toHaveBeenCalledOnce();
    expect(services.mkdir).toHaveBeenCalledWith('/test/data', { recursive: true });
    expect(services.postgres.start).toHaveBeenCalledBefore(services.backend.start);
    expect(services.backend.start).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      postgresPort: 5515, storagePath: '/test/data/documents', authEnabled: false, port: 32119, disabledFeatures: ['canvas'],
    }));
    expect(manager.getStatus()).toEqual({ services: { postgres: 'running', backend: 'running', models: 'not_installed' }, errors: {} });
    expect(await manager.start()).toBe(services.backend.url);
    expect(services.backend.start).toHaveBeenCalledOnce();
  });

  it('restarts the backend and GPU worker on the same port while retaining the running database', async () => {
    services.modelsInstalled.mockReturnValue(true);
    services.installedComponent.mockReturnValue({ state: { variant: 'cuda' } });
    const manager = await load();
    await manager.start();
    const [backendConfig] = services.backend.start.mock.calls[0];
    expect(services.models.start).toHaveBeenCalledWith(expect.objectContaining({
      enrollmentToken: backendConfig.modelsEnrollmentToken, backendUrl: services.backend.url, gpu: true,
    }));
    await manager.applyFeatures({ datasets: false });
    expect(services.models.stop).toHaveBeenCalledBefore(services.backend.stop);
    expect(services.postgres.start).toHaveBeenCalledOnce();
    expect(services.postgres.stop).not.toHaveBeenCalled();
    expect(services.backend.start).toHaveBeenLastCalledWith(expect.objectContaining({ port: 32119, disabledFeatures: ['datasets'] }));
    expect(services.models.start).toHaveBeenLastCalledWith(expect.objectContaining({ features: { datasets: false } }));
    expect(manager.getStatus().services.models).toBe('running');

    await manager.stop();
    expect(services.postgres.stop).toHaveBeenCalledOnce();
    expect(manager.getStatus().services).toEqual({ postgres: 'stopped', backend: 'stopped', models: 'stopped' });
    expect(manager.isRunning()).toBe(false);
  });

  it('records a database startup error and retries cleanly from the beginning', async () => {
    services.postgres.start.mockRejectedValueOnce(new Error('Local data cannot be opened'));
    const manager = await load();
    await expect(manager.start()).rejects.toThrow('PostgreSQL failed to start');
    expect(manager.getStatus().errors.postgres).toBe('Local data cannot be opened');
    expect(manager.getStatus().services.postgres).toBe('error');
    expect(services.backend.start).not.toHaveBeenCalled();
    await expect(manager.start()).resolves.toBe(services.backend.url);
    expect(manager.getStatus().errors).toEqual({});
  });

  it('keeps the database available across a backend failure and treats worker failures as nonfatal', async () => {
    services.backend.start.mockRejectedValueOnce('Port is already in use');
    services.modelsInstalled.mockReturnValue(true);
    services.models.start.mockRejectedValueOnce(new Error('Model not available'));
    const manager = await load();
    await expect(manager.start()).rejects.toThrow('Backend failed to start');
    expect(manager.getStatus().errors.backend).toBe('Port is already in use');
    expect(manager.getStatus().services.postgres).toBe('running');
    expect(services.postgres.stop).not.toHaveBeenCalled();
    expect(services.models.start).not.toHaveBeenCalled();

    await expect(manager.start()).resolves.toBe(services.backend.url);
    expect(services.postgres.start).toHaveBeenCalledOnce();
    expect(manager.getStatus().services.models).toBe('not_installed');
    expect(manager.getBackendUrl()).toBe(services.backend.url);
  });
});
