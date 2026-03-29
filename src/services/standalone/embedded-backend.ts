import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { ChildProcess, fork } from 'child_process';
import http from 'http';
import { findFreePort } from './embedded-postgres';

export interface BackendConfig {
  postgresHost: string;
  postgresPort: number;
  postgresUser: string;
  postgresPassword: string;
  postgresDatabase: string;
  qdrantHost?: string;
  qdrantPort?: number;
  neo4jUri?: string;
  storagePath: string;
  featureRag?: boolean;
  authEnabled?: boolean;
}

export class EmbeddedBackendService {
  private process: ChildProcess | null = null;
  private _port: number = 0;
  private _running = false;

  constructor(_workspaceId?: string) {
    // workspaceId kept for API compatibility but paths are now global
  }

  private getBackendPath(): string {
    // Downloaded standalone services (primary location)
    const downloadedPath = path.join(app.getPath('userData'), 'standalone-services', 'backend', 'dist', 'main.js');
    if (fs.existsSync(downloadedPath)) return downloadedPath;

    // In development, look for the backend in the parent project directory
    const devPath = path.join(app.getAppPath(), '..', '..', 'backend', 'dist', 'main.js');
    if (fs.existsSync(devPath)) return devPath;

    throw new Error('Backend not found. Install standalone services from Settings.');
  }

  static isInstalled(): boolean {
    return fs.existsSync(
      path.join(app.getPath('userData'), 'standalone-services', 'backend', 'dist', 'main.js')
    );
  }

  private getLogPath(): string {
    return path.join(app.getPath('userData'), 'local-server', 'logs', 'backend.log');
  }

  async start(config: BackendConfig): Promise<void> {
    if (this._running) return;

    const backendPath = this.getBackendPath();
    const port = await findFreePort();

    fs.mkdirSync(config.storagePath, { recursive: true });
    const logDir = path.dirname(this.getLogPath());
    fs.mkdirSync(logDir, { recursive: true });

    const logStream = fs.createWriteStream(this.getLogPath(), { flags: 'a' });

    const env: Record<string, string> = {
      NODE_ENV: 'production',
      POSTGRES_HOST: config.postgresHost,
      POSTGRES_PORT: String(config.postgresPort),
      POSTGRES_USER: config.postgresUser,
      POSTGRES_PASSWORD: config.postgresPassword,
      POSTGRES_DB: config.postgresDatabase,
      STORAGE_PATH: config.storagePath,
      PORT: String(port),
      AUTH_ENABLED: config.authEnabled ? 'true' : 'false',
    };

    if (config.qdrantHost && config.qdrantPort) {
      env.QDRANT_HOST = config.qdrantHost;
      env.QDRANT_PORT = String(config.qdrantPort);
      env.FEATURE_RAG = config.featureRag ? 'true' : 'false';
    }

    if (config.neo4jUri) {
      env.NEO4J_URI = config.neo4jUri;
      env.NEO4J_ENABLED = 'true';
    }

    this.process = fork(backendPath, [], {
      env: { ...process.env, ...env },
      silent: true,
    });

    this.process.stdout?.pipe(logStream);
    this.process.stderr?.pipe(logStream);

    this.process.on('exit', (code) => {
      this._running = false;
      this.process = null;
      if (code !== 0 && code !== null) {
        console.error(`Backend exited with code ${code}`);
      }
    });

    this._port = port;

    // Wait for the backend to be ready
    await this.waitForReady(port, 30000);
    this._running = true;
  }

  async stop(): Promise<void> {
    if (!this.process) return;
    return new Promise((resolve) => {
      this.process!.on('exit', () => {
        this._running = false;
        this.process = null;
        resolve();
      });
      this.process!.kill('SIGTERM');
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

  get url(): string {
    return `http://localhost:${this._port}`;
  }

  private waitForReady(port: number, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const req = http.get(`http://localhost:${port}`, () => {
          resolve();
        });
        req.on('error', retry);
        req.setTimeout(1000, () => {
          req.destroy();
          retry();
        });
      };
      const retry = () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error('Backend failed to start within timeout'));
          return;
        }
        setTimeout(check, 500);
      };
      check();
    });
  }
}
