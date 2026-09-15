import { app } from 'electron';
import fs from 'fs';
import path from 'path';

const PRODUCT_DATA_DIRECTORY = 'documents-frontend';

export function getPersistentLocalDataDir(): string {
  if (process.platform === 'linux') {
    const xdgDataHome = process.env.XDG_DATA_HOME || path.join(app.getPath('home'), '.local', 'share');
    return path.join(xdgDataHome, PRODUCT_DATA_DIRECTORY);
  }
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || app.getPath('appData'), PRODUCT_DATA_DIRECTORY);
  }
  // Electron's appData on macOS is ~/Library/Application Support.
  return path.join(app.getPath('appData'), PRODUCT_DATA_DIRECTORY);
}

/**
 * Moves user content out of Electron's disposable profile before any local
 * service starts. It also accepts the short-lived Documents location from an
 * earlier development build. rename is atomic when both directories are on the usual user
 * filesystem; on a cross-device setup we fail without copying or deleting so
 * the user can move the data deliberately.
 */
export function migrateLegacyLocalData(): void {
  const persistentRoot = getPersistentLocalDataDir();
  const legacyRoots = [
    path.join(app.getPath('userData'), 'local-server'),
    path.join(app.getPath('documents'), 'Documents Local Data'),
  ];

  for (const legacyRoot of legacyRoots) {
    for (const name of ['pg-data', 'documents', 'pg-credentials.json']) {
      const source = path.join(legacyRoot, name);
      const target = path.join(persistentRoot, name);
      if (!fs.existsSync(source) || fs.existsSync(target)) continue;

      fs.mkdirSync(persistentRoot, { recursive: true });
      try {
        fs.renameSync(source, target);
      } catch (error: unknown) {
        const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
        if (code === 'EXDEV') {
          throw new Error(`Local data was not moved because its destination is on another filesystem. Move ${source} to ${target} before starting Documents.`);
        }
        throw error;
      }
    }
  }
}
