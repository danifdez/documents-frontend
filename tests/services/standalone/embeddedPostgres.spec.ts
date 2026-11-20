// @vitest-environment node
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmbeddedPostgresService, findFreePort, isPortAvailable } from '@/services/standalone/embedded-postgres';

const state = vi.hoisted(() => ({
  exists: vi.fn(), read: vi.fn(), write: vi.fn(), list: vi.fn(), mkdir: vi.fn(), unlink: vi.fn(),
  remove: vi.fn(), log: vi.fn(), spawn: vi.fn(), exec: vi.fn(), connect: vi.fn(), server: vi.fn(),
  storeGet: vi.fn(), storeSet: vi.fn(), active: vi.fn(), legacy: vi.fn(),
}));
vi.mock('electron', () => ({ app: { getPath: () => '/test/profile' } }));
vi.mock('electron-store', () => ({ default: class Store {
  get = state.storeGet;
  set = state.storeSet;
} }));
vi.mock('node:fs', () => ({ default: {
  existsSync: state.exists, readFileSync: state.read, readdirSync: state.list, writeFileSync: state.write,
  mkdirSync: state.mkdir, unlinkSync: state.unlink, rmSync: state.remove, createWriteStream: state.log,
} }));
vi.mock('node:child_process', () => ({ spawn: state.spawn, execFile: state.exec }));
vi.mock('node:net', () => ({ default: { connect: state.connect, createServer: state.server } }));
vi.mock('@/services/standalone/installed-components', () => ({
  getActiveComponentRoot: state.active, legacyComponentRoot: state.legacy,
}));
vi.mock('@/services/standalone/local-data', () => ({ getPersistentLocalDataDir: () => '/test/data' }));

const bin = '/test/runtime/bin';
const data = '/test/data/pg-data';
const passwordFile = '/test/data/.pg-init-pw';
const pidFile = data + '/postmaster.pid';
const credentialsFile = '/test/data/pg-credentials.json';
const credentials = { user: 'archive', password: 'fixture-password', database: 'collection' };
const filesystem = new Map<string, string>();

class PostgresChild extends EventEmitter {
  stdout = { pipe: vi.fn() };
  stderr = Object.assign(new EventEmitter(), { pipe: vi.fn() });
  stdin = { write: vi.fn(), end: vi.fn() };
  kill = vi.fn();
}

function fakeConnection(event: 'connect' | 'error') {
  const socket = Object.assign(new EventEmitter(), { destroy: vi.fn() });
  queueMicrotask(() => socket.emit(event, new Error('fixture socket state')));
  return socket;
}

