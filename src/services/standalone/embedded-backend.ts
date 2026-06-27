import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { ChildProcess, fork, spawn, spawnSync } from 'child_process';
import http from 'http';
import { findFreePort } from './embedded-postgres';
import { getBundledNodePath } from './download-manager';

export interface BackendConfig {
  postgresHost: string;
  postgresPort: number;
  postgresUser: string;
  postgresPassword: string;
  postgresDatabase: string;
  neo4jUri?: string;
  storagePath: string;
  authEnabled?: boolean;
  /** Feature flags to turn OFF (passed as FEATURE_<X>=false). */
  disabledFeatures?: string[];
}

export class EmbeddedBackendService {
  private process: ChildProcess | null = null;
  private _port: number = 0;
  private _running = false;

  constructor(_workspaceId?: string) {
    // workspaceId kept for API compatibility but paths are now global
  }

  // Resolve the Node executable used to spawn the backend. A standalone install
  // ships its own Node (downloaded alongside Postgres/etc.), so it never
  // depends on a system Node being present or matching the expected version.
  // The system-node / fork fallbacks only matter in development, where no
  // bundled Node is downloaded.
  private resolveNode(): string | null {
    return getBundledNodePath() ?? this.findSystemNode();
  }

  // Try to locate a system `node` executable (which/where). Return its path
  // or null if not found. This lets packaged Electron use the system Node to
  // spawn the backend JS instead of forking from the Electron binary.
  private findSystemNode(): string | null {
    try {
      const cmd = process.platform === 'win32' ? 'where' : 'which';
      const res = spawnSync(cmd, ['node'], { encoding: 'utf-8' });
      if (res && res.status === 0 && res.stdout) {
        const p = res.stdout.toString().split(/\r?\n/)[0].trim();
        if (p) return p;
      }
    } catch {
      // ignore
    }
    return null;
  }

  private getBackendPath(): string {
    // Downloaded standalone services (primary location)
    const downloadedPath = path.join(app.getPath('userData'), 'standalone-services', 'backend', 'dist', 'src', 'main.js');
    if (fs.existsSync(downloadedPath)) return downloadedPath;

    // In development, look for the backend in the parent project directory
    const devPath = path.join(app.getAppPath(), '..', '..', 'backend', 'dist', 'src', 'main.js');
    if (fs.existsSync(devPath)) return devPath;

    throw new Error('Backend not found. Install standalone services from Settings.');
  }

  static isInstalled(): boolean {
    return fs.existsSync(
      path.join(app.getPath('userData'), 'standalone-services', 'backend', 'dist', 'src', 'main.js')
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
      // Apply pending DB migrations on boot — the standalone Postgres is created
      // empty, so this is what builds the schema on first launch.
      RUN_MIGRATIONS: 'true',
    };

    // RAG is always available: embeddings live in Postgres via pgvector, which
    // ships with the embedded Postgres — there's no separate vector service.
    env.FEATURE_RAG = 'true';

    if (config.neo4jUri) {
      env.NEO4J_URI = config.neo4jUri;
      env.NEO4J_ENABLED = 'true';
    }

    // Profile preset: turn off the features this install doesn't include. The
    // user can re-enable them later from Settings (installing services if needed).
    for (const flag of config.disabledFeatures || []) {
      env[`FEATURE_${flag.toUpperCase()}`] = 'false';
    }

    // Prefer spawning with a real `node` executable (the bundled one in a
    // standalone install) — packaged Electron's fork can produce processes that
    // don't behave the same as a normal Node process on all systems. Fall back
    // to `fork` only when no Node binary can be resolved (shouldn't happen in a
    // standalone install, where Node is downloaded with the other services).
    let child: ChildProcess | null = null;
    const nodeBin = this.resolveNode();
    if (nodeBin) {
      try {
        child = spawn(nodeBin, [backendPath], {
          env: { ...process.env, ...env },
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      } catch (err) {
        console.error('EmbeddedBackendService: spawn(node) failed, falling back to fork', err);
        child = null;
      }
    }

    if (!child) {
      child = fork(backendPath, [], {
        env: { ...process.env, ...env },
        silent: true,
      });
    }

    this.process = child;

    // Pipe logs to the persistent log stream when available
    if (this.process.stdout) this.process.stdout.pipe(logStream);
    if (this.process.stderr) this.process.stderr.pipe(logStream);

    this.process.on('error', (err) => {
      this._running = false;
      this.process = null;
      console.error('EmbeddedBackendService: child process error', err && (err.stack || err));
      try { logStream.write(`[${new Date().toISOString()}] [ERR] child process error: ${err && (err.stack || err)}\n`); } catch {}
    });

    this.process.on('exit', (code, signal) => {
      this._running = false;
      this.process = null;
      try { logStream.write(`[${new Date().toISOString()}] [LOG] child exit code=${code} signal=${signal}\n`); } catch {}
      if (code !== 0 && code !== null) {
        console.error(`Backend exited with code ${code} signal ${signal}`);
      }
    });

    this._port = port;

    // Wait for the backend to be ready (increase timeout for packaged installs)
    const waitTimeout = 120000; // 120 seconds
    await this.waitForReady(port, waitTimeout);
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
    return `http://127.0.0.1:${this._port}`;
  }

  private waitForReady(port: number, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const req = http.get(`http://127.0.0.1:${port}`, () => {
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
