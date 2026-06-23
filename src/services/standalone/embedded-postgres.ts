import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import net from 'net';
import crypto from 'crypto';
import { ChildProcess, spawn, execFile } from 'child_process';
import Store from 'electron-store';

const store = new Store();

export class EmbeddedPostgresService {
  private process: ChildProcess | null = null;
  private _port: number = 0;
  private _running = false;
  private workspaceId: string;
  // PID of a postmaster we adopted from a previous run (orphaned by an Electron
  // crash) instead of spawning ourselves. We don't own its ChildProcess handle,
  // so `stop()` must signal it by PID.
  private _adoptedPid: number | null = null;

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
  }

  private getBinDir(): string {
    return path.join(app.getPath('userData'), 'standalone-services', 'postgres', 'bin');
  }

  private getDataDir(): string {
    return path.join(app.getPath('userData'), 'local-server', 'pg-data');
  }

  private getLogPath(): string {
    return path.join(app.getPath('userData'), 'local-server', 'logs', 'postgres.log');
  }

  private isInitialized(): boolean {
    return fs.existsSync(path.join(this.getDataDir(), 'PG_VERSION'));
  }

  private getPidFilePath(): string {
    return path.join(this.getDataDir(), 'postmaster.pid');
  }

  // Parse `postmaster.pid`. Line 1 is the postmaster PID, line 4 is the TCP
  // port (see PostgreSQL's pidfile format). Returns null when the file is
  // missing or malformed.
  private readPostmasterPid(): { pid: number; port: number } | null {
    try {
      const lines = fs.readFileSync(this.getPidFilePath(), 'utf-8').split('\n');
      const pid = parseInt(lines[0], 10);
      const port = parseInt(lines[3], 10);
      if (!Number.isInteger(pid) || !Number.isInteger(port)) return null;
      return { pid, port };
    } catch {
      return null;
    }
  }

  // `kill(pid, 0)` probes for existence without sending a signal: it throws
  // ESRCH when the process is gone, EPERM when it exists but we can't signal it.
  private isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch (err: any) {
      return err?.code === 'EPERM';
    }
  }

  private getCredentials(): { user: string; password: string; database: string } {
    const key = `standalone.${this.workspaceId}.pg`;
    let creds = store.get(key) as { user: string; password: string; database: string } | undefined;
    if (!creds) {
      creds = {
        user: 'documents',
        password: crypto.randomBytes(16).toString('hex'),
        database: 'documents',
      };
      store.set(key, creds);
    }
    return creds;
  }

  private bin(name: string): string {
    const ext = process.platform === 'win32' ? '.exe' : '';
    return path.join(this.getBinDir(), name + ext);
  }

  private runBin(name: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(this.bin(name), args, { env: this.pgEnv() }, (err, stdout, stderr) => {
        if (err) reject(new Error(`${name} failed: ${stderr || err.message}`));
        else resolve(stdout);
      });
    });
  }

  private pgEnv(): Record<string, string> {
    const libDir = path.join(app.getPath('userData'), 'standalone-services', 'postgres', 'lib');
    return {
      ...process.env as Record<string, string>,
      LD_LIBRARY_PATH: libDir,
      DYLD_LIBRARY_PATH: libDir,
    };
  }

  async start(preferredPort?: number): Promise<void> {
    if (this._running) return;

    if (!fs.existsSync(this.bin('initdb'))) {
      throw new Error('PostgreSQL binaries not found. Install standalone services from Settings.');
    }

    const dataDir = this.getDataDir();
    fs.mkdirSync(dataDir, { recursive: true });

    const logDir = path.dirname(this.getLogPath());
    fs.mkdirSync(logDir, { recursive: true });

    const creds = this.getCredentials();

    // A previous app run can leave its postmaster alive: on Linux, child
    // processes spawned by Electron survive a crash of the main process. Since
    // PostgreSQL locks the data dir via `postmaster.pid`, a second postmaster on
    // the same dir is impossible regardless of the port — so don't try to start
    // another. Adopt the live one (read its port from the pidfile); if the lock
    // is stale (the process is gone), remove it so a fresh start can proceed.
    if (this.isInitialized()) {
      const existing = this.readPostmasterPid();
      if (existing && this.isProcessAlive(existing.pid)) {
        try {
          await this.waitForReady(existing.port, 3000);
          this._adoptedPid = existing.pid;
          this._port = existing.port;
          this._running = true;
          return;
        } catch {
          // PID alive but not accepting connections on that port — fall through
          // and let the spawn below surface the real error.
        }
      } else if (existing) {
        try { fs.rmSync(this.getPidFilePath()); } catch { /* ignore */ }
      }
    }

    const port = preferredPort || await findFreePort();

    // Initialize data directory if needed
    if (!this.isInitialized()) {
      // initdb refuses to run unless the target dir is empty. A previous failed
      // attempt can leave leftovers (e.g. a stray .pwfile) that would block every
      // retry forever, so wipe and recreate it for a clean init.
      fs.rmSync(dataDir, { recursive: true, force: true });
      fs.mkdirSync(dataDir, { recursive: true });

      // The password file must live OUTSIDE the data dir — anything inside it
      // makes initdb fail with "directory exists but is not empty".
      const pwFile = path.join(path.dirname(dataDir), '.pg-init-pw');
      fs.writeFileSync(pwFile, creds.password);
      try {
        await this.runBin('initdb', [
          '-D', dataDir,
          '-U', creds.user,
          '--auth=password',
          `--pwfile=${pwFile}`,
          '--encoding=UTF8',
          '--no-locale',
        ]);
      } finally {
        try { fs.unlinkSync(pwFile); } catch { /* ignore */ }
      }

      // initdb only creates the superuser, not our app database. The embedded
      // bundle ships no createdb/psql, so create it in single-user mode while the
      // server is still down (it needs an exclusive lock on the data dir).
      await this.createDatabaseSingleUser(dataDir, creds);
    }

    // Start postgres
    const logStream = fs.createWriteStream(this.getLogPath(), { flags: 'a' });

    this.process = spawn(this.bin('postgres'), [
      '-D', dataDir,
      '-p', String(port),
      '-k', '',  // disable unix sockets, use TCP only
    ], {
      env: this.pgEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.process.stdout?.pipe(logStream);
    this.process.stderr?.pipe(logStream);

    this.process.on('exit', (code) => {
      this._running = false;
      this.process = null;
      if (code !== 0 && code !== null) {
        console.error(`PostgreSQL exited with code ${code}`);
      }
    });

    this._port = port;

    // Wait for postgres to accept connections
    await this.waitForReady(port, 20000);

    this._running = true;
  }

  // Creates the app database in single-user mode using only the bundled
  // `postgres` binary (the embedded build ships no createdb/psql). Must run while
  // the server is stopped — single-user mode takes an exclusive lock.
  private createDatabaseSingleUser(dataDir: string, creds: { user: string; database: string }): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.bin('postgres'), ['--single', '-D', dataDir, 'postgres'], {
        env: this.pgEnv(),
        stdio: ['pipe', 'ignore', 'pipe'],
      });
      let stderr = '';
      proc.stderr?.on('data', (d) => { stderr += d.toString(); });
      proc.on('error', reject);
      proc.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Failed to create database: ${stderr.slice(-300)}`));
      });
      proc.stdin?.write(`CREATE DATABASE ${creds.database} OWNER ${creds.user};\n`);
      proc.stdin?.end();
    });
  }

  async stop(): Promise<void> {
    // Adopted postmaster from a prior run: we hold only its PID, so signal it
    // directly. SIGTERM triggers PostgreSQL's fast shutdown.
    if (!this.process && this._adoptedPid !== null) {
      try { process.kill(this._adoptedPid, 'SIGTERM'); } catch { /* already gone */ }
      this._adoptedPid = null;
      this._running = false;
      return;
    }
    if (!this.process) return;
    return new Promise((resolve) => {
      this.process!.on('exit', () => {
        this._running = false;
        this.process = null;
        resolve();
      });
      // Use pg_ctl stop for a clean shutdown if available, otherwise SIGTERM
      this.process!.kill('SIGTERM');
      setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
        }
      }, 10000);
    });
  }

  get port(): number {
    return this._port;
  }

  get running(): boolean {
    return this._running;
  }

  get credentials(): { user: string; password: string; database: string } {
    return this.getCredentials();
  }

  static isInstalled(): boolean {
    const binDir = path.join(app.getPath('userData'), 'standalone-services', 'postgres', 'bin');
    const ext = process.platform === 'win32' ? '.exe' : '';
    return fs.existsSync(path.join(binDir, 'initdb' + ext))
      && fs.existsSync(path.join(binDir, 'postgres' + ext));
  }

  // Readiness is a plain TCP connect — the bundle ships no pg_isready, and the
  // backend does its own authenticated connection retries anyway.
  private waitForReady(port: number, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const sock = net.connect(port, '127.0.0.1');
        sock.once('connect', () => { sock.destroy(); resolve(); });
        sock.once('error', () => {
          sock.destroy();
          if (Date.now() - start > timeoutMs) {
            reject(new Error('PostgreSQL failed to start within timeout'));
          } else {
            setTimeout(check, 300);
          }
        });
      };
      check();
    });
  }
}

export function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}
