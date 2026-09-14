import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { execFile, execFileSync, spawn as spawnProcess } from 'child_process';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Unpack as TarUnpack } from 'tar';
import { createHash } from 'crypto';
import { getModelsBinaryPath } from './models-binary';
import { assertSafeArchiveEntry } from './archive-safety';
import {
  resolveArtifactUrl,
  selectReleaseArtifact,
  validateReleaseManifest,
  type ReleaseArtifact,
  type ReleaseComponent,
  type ReleaseManifest,
} from './release-manifest';
import {
  activateInstalledComponent,
  getActiveComponentRoot,
  getComponentBase,
  getCurrentTarget,
  legacyComponentRoot,
  readInstalledComponent,
  removeModelsRuntime,
} from './installed-components';

export interface ComponentStatus {
  node: boolean;
  backend: boolean;
  postgres: boolean;
  models: boolean;
}

export interface DownloadProgress {
  component: string;
  downloaded: number;
  total: number;
  percent: number;
  /** 1-based index of the current step in the whole install. */
  step?: number;
  /** Total number of steps in the whole install. */
  totalSteps?: number;
  /** Weighted progress across the entire install (0-100). */
  overallPercent?: number;
}

export interface GpuInfo {
  available: boolean;
  name: string | null;
  cuda: boolean;
  vramGB: number;
}

// GitHub repository for release assets
const GITHUB_REPO = 'danifdez/documents';

const RELEASE_BASE_URL =
  process.env.DOCUMENTS_RELEASE_BASE_URL?.replace(/\/+$/, '') ||
  `https://github.com/${GITHUB_REPO}/releases/download/v${app.getVersion()}`;

let releaseManifestPromise: Promise<{ manifest: ReleaseManifest; url: string }> | null = null;

function getServicesDir(): string {
  return path.join(app.getPath('userData'), 'standalone-services');
}

function getModelsDir(): string {
  return path.join(app.getPath('userData'), 'models-service');
}

export function getPlatformSuffix(): string {
  return getCurrentTarget();
}

function getReleaseManifestUrl(): string {
  return process.env.DOCUMENTS_RELEASE_MANIFEST_URL || `${RELEASE_BASE_URL}/release.json`;
}

async function loadReleaseManifest(): Promise<{ manifest: ReleaseManifest; url: string }> {
  if (!releaseManifestPromise) {
    releaseManifestPromise = (async () => {
      const url = getReleaseManifestUrl();
      const temporary = path.join(app.getPath('temp'), `documents-release-${Date.now()}.partial`);
      try {
        await downloadFile(url, temporary, undefined, 5 * 1024 * 1024, false);
        const manifest = validateReleaseManifest(JSON.parse(fs.readFileSync(temporary, 'utf8')));
        return { manifest, url };
      } finally {
        try { fs.unlinkSync(temporary); } catch { /* ignore */ }
      }
    })().catch((error) => {
      releaseManifestPromise = null;
      throw error;
    });
  }
  return releaseManifestPromise;
}


/**
 * Absolute path to the bundled Node executable, or null if it isn't installed.
 * On Unix the tarball puts it at node/bin/node; the Windows zip puts node.exe
 * at the package root.
 */
export function getBundledNodePath(): string | null {
  const userData = app.getPath('userData');
  const nodeDir = getActiveComponentRoot(userData, 'node') ?? legacyComponentRoot(userData, 'node');
  const unix = path.join(nodeDir, 'bin', 'node');
  if (fs.existsSync(unix)) return unix;
  const win = path.join(nodeDir, 'node.exe');
  if (fs.existsSync(win)) return win;
  return null;
}

export function checkInstalled(): ComponentStatus {
  const userData = app.getPath('userData');
  const ext = process.platform === 'win32' ? '.exe' : '';
  const target = getPlatformSuffix();
  const backend = readInstalledComponent(userData, 'backend', target);
  const postgres = readInstalledComponent(userData, 'postgres', target);
  const models = readInstalledComponent(userData, 'models', target);

  return {
    node: getBundledNodePath() !== null,
    backend: backend !== null || fs.existsSync(path.join(legacyComponentRoot(userData, 'backend'), 'dist', 'src', 'main.js')),
    postgres: postgres !== null || fs.existsSync(path.join(legacyComponentRoot(userData, 'postgres'), 'bin', 'postgres' + ext)),
    models: models !== null || fs.existsSync(getModelsBinaryPath(legacyComponentRoot(userData, 'models'))),
  };
}

export function isStandaloneReady(): boolean {
  const status = checkInstalled();
  return status.node && status.backend && status.postgres;
}

