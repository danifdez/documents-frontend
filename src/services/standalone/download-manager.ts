import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { execFile, spawn as spawnProcess } from 'child_process';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Extract as tarExtract } from 'tar';

export interface ComponentStatus {
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
}

export interface GpuInfo {
  available: boolean;
  name: string | null;
  cuda: boolean;
}

// GitHub repository for release assets
const GITHUB_REPO = 'danifdez/documents';

// Component versions
const VERSIONS = {
  backend: '1.0.0',
  postgres: '17.6',
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
    // Our code — from GitHub Releases
    case 'backend':
      return `https://github.com/${GITHUB_REPO}/releases/download/${tag}/documents-backend-v${VERSIONS.backend}-${platform}.${ext}`;
    case 'models-cpu':
      return `https://github.com/${GITHUB_REPO}/releases/download/${tag}/documents-models-v${VERSIONS.models}-${platform}-cpu.${ext}`;
    case 'models-gpu':
      return `https://github.com/${GITHUB_REPO}/releases/download/${tag}/documents-models-v${VERSIONS.models}-${platform}-gpu.${ext}`;

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

export function checkInstalled(): ComponentStatus {
  const servicesDir = getServicesDir();
  const ext = process.platform === 'win32' ? '.exe' : '';

  return {
    backend: fs.existsSync(path.join(servicesDir, 'backend', 'dist', 'main.js')),
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
  const result: GpuInfo = { available: false, name: null, cuda: false };

  try {
    // Try nvidia-smi (Linux/Windows)
    const { execFileSync } = require('child_process');
    const output = execFileSync('nvidia-smi', ['--query-gpu=name', '--format=csv,noheader,nounits'], {
      timeout: 5000,
      encoding: 'utf-8',
    });
    if (output && output.trim()) {
      result.available = true;
      result.name = output.trim().split('\n')[0];
      result.cuda = true;
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

  try {
    await downloadFile(url, tmpFile, (downloaded, total) => {
      if (onProgress) {
        onProgress({
          component,
          downloaded,
          total,
          percent: total > 0 ? Math.round((downloaded / total) * 100) : 0,
        });
      }
    });

    // PostgreSQL jar is a zip, Qdrant/Neo4j are tar.gz or zip
    const isZip = url.endsWith('.zip') || url.endsWith('.jar');
    await extractArchive(tmpFile, destDir, isZip);

    if (process.platform !== 'win32') {
      makeBinariesExecutable(destDir);
    }
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

export async function downloadAll(
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> {
  const coreComponents = ['postgres', 'backend', 'qdrant', 'neo4j'];
  for (const component of coreComponents) {
    const status = checkInstalled();
    if (status[component as keyof ComponentStatus]) continue;
    await downloadComponent(component, onProgress);
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
 * the actual ML models (embeddings, spaCy, Whisper, etc.)
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
 *  - BAAI/bge-small-en-v1.5 (embeddings, ~130 MB)
 *  - en_core_web_sm (spaCy NER, ~12 MB)
 *  - faster-whisper-small (transcription, ~460 MB)
 *  - Phi-4-mini-instruct GGUF (LLM, ~2.5 GB)
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
    onProgress({ component: 'ml-models', downloaded: 0, total: 0, percent: 0 });
  }

  return new Promise((resolve, reject) => {
    const proc = spawnProcess(binary, ['--setup'], {
      env: {
        ...process.env,
        HF_HOME: path.join(modelsDir, 'hf-cache'),
        SPACY_DATA: path.join(modelsDir, 'spacy-data'),
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
          onProgress({ component: 'ml-models', downloaded: 100, total: 100, percent: 100 });
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

async function extractArchive(archivePath: string, destDir: string, isZip: boolean): Promise<void> {
  if (isZip) {
    await extractZip(archivePath, destDir);
  } else {
    await extractTarGz(archivePath, destDir);
  }
}

async function extractTarGz(archivePath: string, destDir: string): Promise<void> {
  const source = fs.createReadStream(archivePath);
  const gunzip = createGunzip();
  const extract = tarExtract({ cwd: destDir, strip: 0 });
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
