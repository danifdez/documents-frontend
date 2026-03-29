import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { ChildProcess, spawn } from 'child_process';
import http from 'http';
import { findFreePort } from './embedded-postgres';

export class EmbeddedQdrantService {
  private process: ChildProcess | null = null;
  private _port: number = 0;
  private _running = false;

  constructor(_workspaceId?: string) {
    // workspaceId kept for API compatibility but paths are now global
  }

  private getStorageDir(): string {
    return path.join(app.getPath('userData'), 'local-server', 'qdrant-storage');
  }

  private getLogPath(): string {
    return path.join(app.getPath('userData'), 'local-server', 'logs', 'qdrant.log');
  }

  private getBinaryPath(): string {
    const binaryName = process.platform === 'win32' ? 'qdrant.exe' : 'qdrant';

    // Downloaded standalone services (primary location)
    const downloadedPath = path.join(app.getPath('userData'), 'standalone-services', 'qdrant', binaryName);
    if (fs.existsSync(downloadedPath)) return downloadedPath;

    throw new Error('Qdrant binary not found. Install standalone services from Settings.');
  }

  static isInstalled(): boolean {
    const binaryName = process.platform === 'win32' ? 'qdrant.exe' : 'qdrant';
    return fs.existsSync(
      path.join(app.getPath('userData'), 'standalone-services', 'qdrant', binaryName)
    );
  }

  async start(preferredPort?: number): Promise<void> {
    if (this._running) return;

    const storageDir = this.getStorageDir();
    fs.mkdirSync(storageDir, { recursive: true });

    const logDir = path.dirname(this.getLogPath());
    fs.mkdirSync(logDir, { recursive: true });

    const port = preferredPort || await findFreePort();
    const grpcPort = await findFreePort();
    const binaryPath = this.getBinaryPath();

    const logStream = fs.createWriteStream(this.getLogPath(), { flags: 'a' });

    this.process = spawn(binaryPath, [], {
      env: {
        ...process.env,
        QDRANT__STORAGE__STORAGE_PATH: storageDir,
        QDRANT__SERVICE__HTTP_PORT: String(port),
        QDRANT__SERVICE__GRPC_PORT: String(grpcPort),
        QDRANT__TELEMETRY_DISABLED: 'true',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.process.stdout?.pipe(logStream);
    this.process.stderr?.pipe(logStream);

    this.process.on('exit', (code) => {
      this._running = false;
      this.process = null;
      if (code !== 0 && code !== null) {
        console.error(`Qdrant exited with code ${code}`);
      }
    });

    this._port = port;

    // Wait for Qdrant to be ready
    await this.waitForReady(port, 30000);
    this._running = true;
  }

  async stop(): Promise<void> {
    if (!this.process) return;
    return new Promise((resolve) => {
      const onExit = () => {
        this._running = false;
        this.process = null;
        resolve();
      };
      this.process!.on('exit', onExit);
      this.process!.kill('SIGTERM');
      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    });
  }

  get port(): number {
    return this._port;
  }

  get running(): boolean {
    return this._running;
  }

  isBinaryAvailable(): boolean {
    try {
      this.getBinaryPath();
      return true;
    } catch {
      return false;
    }
  }

  private waitForReady(port: number, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const req = http.get(`http://localhost:${port}/readyz`, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            retry();
          }
        });
        req.on('error', retry);
        req.setTimeout(1000, () => {
          req.destroy();
          retry();
        });
      };
      const retry = () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error('Qdrant failed to start within timeout'));
          return;
        }
        setTimeout(check, 500);
      };
      check();
    });
  }
}