export function detectGpu(): GpuInfo {
  const result: GpuInfo = { available: false, name: null, cuda: false, vramGB: 0 };

  try {
    // Try nvidia-smi (Linux/Windows). memory.total comes back in MiB (nounits).
    const output = execFileSync('nvidia-smi', ['--query-gpu=name,memory.total', '--format=csv,noheader,nounits'], {
      timeout: 5000,
      encoding: 'utf-8',
    });
    if (output && output.trim()) {
      const [name, mib] = output.trim().split('\n')[0].split(',').map((s: string) => s.trim());
      result.available = true;
      result.name = name;
      result.cuda = true;
      result.vramGB = Math.round((parseInt(mib, 10) || 0) / 1024);
    }
  } catch {
    // nvidia-smi not found or no GPU
  }

  if (!result.available && process.platform === 'darwin') {
    // macOS: check for Apple Silicon GPU (Metal)
    try {
      const output = execFileSync('system_profiler', ['SPDisplaysDataType'], {
        timeout: 5000,
        encoding: 'utf-8',
      });
      if (output && output.includes('Apple')) {
        result.available = true;
        const match = output.match(/Chipset Model:\s*(.+)/);
        result.name = match ? match[1].trim() : 'Apple GPU';
        result.cuda = false; // Metal, not CUDA
      }
    } catch {
      // No GPU info available
    }
  }

  return result;
}

export async function downloadComponent(
  componentName: string,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> {
  const { manifest, url: manifestUrl } = await loadReleaseManifest();
  const target = getPlatformSuffix();
  const { component, variant, artifact } = selectReleaseArtifact(manifest, target, componentName);
  const url = resolveArtifactUrl(manifestUrl, artifact.file);
  const userData = app.getPath('userData');
  const baseDir = getComponentBase(userData, component);
  const installName = getInstallDirectoryName(component, artifact, variant);
  const finalDir = path.join(baseDir, installName);
  const stagingDir = path.join(baseDir, `.${installName}.${Date.now()}.staging`);
  const tmpFile = path.join(app.getPath('temp'), `documents-download-${componentName}-${Date.now()}.partial`);

  if (onProgress) {
    onProgress({ component: componentName, downloaded: 0, total: artifact.size, percent: 0 });
  }

  fs.mkdirSync(baseDir, { recursive: true });
  try {
    await downloadFile(url, tmpFile, (downloaded, total) => {
      if (onProgress) {
        const frac = total > 0 ? downloaded / total : 0;
        onProgress({ component: componentName, downloaded, total, percent: Math.round(frac * 50) });
      }
    }, artifact.size);

    const checksum = await sha256File(tmpFile);
    if (checksum !== artifact.sha256) throw new Error(`Checksum mismatch for ${componentName}`);

    fs.mkdirSync(stagingDir, { recursive: true });
    const isZip = artifact.file.endsWith('.zip');
    await extractArchive(tmpFile, stagingDir, isZip, (extractPercent) => {
      if (onProgress) {
        onProgress({ component: componentName, downloaded: artifact.size, total: artifact.size, percent: 50 + Math.round(extractPercent / 2) });
      }
    });

    await normalizeExtraction(componentName, stagingDir);
    if (process.platform !== 'win32') {
      makeBinariesExecutable(stagingDir);
    }

    validateExtractedComponent(stagingDir, component, artifact, target, variant);
    await runInstalledSelfCheck(stagingDir, component, artifact);

    if (fs.existsSync(finalDir)) {
      const existingManifest = readComponentManifest(finalDir);
      if (existingManifest?.version !== artifact.version || existingManifest?.target !== target) {
        throw new Error(`Installation path collision for ${componentName}`);
      }
      replaceDirectory(stagingDir, finalDir);
    } else {
      fs.renameSync(stagingDir, finalDir);
    }

    activateInstalledComponent(userData, {
      component,
      version: artifact.version,
      target,
      sha256: artifact.sha256,
      path: installName,
      ...(variant ? { variant } : {}),
    });
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
    try { fs.rmSync(stagingDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

function replaceDirectory(stagingDir: string, finalDir: string): void {
  const backupDir = `${finalDir}.${Date.now()}.replaced`;
  fs.renameSync(finalDir, backupDir);
  try {
    fs.renameSync(stagingDir, finalDir);
    fs.rmSync(backupDir, { recursive: true, force: true });
  } catch (error) {
    if (!fs.existsSync(finalDir) && fs.existsSync(backupDir)) fs.renameSync(backupDir, finalDir);
    throw error;
  }
}

function getInstallDirectoryName(component: ReleaseComponent, artifact: ReleaseArtifact, variant?: string): string {
  const version = artifact.version.replace(/[^a-zA-Z0-9._+-]/g, '_');
  const suffix = variant ? `-${variant}` : '';
  return `${component}-${version}${suffix}-${artifact.sha256.slice(0, 12)}`;
}

function readComponentManifest(root: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'component-manifest.json'), 'utf8'));
  } catch {
    return null;
  }
}

function validateExtractedComponent(
  root: string,
  component: ReleaseComponent,
  artifact: ReleaseArtifact,
  target: string,
  variant?: string,
): void {
  const componentManifest = readComponentManifest(root);
  if (!componentManifest || componentManifest.schemaVersion !== 1 || componentManifest.component !== component) {
    throw new Error(`Invalid ${component} component manifest`);
  }
  if (componentManifest.version !== artifact.version || componentManifest.target !== target) {
    throw new Error(`${component} package does not match the selected release`);
  }
  if (variant && componentManifest.variant !== variant) throw new Error(`Models variant mismatch: expected ${variant}`);
  if (typeof componentManifest.entrypoint !== 'string' || !isSafeArchivePath(componentManifest.entrypoint)) {
    throw new Error(`Invalid ${component} entrypoint`);
  }
  if (!fs.existsSync(path.join(root, componentManifest.entrypoint))) throw new Error(`${component} entrypoint is missing`);
}

async function runInstalledSelfCheck(root: string, component: ReleaseComponent, artifact: ReleaseArtifact): Promise<void> {
  const componentManifest = readComponentManifest(root)!;
  const entrypoint = path.join(root, componentManifest.entrypoint as string);
  if (component === 'backend') return;
  if (component === 'models') {
    const dataDir = fs.mkdtempSync(path.join(app.getPath('temp'), 'documents-models-check-'));
    try {
      await execFilePromise(entrypoint, ['--self-check'], {
        cwd: root,
        env: { ...process.env, MODELS_DATA_DIR: dataDir },
        timeout: 120000,
      });
    } finally {
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
    return;
  }
  const expectedVersion = component === 'node' ? artifact.version : String(artifact.runtime?.postgres ?? '').split('+')[0];
  const output = await execFilePromise(entrypoint, ['--version'], { cwd: root, timeout: 30000 });
  if (expectedVersion && !output.includes(expectedVersion)) throw new Error(`${component} self-check reported an unexpected version`);
}

function execFilePromise(
  executable: string,
  args: string[],
  options: { cwd: string; timeout: number; env?: NodeJS.ProcessEnv },
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(executable, args, options, (error, stdout, stderr) => {
      if (error) reject(new Error(`Component self-check failed: ${(stderr || error.message).trim()}`));
      else resolve(stdout.toString());
    });
  });
}

