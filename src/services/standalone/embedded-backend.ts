import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { ChildProcess, fork, spawn, spawnSync } from 'child_process';
import http from 'http';
import { findFreePort, isPortAvailable } from './embedded-postgres';
import { getBundledNodePath } from './download-manager';
import { getActiveComponentRoot, legacyComponentRoot } from './installed-components';

export interface BackendConfig {
  postgresHost: string;
  postgresPort: number;
  postgresUser: string;
  postgresPassword: string;
  postgresDatabase: string;
  storagePath: string;
  modelsEnrollmentToken: string;
  authEnabled?: boolean;
  /** Feature flags to turn OFF (passed as FEATURE_<X>=false). */
  disabledFeatures?: string[];
  /** Stable loopback port used by browser and local-agent integrations. */
  port?: number;
}

export class EmbeddedBackendService {
  private process: ChildProcess | null = null;
  private _port: number = 0;
  private _running = false;

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
    const userData = app.getPath('userData');
    const root = getActiveComponentRoot(userData, 'backend') ?? legacyComponentRoot(userData, 'backend');
    const downloadedPath = path.join(root, 'dist', 'src', 'main.js');
    if (fs.existsSync(downloadedPath)) return downloadedPath;

    // In development, look for the backend in the parent project directory
    const devPath = path.join(app.getAppPath(), '..', '..', 'backend', 'dist', 'src', 'main.js');
    if (fs.existsSync(devPath)) return devPath;

