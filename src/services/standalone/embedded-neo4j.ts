import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { ChildProcess, spawn } from 'child_process';
import http from 'http';
import { findFreePort } from './embedded-postgres';

export class EmbeddedNeo4jService {
  private process: ChildProcess | null = null;
  private _port: number = 0;   // bolt port
  private _httpPort: number = 0; // http port
  private _running = false;

  constructor(_workspaceId?: string) {
    // workspaceId kept for API compatibility but paths are now global
  }

  private getDataDir(): string {
    return path.join(app.getPath('userData'), 'local-server', 'neo4j-data');
  }

  private getLogPath(): string {
    return path.join(app.getPath('userData'), 'local-server', 'logs', 'neo4j.log');
  }

  private getNeo4jHome(): string {
    return path.join(app.getPath('userData'), 'standalone-services', 'neo4j');
  }

  private getBinaryPath(): string {
    const neo4jHome = this.getNeo4jHome();
    const binName = process.platform === 'win32' ? 'neo4j.bat' : 'neo4j';
    const binPath = path.join(neo4jHome, 'bin', binName);
    if (fs.existsSync(binPath)) return binPath;
    throw new Error('Neo4j binary not found. Install standalone services from Settings.');
  }

  async start(preferredBoltPort?: number): Promise<void> {
    if (this._running) return;

    const dataDir = this.getDataDir();
    fs.mkdirSync(dataDir, { recursive: true });

    const logDir = path.dirname(this.getLogPath());
    fs.mkdirSync(logDir, { recursive: true });

    const boltPort = preferredBoltPort || await findFreePort();
    const httpPort = await findFreePort();
    const neo4jHome = this.getNeo4jHome();
    const binaryPath = this.getBinaryPath();

    const logStream = fs.createWriteStream(this.getLogPath(), { flags: 'a' });

    this.process = spawn(binaryPath, ['console'], {
      env: {
        ...process.env,
        NEO4J_HOME: neo4jHome,
        NEO4J_CONF: neo4jHome,
        NEO4J_dbms_directories_data: dataDir,
        NEO4J_dbms_connector_bolt_listen__address: `:${boltPort}`,
        NEO4J_dbms_connector_http_listen__address: `:${httpPort}`,
        NEO4J_dbms_connector_https_enabled: 'false',
        NEO4J_dbms_security_auth__enabled: 'false',
        JAVA_HOME: path.join(neo4jHome, 'jre'),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.process.stdout?.pipe(logStream);
    this.process.stderr?.pipe(logStream);

    this.process.on('exit', (code) => {
      this._running = false;
      this.process = null;
      if (code !== 0 && code !== null) {
        console.error(`Neo4j exited with code ${code}`);
      }
    });

    this._port = boltPort;
    this._httpPort = httpPort;

    await this.waitForReady(httpPort, 60000);
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
      }, 10000);
    });
  }

  get port(): number {
    return this._port;
  }

  get running(): boolean {
    return this._running;
  }

  static isInstalled(): boolean {
    const neo4jHome = path.join(app.getPath('userData'), 'standalone-services', 'neo4j');
    const binName = process.platform === 'win32' ? 'neo4j.bat' : 'neo4j';
    return fs.existsSync(path.join(neo4jHome, 'bin', binName));
  }

  private waitForReady(httpPort: number, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        const req = http.get(`http://localhost:${httpPort}`, (res) => {
          if (res.statusCode && res.statusCode < 500) {
            resolve();
          } else {
            retry();
          }
        });
        req.on('error', retry);
        req.setTimeout(2000, () => {
          req.destroy();
          retry();
        });
      };
      const retry = () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error('Neo4j failed to start within timeout'));
          return;
        }
        setTimeout(check, 1000);
      };
      check();
    });
  }
}