let child: PostgresChild;

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.spyOn(process, 'kill').mockReturnValue(true);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  filesystem.clear();
  filesystem.set(bin + '/initdb', '');
  filesystem.set(bin + '/postgres', '');
  filesystem.set(credentialsFile, JSON.stringify(credentials));
  state.active.mockReturnValue('/test/runtime');
  state.legacy.mockReturnValue('/test/legacy');
  state.exists.mockImplementation((path: string) => filesystem.has(path));
  state.read.mockImplementation((path: string) => {
    if (!filesystem.has(path)) throw new Error('ENOENT');
    return filesystem.get(path);
  });
  state.write.mockImplementation((path: string, value: string) => { filesystem.set(path, value); });
  state.remove.mockImplementation((path: string) => { filesystem.delete(path); });
  state.unlink.mockImplementation((path: string) => { filesystem.delete(path); });
  state.list.mockReturnValue([]);
  state.log.mockReturnValue({ write: vi.fn() });
  state.exec.mockImplementation((_path, _args, _options, done) => done(null, '', ''));
  state.connect.mockImplementation(() => fakeConnection('connect'));
  child = new PostgresChild();
  state.spawn.mockReturnValue(child);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('embedded PostgreSQL startup and shutdown', () => {
  it('detects both active and legacy bundles and fails before touching data when binaries are missing', async () => {
    expect(EmbeddedPostgresService.isInstalled()).toBe(true);
    state.active.mockReturnValue(null);
    filesystem.set('/test/legacy/bin/initdb', '');
    filesystem.set('/test/legacy/bin/postgres', '');
    expect(EmbeddedPostgresService.isInstalled()).toBe(true);
    filesystem.delete('/test/legacy/bin/initdb');
    expect(EmbeddedPostgresService.isInstalled()).toBe(false);
    await expect(new EmbeddedPostgresService('local').start(5541)).rejects.toThrow('PostgreSQL binaries not found');
    expect(state.mkdir).not.toHaveBeenCalled();
  });

  it('persists legacy credentials and preserves an incomplete non-empty data directory', async () => {
    filesystem.delete(credentialsFile);
    state.storeGet.mockReturnValue(credentials);
    state.list.mockReturnValue(['backup']);
    const database = new EmbeddedPostgresService('local');
    await expect(database.start(5541)).rejects.toThrow('Local database directory is incomplete');
    expect(state.storeGet).toHaveBeenCalledWith('standalone.local.pg');
    expect(state.write).toHaveBeenCalledWith(credentialsFile, JSON.stringify(credentials), { mode: 0o600 });
    expect(database.credentials).toEqual(credentials);
    expect(state.exec).not.toHaveBeenCalled();
    expect(state.remove).not.toHaveBeenCalled();
    expect(state.spawn).not.toHaveBeenCalled();
  });

  it('uses an external password file then creates the database before starting the process', async () => {
    const singleUser = new PostgresChild();
    state.spawn.mockImplementationOnce(() => {
      queueMicrotask(() => singleUser.emit('exit', 0));
      return singleUser;
    });
    const database = new EmbeddedPostgresService('local');
    await database.start(5541);
    expect(state.exec).toHaveBeenCalledExactlyOnceWith(bin + '/initdb', expect.arrayContaining([
      '-D', data, '-U', credentials.user, '--auth=password', '--pwfile=' + passwordFile,
    ]), expect.objectContaining({ env: expect.objectContaining({ LD_LIBRARY_PATH: '/test/runtime/lib' }) }), expect.any(Function));
    expect(state.write).toHaveBeenCalledWith(passwordFile, credentials.password);
    expect(state.unlink).toHaveBeenCalledWith(passwordFile);
    expect(filesystem.has(passwordFile)).toBe(false);
    expect(singleUser.stdin.write).toHaveBeenCalledExactlyOnceWith('CREATE DATABASE collection OWNER archive;\n');
    expect(singleUser.stdin.end).toHaveBeenCalledTimes(1);
    expect(state.spawn).toHaveBeenLastCalledWith(bin + '/postgres', ['-D', data, '-p', '5541', '-k', ''], expect.any(Object));
    expect(database.running).toBe(true);
    expect(database.port).toBe(5541);
    await database.start(5542);
    expect(state.spawn).toHaveBeenCalledTimes(2);
    const stopping = database.stop();
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    child.emit('exit', 0);
    await stopping;
    await vi.advanceTimersByTimeAsync(10000);
    expect(child.kill).toHaveBeenCalledTimes(1);
    expect(database.running).toBe(false);
  });

  it('removes the password file on initdb failure and never launches PostgreSQL', async () => {
    state.exec.mockImplementation((_path, _args, _options, done) => done(new Error('initdb error'), '', 'cannot initialize'));
    const database = new EmbeddedPostgresService('local');
    await expect(database.start(5541)).rejects.toThrow('initdb failed: cannot initialize');
    expect(filesystem.has(passwordFile)).toBe(false);
    expect(state.spawn).not.toHaveBeenCalled();
  });

  it('adopts a live postmaster from disk and stops the adopted process by its stored PID', async () => {
    filesystem.set(data + '/PG_VERSION', '16');
    filesystem.set(pidFile, '8472\n/test/data/pg-data\n10\n5661\n');
    const database = new EmbeddedPostgresService('local');
    await database.start(5541);
    expect(process.kill).toHaveBeenCalledWith(8472, 0);
    expect(state.connect).toHaveBeenCalledWith(5661, '127.0.0.1');
    expect(state.spawn).not.toHaveBeenCalled();
    expect(database.port).toBe(5661);

    await database.stop();
    expect(process.kill).toHaveBeenCalledWith(8472, 'SIGTERM');
    expect(database.running).toBe(false);
  });

  it('discards a stale pidfile, retries the readiness probe and escalates slow shutdown', async () => {
    filesystem.set(data + '/PG_VERSION', '16');
    filesystem.set(pidFile, '8472\n/test/data/pg-data\n10\n5661\n');
    vi.mocked(process.kill).mockImplementationOnce(() => { throw { code: 'ESRCH' }; });
    state.connect.mockImplementationOnce(() => fakeConnection('error'));
    const database = new EmbeddedPostgresService('local');
    const starting = database.start(5541);
    await vi.advanceTimersByTimeAsync(300);
    await starting;
    expect(state.remove).toHaveBeenCalledExactlyOnceWith(pidFile);
    expect(state.connect).toHaveBeenCalledTimes(2);

    const stopping = database.stop();
    await vi.advanceTimersByTimeAsync(10000);
    expect(child.kill.mock.calls).toEqual([['SIGTERM'], ['SIGKILL']]);
    child.emit('exit', 0);
    await stopping;
    expect(database.running).toBe(false);
  });

  it('releases candidate port probes and treats listen errors as an unavailable preferred port', async () => {
    const listener = Object.assign(new EventEmitter(), {
      close: vi.fn((done) => done()), address: vi.fn(() => ({ port: 5699 })), listen: vi.fn(),
    });
    listener.listen
      .mockImplementationOnce((_port, listening) => queueMicrotask(listening))
      .mockImplementationOnce(() => queueMicrotask(() => listener.emit('listening')))
      .mockImplementationOnce(() => queueMicrotask(() => listener.emit('error', new Error('occupied'))));
    state.server.mockReturnValue(listener);
    await expect(findFreePort()).resolves.toBe(5699);
    await expect(isPortAvailable(5530)).resolves.toBe(true);
    await expect(isPortAvailable(5531)).resolves.toBe(false);
    expect(listener.close).toHaveBeenCalledTimes(2);
    expect(listener.listen).toHaveBeenLastCalledWith({ host: '127.0.0.1', port: 5531 });
  });
});
