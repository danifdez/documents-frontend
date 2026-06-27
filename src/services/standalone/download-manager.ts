import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { execFile, spawn as spawnProcess } from 'child_process';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Unpack as TarUnpack } from 'tar';

export interface ComponentStatus {
  node: boolean;
  backend: boolean;
  postgres: boolean;
  qdrant: boolean;
  neo4j: boolean;
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

// Base URL for our own release assets (backend, models). Defaults to GitHub
// Releases, but can be pointed at a local "release" server via
// DOCUMENTS_RELEASE_BASE_URL so a self-hosted build can stand in for GitHub
// without changing the download/extract code path. The DB binaries always come
// from their official sources.
const RELEASE_BASE_URL =
  process.env.DOCUMENTS_RELEASE_BASE_URL?.replace(/\/+$/, '') ||
  `https://github.com/${GITHUB_REPO}/releases/download`;

// Component versions
const VERSIONS = {
  // Node runtime the backend is spawned with — bundled so a standalone install
  // never depends on a system Node being present (or matching). Pinned to the
  // version the backend is built/tested against.
  node: '20.19.5',
  backend: '1.0.0',
  postgres: '17.6.0',
  qdrant: '1.14.1',
  neo4j: '5.26.0',
  models: '1.0.0',
};

function getServicesDir(): string {
  return path.join(app.getPath('userData'), 'standalone-services');
}

function getModelsDir(): string {
  return path.join(app.getPath('userData'), 'models-service');
}

function getPlatformSuffix(): string {
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  switch (process.platform) {
    case 'linux': return `linux-${arch}`;
    case 'darwin': return `darwin-${arch}`;
    case 'win32': return `win32-${arch}`;
    default: throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

function getArchiveExt(): string {
  return process.platform === 'win32' ? 'zip' : 'tar.gz';
}

function getAssetUrl(component: string): string {
  const platform = getPlatformSuffix();
  const ext = getArchiveExt();
  const tag = `v${VERSIONS.backend}`;

  switch (component) {
    // Our code — from the release server (GitHub by default)
    case 'backend':
      return `${RELEASE_BASE_URL}/${tag}/documents-backend-v${VERSIONS.backend}-${platform}.${ext}`;
    case 'models-cpu':
      return `${RELEASE_BASE_URL}/${tag}/documents-models-v${VERSIONS.models}-${platform}-cpu.${ext}`;
    case 'models-gpu':
      return `${RELEASE_BASE_URL}/${tag}/documents-models-v${VERSIONS.models}-${platform}-gpu.${ext}`;

    // Node runtime — directly from nodejs.org
    case 'node':
      return getNodeUrl(platform);

    // Databases — directly from official sources
    case 'postgres':
      return getPostgresUrl(platform);
    case 'qdrant':
      return getQdrantUrl(platform);
    case 'neo4j':
      return getNeo4jUrl(platform);

    default:
      throw new Error(`Unknown component: ${component}`);
  }
}

function getNodeUrl(platform: string): string {
  const base = `https://nodejs.org/dist/v${VERSIONS.node}`;
  switch (platform) {
    case 'linux-x64':    return `${base}/node-v${VERSIONS.node}-linux-x64.tar.gz`;
    case 'linux-arm64':  return `${base}/node-v${VERSIONS.node}-linux-arm64.tar.gz`;
    case 'darwin-x64':   return `${base}/node-v${VERSIONS.node}-darwin-x64.tar.gz`;
    case 'darwin-arm64': return `${base}/node-v${VERSIONS.node}-darwin-arm64.tar.gz`;
    case 'win32-x64':    return `${base}/node-v${VERSIONS.node}-win-x64.zip`;
    default: throw new Error(`No Node.js binary for: ${platform}`);
  }
}

function getPostgresUrl(platform: string): string {
  const base = 'https://repo1.maven.org/maven2/io/zonky/test/postgres';
  let jarPlatform: string;
  switch (platform) {
    case 'linux-x64':   jarPlatform = 'linux-amd64'; break;
    case 'linux-arm64':  jarPlatform = 'linux-arm64v8'; break;
    case 'darwin-x64':  jarPlatform = 'darwin-amd64'; break;
    case 'darwin-arm64': jarPlatform = 'darwin-arm64v8'; break;
    case 'win32-x64':   jarPlatform = 'windows-amd64'; break;
    default: throw new Error(`No PostgreSQL binary for: ${platform}`);
  }
  return `${base}/embedded-postgres-binaries-${jarPlatform}/${VERSIONS.postgres}/embedded-postgres-binaries-${jarPlatform}-${VERSIONS.postgres}.jar`;
}

function getQdrantUrl(platform: string): string {
  const base = `https://github.com/qdrant/qdrant/releases/download/v${VERSIONS.qdrant}`;
  switch (platform) {
    case 'linux-x64':   return `${base}/qdrant-x86_64-unknown-linux-musl.tar.gz`;
    case 'linux-arm64':  return `${base}/qdrant-aarch64-unknown-linux-musl.tar.gz`;
    case 'darwin-x64':  return `${base}/qdrant-x86_64-apple-darwin.tar.gz`;
    case 'darwin-arm64': return `${base}/qdrant-aarch64-apple-darwin.tar.gz`;
    case 'win32-x64':   return `${base}/qdrant-x86_64-pc-windows-msvc.zip`;
    default: throw new Error(`No Qdrant binary for: ${platform}`);
  }
}

function getNeo4jUrl(platform: string): string {
  const base = `https://dist.neo4j.org/neo4j-community-${VERSIONS.neo4j}`;
  if (platform === 'win32-x64') return `${base}-windows.zip`;
  return `${base}-unix.tar.gz`;
}

/**
 * Absolute path to the bundled Node executable, or null if it isn't installed.
 * On Unix the tarball puts it at node/bin/node; the Windows zip puts node.exe
 * at the package root.
 */
export function getBundledNodePath(): string | null {
  const nodeDir = path.join(getServicesDir(), 'node');
  const unix = path.join(nodeDir, 'bin', 'node');
  if (fs.existsSync(unix)) return unix;
  const win = path.join(nodeDir, 'node.exe');
  if (fs.existsSync(win)) return win;
  return null;
}

export function checkInstalled(): ComponentStatus {
  const servicesDir = getServicesDir();
  const ext = process.platform === 'win32' ? '.exe' : '';

  return {
    node: getBundledNodePath() !== null,
    backend: fs.existsSync(path.join(servicesDir, 'backend', 'dist', 'src', 'main.js')),
    postgres: fs.existsSync(path.join(servicesDir, 'postgres', 'bin', 'postgres' + ext)),
    qdrant: fs.existsSync(path.join(servicesDir, 'qdrant', 'qdrant' + ext)),
    neo4j: fs.existsSync(path.join(servicesDir, 'neo4j', 'bin', process.platform === 'win32' ? 'neo4j.bat' : 'neo4j')),
    models: fs.existsSync(path.join(getModelsDir(), 'documents-models' + ext))
      || fs.existsSync(path.join(getModelsDir(), 'jobs' + ext)),
  };
}

export function isStandaloneReady(): boolean {
  const status = checkInstalled();
  return status.backend && status.postgres;
}

export function detectGpu(): GpuInfo {
  const result: GpuInfo = { available: false, name: null, cuda: false, vramGB: 0 };

  try {
    // Try nvidia-smi (Linux/Windows). memory.total comes back in MiB (nounits).
    const { execFileSync } = require('child_process');
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
      const { execFileSync } = require('child_process');
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
  component: string,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> {
  const isModels = component === 'models-cpu' || component === 'models-gpu';
  const destDir = isModels ? getModelsDir() : path.join(getServicesDir(), component);

  fs.mkdirSync(destDir, { recursive: true });

  const url = getAssetUrl(component);
  const tmpFile = path.join(app.getPath('temp'), `documents-download-${component}-${Date.now()}`);

  // Emit an initial event so the UI shows what's starting before the first byte
  // arrives (otherwise the wizard sits on a blank "Preparing…").
  if (onProgress) {
    onProgress({ component, downloaded: 0, total: 0, percent: 0 });
  }

  try {
    // Download is the first half of the component's progress (0-50%).
    await downloadFile(url, tmpFile, (downloaded, total) => {
      if (onProgress) {
        const frac = total > 0 ? downloaded / total : 0;
        onProgress({ component, downloaded, total, percent: Math.round(frac * 50) });
      }
    });

    // Extraction is the second half (50-100%). Decompressing the multi-GB models
    // bundle takes a while, so report byte-level progress to keep the bar moving
    // instead of freezing on a single fixed value.
    // PostgreSQL jar is a zip, Qdrant/Neo4j are tar.gz or zip.
    const isZip = url.endsWith('.zip') || url.endsWith('.jar');
    await extractArchive(tmpFile, destDir, isZip, (extractPercent) => {
      if (onProgress) {
        onProgress({ component, downloaded: 0, total: 0, percent: 50 + Math.round(extractPercent / 2) });
      }
    });

    // Component-specific normalisation so every service ends up at the path
    // checkInstalled() / the embedded services expect.
    await normalizeExtraction(component, destDir);

    if (process.platform !== 'win32') {
      makeBinariesExecutable(destDir);
    }
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

// Flattens/unpacks freshly extracted archives whose internal layout does not
// match the path the rest of the app expects.
async function normalizeExtraction(component: string, destDir: string): Promise<void> {
  if (component === 'postgres') {
    // The zonky jar (extracted as a zip) holds a <platform>.txz with the real
    // bin/lib/share tree. Extract it in place via the system tar (xz), then
    // remove the jar leftovers.
    const txz = fs.readdirSync(destDir).find((f) => f.endsWith('.txz'));
    if (!txz) {
      throw new Error('PostgreSQL archive did not contain the expected .txz payload');
    }
    await new Promise<void>((resolve, reject) => {
      execFile('tar', ['xf', path.join(destDir, txz), '-C', destDir], (err) =>
        err ? reject(new Error(`Failed to extract PostgreSQL binaries: ${err.message}`)) : resolve(),
      );
    });
    try { fs.unlinkSync(path.join(destDir, txz)); } catch { /* ignore */ }
    try { fs.rmSync(path.join(destDir, 'META-INF'), { recursive: true, force: true }); } catch { /* ignore */ }
  } else if (component === 'node') {
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
  } else if (component === 'neo4j') {
    // Neo4j tarballs nest everything under neo4j-community-<version>/. Lift its
    // contents up one level so bin/, conf/, lib/ sit directly in destDir.
    const inner = fs.readdirSync(destDir).find(
      (f) => f.startsWith('neo4j-community-') && fs.statSync(path.join(destDir, f)).isDirectory(),
    );
    if (inner) {
      const innerPath = path.join(destDir, inner);
      for (const entry of fs.readdirSync(innerPath)) {
        fs.renameSync(path.join(innerPath, entry), path.join(destDir, entry));
      }
      fs.rmdirSync(innerPath);
    }
  } else if (component === 'models-cpu' || component === 'models-gpu') {
    // Older bundles nest everything under documents-models/ (doubled prefix), so
    // destDir/documents-models is a dir and spawn() of it returns EACCES. Lift the
    // contents up one level. Rename the inner dir to a temp name first to avoid
    // colliding with the binary that is itself named 'documents-models'.
    const inner = path.join(destDir, 'documents-models');
    if (fs.existsSync(inner) && fs.statSync(inner).isDirectory()) {
      const tmp = path.join(destDir, '.unwrap');
      fs.rmSync(tmp, { recursive: true, force: true });
      fs.renameSync(inner, tmp);
      for (const entry of fs.readdirSync(tmp)) {
        fs.renameSync(path.join(tmp, entry), path.join(destDir, entry));
      }
      fs.rmdirSync(tmp);
    }
  }
}

export async function downloadAll(
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> {
  const coreComponents = ['node', 'postgres', 'backend', 'qdrant', 'neo4j'];
  for (const component of coreComponents) {
    const status = checkInstalled();
    if (status[component as keyof ComponentStatus]) continue;
    await downloadComponent(component, onProgress);
  }
}

/**
 * Installs exactly the services a wizard profile asks for. `components` comes
 * from the hardware report (e.g. ['postgres','backend','models-cpu','qdrant']).
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
  qdrant: 0.5,
  neo4j: 1,
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
  const modelsDir = getModelsDir();
  if (fs.existsSync(modelsDir)) {
    fs.rmSync(modelsDir, { recursive: true, force: true });
  }
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
  const modelsDir = getModelsDir();
  const ext = process.platform === 'win32' ? '.exe' : '';

  // Find the binary — PyInstaller may name it documents-models or jobs
  let binary = path.join(modelsDir, 'documents-models' + ext);
  if (!fs.existsSync(binary)) {
    binary = path.join(modelsDir, 'jobs' + ext);
  }
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
        HF_HOME: path.join(modelsDir, 'hf-cache'),
        MODELS_MODEL_DIR: path.join(modelsDir, 'models'),
        // Importing the worker writes a .worker_id at module load; without a
        // writable MODELS_DATA_DIR it falls back to a path inside the read-only
        // bundle (…/worker/..) that can't be resolved in a frozen build.
        MODELS_DATA_DIR: modelsDir,
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
          doRequest(res.headers.location, redirectCount + 1);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${res.statusCode} for ${url}`));
          return;
        }

        const total = parseInt(res.headers['content-length'] || '0', 10);
        let downloaded = 0;

        const fileStream = fs.createWriteStream(destPath);
        res.on('data', (chunk: Buffer) => {
          downloaded += chunk.length;
          if (onProgress) onProgress(downloaded, total);
        });

        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
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
  const extract = new TarUnpack({ cwd: destDir, strip: 0 });
  await pipeline(source, gunzip, extract);
}

async function extractZip(archivePath: string, destDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (process.platform === 'win32') {
      execFile('powershell', [
        '-NoProfile', '-Command',
        `Expand-Archive -Path '${archivePath}' -DestinationPath '${destDir}' -Force`,
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    } else {
      execFile('unzip', ['-qo', archivePath, '-d', destDir], (err) => {
        if (err) reject(err);
        else resolve();
      });
    }
  });
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