// Flattens/unpacks freshly extracted archives whose internal layout does not
// match the path the rest of the app expects.
async function normalizeExtraction(component: string, destDir: string): Promise<void> {
  if (component === 'node') {
    // Node archives nest everything under node-v<version>-<platform>/. Lift its
    // contents up one level so bin/ (or node.exe on Windows) sits in destDir.
    const inner = fs.readdirSync(destDir).find(
      (f) => f.startsWith('node-v') && fs.statSync(path.join(destDir, f)).isDirectory(),
    );
    if (inner) {
      const innerPath = path.join(destDir, inner);
      for (const entry of fs.readdirSync(innerPath)) {
        fs.renameSync(path.join(innerPath, entry), path.join(destDir, entry));
      }
      fs.rmdirSync(innerPath);
    }
  }
}

export async function downloadAll(
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> {
  const coreComponents = ['node', 'postgres', 'backend'];
  for (const component of coreComponents) {
    const status = checkInstalled();
    if (status[component as keyof ComponentStatus]) continue;
    await downloadComponent(component, onProgress);
  }
}

/**
 * Installs exactly the services a wizard profile asks for. `components` comes
 * from the hardware report (e.g. ['postgres','backend','models-cpu']).
 * The models bundle goes through installModels (bundle + ML model download);
 * plain services go through downloadComponent.
 */
// Rough *time* weight per step (not size), so the global bar tracks where you
// really are in wall-clock terms. The ML model download (Qwen GGUF + whisper +
// embeddings, from slower HuggingFace mirrors) dominates everything else.
const STEP_WEIGHT: Record<string, number> = {
  node: 0.5,
  postgres: 1,
  backend: 0.5,
  'models-cpu': 3,
  'models-gpu': 5,
  'ai-models': 12, // setupModels: Qwen GGUF + whisper + embeddings from HuggingFace
};

interface Step {
  label: string;
  weight: number;
  run: (onProgress?: (p: DownloadProgress) => void) => Promise<void>;
}

export async function installProfile(
  components: string[],
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> {
  // Build the concrete step list up front so we can report "step X of N" and a
  // weighted overall percentage. Already-installed plain services are skipped;
  // the models bundle expands into two heavy steps (download + ML setup).
  // The backend is spawned with the bundled Node runtime, so pull it in
  // whenever the backend is installed even though the hardware report doesn't
  // list it as a separate component.
  const comps = components.includes('backend') && !components.includes('node')
    ? ['node', ...components]
    : components;

  const steps: Step[] = [];
  for (const component of comps) {
    if (component === 'models-cpu' || component === 'models-gpu') {
      steps.push({ label: component, weight: STEP_WEIGHT[component], run: (op) => downloadComponent(component, op) });
      steps.push({ label: 'ai-models', weight: STEP_WEIGHT['ai-models'], run: (op) => setupModels(op) });
      continue;
    }
    if (checkInstalled()[component as keyof ComponentStatus]) continue;
    steps.push({ label: component, weight: STEP_WEIGHT[component] ?? 0.1, run: (op) => downloadComponent(component, op) });
  }

  const totalWeight = steps.reduce((sum, s) => sum + s.weight, 0) || 1;
  let doneWeight = 0;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const emit = (p: DownloadProgress) => {
      const overallPercent = Math.min(100, Math.round(((doneWeight + step.weight * ((p.percent || 0) / 100)) / totalWeight) * 100));
      onProgress?.({ ...p, component: p.component || step.label, step: i + 1, totalSteps: steps.length, overallPercent });
    };
    emit({ component: step.label, downloaded: 0, total: 0, percent: 0 }); // show the step immediately
    await step.run(emit);
    doneWeight += step.weight;
  }
}

export async function uninstallServices(): Promise<void> {
  const servicesDir = getServicesDir();
  if (fs.existsSync(servicesDir)) {
    fs.rmSync(servicesDir, { recursive: true, force: true });
  }
}

export async function uninstallModels(): Promise<void> {
  removeModelsRuntime(app.getPath('userData'));
}

/**
 * Downloads the models service bundle AND runs --setup to download
 * the actual ML models (embeddings, Whisper, the LLM, etc.)
 */
export async function installModels(
  variant: 'models-cpu' | 'models-gpu',
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> {
  // 1. Download the models service bundle
  await downloadComponent(variant, onProgress);

  // 2. Run the models service with --setup to download ML models
  await setupModels(onProgress);
}

/**
 * Spawns the models service binary with --setup flag.
 * The models service downloads all required ML models:
 *  - intfloat/multilingual-e5-small (embeddings, ~470 MB)
 *  - faster-whisper-small (transcription, ~460 MB)
 *  - Qwen3-8B GGUF Q5_K_M (LLM, ~5.7 GB)
 */
export async function setupModels(
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> {
  const modelsDir = getActiveComponentRoot(app.getPath('userData'), 'models') ?? getModelsDir();
  const modelsDataDir = path.join(getModelsDir(), 'data');
  const binary = getModelsBinaryPath(modelsDir);
  if (!fs.existsSync(binary)) {
    throw new Error('Models service not found. Download it first.');
  }

  if (onProgress) {
    onProgress({ component: 'ai-models', downloaded: 0, total: 0, percent: 0 });
  }

  return new Promise((resolve, reject) => {
    const proc = spawnProcess(binary, ['--setup'], {
      env: {
        ...process.env,
        HF_HOME: path.join(modelsDataDir, 'hf-cache'),
        MODELS_MODEL_DIR: path.join(modelsDataDir, 'models'),
        // Importing the worker writes a .worker_id at module load; without a
        // writable MODELS_DATA_DIR it falls back to a path inside the read-only
        // bundle (…/worker/..) that can't be resolved in a frozen build.
        MODELS_DATA_DIR: modelsDataDir,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: modelsDir,
    });

    let lastLine = '';
    proc.stdout?.on('data', (data: Buffer) => {
      lastLine = data.toString().trim();
      // Parse progress from stdout if the models service reports it
      // Expected format: "PROGRESS:<component>:<percent>"
      const match = lastLine.match(/^PROGRESS:(.+):(\d+)$/);
      if (match && onProgress) {
        onProgress({
          component: match[1],
          downloaded: parseInt(match[2]),
          total: 100,
          percent: parseInt(match[2]),
        });
      }
    });

    let stderr = '';
    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('exit', (code) => {
      if (code === 0) {
        if (onProgress) {
          onProgress({ component: 'ai-models', downloaded: 100, total: 100, percent: 100 });
        }
        resolve();
      } else {
        reject(new Error(`Models setup failed (exit ${code}): ${stderr.slice(-500)}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to run models setup: ${err.message}`));
    });
  });
}

// ── Internal helpers ──

function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (downloaded: number, total: number) => void,
  sizeLimit?: number,
  requireExactSize = true,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doRequest = (requestUrl: string, redirectCount: number) => {
      if (redirectCount > 10) {
        reject(new Error('Too many redirects'));
        return;
      }

      const client = requestUrl.startsWith('https') ? https : http;
      const req = client.get(requestUrl, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, requestUrl).toString();
          res.resume();
          doRequest(redirectUrl, redirectCount + 1);
          return;
        }

        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`Download failed: HTTP ${res.statusCode} for ${url}`));
          return;
        }

        const declaredSize = parseInt(res.headers['content-length'] || '0', 10);
        if (sizeLimit && declaredSize > sizeLimit) {
          res.destroy();
          reject(new Error(`Download exceeds expected size for ${url}`));
          return;
        }
        const total = sizeLimit && requireExactSize ? sizeLimit : declaredSize;
        let downloaded = 0;

        const fileStream = fs.createWriteStream(destPath);
        res.on('data', (chunk: Buffer) => {
          downloaded += chunk.length;
          if (sizeLimit && downloaded > sizeLimit) {
            req.destroy(new Error(`Download exceeds expected size for ${url}`));
            return;
          }
          if (onProgress) onProgress(downloaded, total);
        });

        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          if (sizeLimit && requireExactSize && downloaded !== sizeLimit) {
            reject(new Error(`Downloaded size mismatch for ${url}`));
          } else {
            resolve();
          }
        });
        fileStream.on('error', reject);
      });
      req.on('error', reject);
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error(`Download timed out for ${url}`));
      });
    };

    doRequest(url, 0);
  });
}

