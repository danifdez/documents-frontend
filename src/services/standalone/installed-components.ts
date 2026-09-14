import fs from 'fs';
import path from 'path';
import type { ModelsVariant, ReleaseComponent } from './release-manifest';

export interface InstalledComponentState {
  schemaVersion: 1;
  component: ReleaseComponent;
  version: string;
  target: string;
  sha256: string;
  installedAt: string;
  path: string;
  variant?: ModelsVariant;
  previousPath?: string;
}

interface ComponentManifest {
  schemaVersion: 1;
  component: ReleaseComponent;
  version: string;
  target: string;
  entrypoint: string;
  variant?: ModelsVariant;
}

export function getComponentBase(userData: string, component: ReleaseComponent): string {
  return component === 'models'
    ? path.join(userData, 'models-service')
    : path.join(userData, 'standalone-services');
}

export function getComponentStatePath(userData: string, component: ReleaseComponent): string {
  const base = getComponentBase(userData, component);
  return component === 'models' ? path.join(base, 'state.json') : path.join(base, 'state', `${component}.json`);
}

function readJson(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function isSafeDirectoryName(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && path.basename(value) === value && value !== '.' && value !== '..';
}

export function readInstalledComponent(
  userData: string,
  component: ReleaseComponent,
  expectedTarget?: string,
): { root: string; state: InstalledComponentState; manifest: ComponentManifest } | null {
  const state = readJson(getComponentStatePath(userData, component)) as Partial<InstalledComponentState> | null;
  if (!state || state.schemaVersion !== 1 || state.component !== component || !isSafeDirectoryName(state.path)) return null;
  if (typeof state.version !== 'string' || typeof state.target !== 'string' || !/^[a-f0-9]{64}$/.test(state.sha256 ?? '')) return null;
  if (expectedTarget && state.target !== expectedTarget) return null;
  const root = path.join(getComponentBase(userData, component), state.path);
  const manifest = readJson(path.join(root, 'component-manifest.json')) as Partial<ComponentManifest> | null;
  if (!manifest || manifest.schemaVersion !== 1 || manifest.component !== component) return null;
  if (manifest.version !== state.version || manifest.target !== state.target || !isSafeEntrypoint(manifest.entrypoint)) return null;
  if (component === 'models' && manifest.variant !== state.variant) return null;
  if (!fs.existsSync(path.join(root, manifest.entrypoint))) return null;
  return { root, state: state as InstalledComponentState, manifest: manifest as ComponentManifest };
}

export function getActiveComponentRoot(userData: string, component: ReleaseComponent): string | null {
  return readInstalledComponent(userData, component, getCurrentTarget())?.root ?? null;
}

export function getCurrentTarget(platform = process.platform, arch = process.arch): string {
  if (!['linux', 'darwin', 'win32'].includes(platform)) throw new Error(`Unsupported platform: ${platform}`);
  if (!['x64', 'arm64'].includes(arch)) throw new Error(`Unsupported architecture: ${arch}`);
  return `${platform}-${arch}`;
}

export function removeModelsRuntime(userData: string): void {
  const base = getComponentBase(userData, 'models');
  if (!fs.existsSync(base)) return;
  for (const entry of fs.readdirSync(base)) {
    if (entry === 'data') continue;
    fs.rmSync(path.join(base, entry), { recursive: true, force: true });
  }
}

export function activateInstalledComponent(
  userData: string,
  next: Omit<InstalledComponentState, 'schemaVersion' | 'installedAt' | 'previousPath'>,
): InstalledComponentState {
  const statePath = getComponentStatePath(userData, next.component);
  const current = readJson(statePath) as Partial<InstalledComponentState> | null;
  const state: InstalledComponentState = {
    schemaVersion: 1,
    ...next,
    installedAt: new Date().toISOString(),
    ...(isSafeDirectoryName(current?.path) && current?.path !== next.path ? { previousPath: current.path } : {}),
  };
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const temporary = `${statePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { flag: 'wx' });
  fs.renameSync(temporary, statePath);
  return state;
}

export function legacyComponentRoot(userData: string, component: ReleaseComponent): string {
  return component === 'models'
    ? path.join(userData, 'models-service')
    : path.join(userData, 'standalone-services', component);
}

function isSafeEntrypoint(value: unknown): value is string {
  if (typeof value !== 'string' || !value || path.isAbsolute(value)) return false;
  return value.split(/[\\/]/).every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}
