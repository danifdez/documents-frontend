import fs from 'fs';
import os from 'os';
import path from 'path';

const paths = { userData: '', documents: '', home: '', appData: '' };
const originalXdgDataHome = process.env.XDG_DATA_HOME;

vi.mock('electron', () => ({
  app: { getPath: (name: keyof typeof paths) => paths[name] },
}));

vi.mock('electron-store', () => ({
  default: class Store {
    private readonly values = new Map<string, unknown>();
    get(key: string): unknown { return this.values.get(key); }
    set(key: string, value: unknown): void { this.values.set(key, value); }
  },
}));

vi.mock('../../src/services/standalone/installed-components', () => ({
  getActiveComponentRoot: (userData: string) => path.join(userData, 'postgres-runtime'),
  legacyComponentRoot: (userData: string) => path.join(userData, 'postgres-runtime'),
}));

import { EmbeddedPostgresService } from '../../src/services/standalone/embedded-postgres';
import { getPersistentLocalDataDir, migrateLegacyLocalData } from '../../src/services/standalone/local-data';

describe('EmbeddedPostgresService data safety', () => {
  beforeEach(() => {
    paths.userData = fs.mkdtempSync(path.join(os.tmpdir(), 'documents-pg-safety-'));
    paths.documents = fs.mkdtempSync(path.join(os.tmpdir(), 'documents-pg-backups-'));
    paths.home = fs.mkdtempSync(path.join(os.tmpdir(), 'documents-pg-home-'));
    paths.appData = fs.mkdtempSync(path.join(os.tmpdir(), 'documents-pg-appdata-'));
    process.env.XDG_DATA_HOME = path.join(paths.home, 'xdg-data');
    const bin = path.join(paths.userData, 'postgres-runtime', 'bin');
    fs.mkdirSync(bin, { recursive: true });
    fs.writeFileSync(path.join(bin, 'initdb'), '');
  });

  afterEach(() => {
    fs.rmSync(paths.userData, { recursive: true, force: true });
    fs.rmSync(paths.documents, { recursive: true, force: true });
    fs.rmSync(paths.home, { recursive: true, force: true });
    fs.rmSync(paths.appData, { recursive: true, force: true });
    if (originalXdgDataHome === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = originalXdgDataHome;
  });

  it('preserves a non-empty database directory without PG_VERSION', async () => {
    const dataDir = path.join(getPersistentLocalDataDir(), 'pg-data');
    fs.mkdirSync(dataDir, { recursive: true });
    const sentinel = path.join(dataDir, 'recoverable-file');
    fs.writeFileSync(sentinel, 'do not delete');

    await expect(new EmbeddedPostgresService('local').start()).rejects.toThrow('contents were preserved');
    expect(fs.readFileSync(sentinel, 'utf8')).toBe('do not delete');
  });

  it('moves legacy database and attachments out of the Electron profile', () => {
    const legacyRoot = path.join(paths.userData, 'local-server');
    fs.mkdirSync(path.join(legacyRoot, 'pg-data'), { recursive: true });
    fs.mkdirSync(path.join(legacyRoot, 'documents'), { recursive: true });
    fs.writeFileSync(path.join(legacyRoot, 'pg-data', 'PG_VERSION'), '17');
    fs.writeFileSync(path.join(legacyRoot, 'documents', 'document.txt'), 'content');

    migrateLegacyLocalData();

    expect(fs.existsSync(path.join(legacyRoot, 'pg-data'))).toBe(false);
    expect(fs.readFileSync(path.join(getPersistentLocalDataDir(), 'pg-data', 'PG_VERSION'), 'utf8')).toBe('17');
    expect(fs.readFileSync(path.join(getPersistentLocalDataDir(), 'documents', 'document.txt'), 'utf8')).toBe('content');
  });
});