async function extractArchive(
  archivePath: string,
  destDir: string,
  isZip: boolean,
  onProgress?: (percent: number) => void,
): Promise<void> {
  if (isZip) {
    // zip/jar extraction is a single opaque shell call — no byte-level progress.
    onProgress?.(0);
    await extractZip(archivePath, destDir);
    onProgress?.(100);
  } else {
    await extractTarGz(archivePath, destDir, onProgress);
  }
}

async function extractTarGz(
  archivePath: string,
  destDir: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  // Use bytes read from the (compressed) archive as a progress proxy — close
  // enough to keep the bar fluid while decompressing the multi-GB bundle.
  const total = fs.statSync(archivePath).size;
  let read = 0;
  const source = fs.createReadStream(archivePath);
  if (onProgress && total > 0) {
    source.on('data', (chunk: Buffer) => {
      read += chunk.length;
      onProgress(Math.min(100, Math.round((read / total) * 100)));
    });
  }
  const gunzip = createGunzip();
  const extract = new TarUnpack({
    cwd: destDir,
    strip: 0,
    preservePaths: false,
    filter: (entryPath, entry) => {
      assertSafeArchiveEntry(entryPath, entry.type, entry.linkpath);
      return true;
    },
  });
  await pipeline(source, gunzip, extract);
}