    throw new Error('Backend not found. Install standalone services from Settings.');
  }

  private getBackendRoot(): string {
    return path.resolve(path.dirname(this.getBackendPath()), '..', '..');
  }

  static isInstalled(): boolean {
    const userData = app.getPath('userData');
    const root = getActiveComponentRoot(userData, 'backend') ?? legacyComponentRoot(userData, 'backend');
    return fs.existsSync(path.join(root, 'dist', 'src', 'main.js'));
  }

  private getLogPath(): string {
    return path.join(app.getPath('userData'), 'local-server', 'logs', 'backend.log');
  }

  private getProcessStatePath(): string {
    return path.join(app.getPath('userData'), 'local-server', 'backend-process.json');
  }

  private isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch (error: unknown) {
      return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EPERM';
    }
  }

  private clearProcessState(pid?: number): void {
    try {
      const statePath = this.getProcessStatePath();
      if (pid !== undefined && fs.existsSync(statePath)) {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8')) as { pid?: number };
        if (state.pid !== pid) return;
      }
      fs.rmSync(statePath, { force: true });
    } catch {
      // State is advisory. A malformed file must not block normal startup.
    }
  }

  private async stopVerifiedOrphan(backendPath: string): Promise<void> {
    const statePath = this.getProcessStatePath();
    let pid: number | undefined;
    try {
      pid = JSON.parse(fs.readFileSync(statePath, 'utf8')).pid;
    } catch {
      return;
    }
    if (!Number.isInteger(pid) || pid! <= 0 || !this.isProcessAlive(pid!)) {
      this.clearProcessState();
      return;
    }

    // On Linux we can prove that the PID is our backend before signalling it.
    // Do not make a best-effort guess on other platforms: a reused PID is never
    // an acceptable target for an automatic kill.
    if (process.platform !== 'linux') return;
    try {
      const commandLine = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8');
      if (!commandLine.includes(backendPath)) return;
    } catch {
      return;
    }

    try { process.kill(pid!, 'SIGTERM'); } catch { return; }
    const deadline = Date.now() + 5000;
    while (this.isProcessAlive(pid!) && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (this.isProcessAlive(pid!)) {
      try { process.kill(pid!, 'SIGKILL'); } catch { /* already gone */ }
    }
    this.clearProcessState(pid);
  }

  private saveProcessState(pid: number, backendPath: string): void {
    fs.writeFileSync(this.getProcessStatePath(), JSON.stringify({ pid, backendPath }));
  }

  async start(config: BackendConfig): Promise<void> {
    if (this._running) return;

    const backendPath = this.getBackendPath();
    await this.stopVerifiedOrphan(backendPath);
    const port = config.port ?? await findFreePort();
    if (config.port !== undefined && !await isPortAvailable(port)) {
      throw new Error(`Local API port ${port} is already in use. Choose a different port in Settings → Server.`);
    }

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
      // The backend reads DOCUMENTS_STORAGE_DIR. Keeping this data outside the
      // downloaded component is essential: component upgrades/reinstalls must
      // never make user files unavailable or attempt to write into app assets.
      DOCUMENTS_STORAGE_DIR: config.storagePath,
      MODELS_ENROLLMENT_TOKEN: config.modelsEnrollmentToken,
      PORT: String(port),
      HOST: '127.0.0.1',
      AUTH_ENABLED: config.authEnabled ? 'true' : 'false',
      // Apply pending DB migrations on boot — the standalone Postgres is created
      // empty, so this is what builds the schema on first launch.
      RUN_MIGRATIONS: 'true',
      PUPPETEER_CACHE_DIR: path.join(this.getBackendRoot(), 'runtime', 'puppeteer'),
    };

    // RAG is always available: embeddings live in Postgres via pgvector, which
    // ships with the embedded Postgres — there's no separate vector service.
    // The entity graph (GraphRAG) likewise lives in Postgres via Apache AGE, so
    // it needs no extra service or connection settings either.
    env.FEATURE_RAG = 'true';

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
    if (this.process.pid) this.saveProcessState(this.process.pid, backendPath);

    // Pipe logs to the persistent log stream when available
    if (this.process.stdout) this.process.stdout.pipe(logStream);
    if (this.process.stderr) this.process.stderr.pipe(logStream);

    this.process.on('error', (err) => {
      this._running = false;
      this.clearProcessState(this.process?.pid);
      this.process = null;
      console.error('EmbeddedBackendService: child process error', err && (err.stack || err));
      try { logStream.write(`[${new Date().toISOString()}] [ERR] child process error: ${err && (err.stack || err)}\n`); } catch { /* log stream may already be closed */ }
    });

    this.process.on('exit', (code, signal) => {
      this._running = false;
      this.clearProcessState(this.process?.pid);
      this.process = null;
      try { logStream.write(`[${new Date().toISOString()}] [LOG] child exit code=${code} signal=${signal}\n`); } catch { /* log stream may already be closed */ }
      if (code !== 0 && code !== null) {
        console.error(`Backend exited with code ${code} signal ${signal}`);
      }
    });

    this._port = port;

    // PostgreSQL has already reported ready at this point. A normal Nest boot,
    // including pending migrations, should complete quickly; recovery should
    // not hold the splash screen for minutes when it does not.
    const waitTimeout = 30000;
    await this.waitForReady(port, waitTimeout, this.process);
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

  private waitForReady(port: number, timeoutMs: number, child: ChildProcess): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      let finished = false;
      const finish = (error?: Error) => {
        if (finished) return;
        finished = true;
        child.removeListener('exit', onExit);
        child.removeListener('error', onError);
        if (error) reject(error);
        else resolve();
      };
      const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
        finish(new Error(`Backend exited before becoming ready (code=${code}, signal=${signal})`));
      };
      const onError = (error: Error) => finish(error);
      child.once('exit', onExit);
      child.once('error', onError);
      const check = () => {
        if (finished) return;
        const req = http.get(`http://127.0.0.1:${port}`, () => {
          finish();
        });
        req.on('error', retry);
        req.setTimeout(1000, () => {
          req.destroy();
          retry();
        });
      };
      const retry = () => {
        if (Date.now() - start > timeoutMs) {
          finish(new Error('Backend failed to start within timeout'));
          return;
        }
        setTimeout(check, 500);
      };
      check();
    });
  }
}