function isSafeArchivePath(entryPath: string): boolean {
  if (!entryPath || path.isAbsolute(entryPath) || /^[a-zA-Z]:/.test(entryPath)) return false;
  return entryPath.split(/[\\/]/).every((segment) => segment !== '..');
}

async function extractZip(archivePath: string, destDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (process.platform === 'win32') {
      reject(new Error('Secure ZIP extraction is not enabled for standalone releases yet.'));
    } else {
      execFile('unzip', ['-Z1', archivePath], (listError, stdout) => {
        if (listError) {
          reject(listError);
          return;
        }
        if (stdout.split(/\r?\n/).filter(Boolean).some((entry) => !isSafeArchivePath(entry))) {
          reject(new Error('ZIP archive contains an unsafe path'));
          return;
        }
        execFile('unzip', ['-qo', archivePath, '-d', destDir], (extractError) => {
          if (extractError) reject(extractError);
          else resolve();
        });
      });
    }
  });
}

async function sha256File(file: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

function makeBinariesExecutable(dir: string): void {
  const binDir = path.join(dir, 'bin');
  if (fs.existsSync(binDir)) {
    for (const file of fs.readdirSync(binDir)) {
      try { fs.chmodSync(path.join(binDir, file), 0o755); } catch { /* ignore */ }
    }
  }
  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isFile() && !file.includes('.')) {
      try { fs.chmodSync(fullPath, 0o755); } catch { /* ignore */ }
    }
  }
}
