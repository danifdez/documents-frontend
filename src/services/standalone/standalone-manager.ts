import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { EmbeddedPostgresService } from './embedded-postgres';
import { EmbeddedBackendService } from './embedded-backend';
import { EmbeddedNeo4jService } from './embedded-neo4j';
import { EmbeddedModelsService, embeddedModels } from './embedded-models';
import { detectGpu } from './download-manager';

export interface LocalServiceStatus {
  postgres: 'stopped' | 'starting' | 'running' | 'error';
  backend: 'stopped' | 'starting' | 'running' | 'error';
  neo4j: 'stopped' | 'starting' | 'running' | 'error';
  models: 'not_installed' | 'stopped' | 'starting' | 'running' | 'error';
}

export type ServiceErrors = Partial<Record<keyof LocalServiceStatus, string>>;

export interface LocalServiceReport {
  services: LocalServiceStatus;
  errors: ServiceErrors;
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const LOCAL_ID = 'local';

class StandaloneManager {
  private postgres: EmbeddedPostgresService | null = null;
  private neo4j: EmbeddedNeo4jService | null = null;
  private backend: EmbeddedBackendService | null = null;
  private _status: LocalServiceStatus = {
    postgres: 'stopped',
    backend: 'stopped',
    neo4j: 'stopped',
    models: 'not_installed',
  };
  // Last error message per service, surfaced read-only in the Settings → Server
  // tab so the user can see *why* a service failed, not just that it did.
  private _errors: ServiceErrors = {};
  private _running = false;

  private getDataDir(): string {
    return path.join(app.getPath('userData'), 'local-server');
  }

  async start(opts?: { features?: Record<string, boolean> }): Promise<string> {
    if (this._running && this.backend?.running) {
      return this.backend.url;
    }

    const features = opts?.features ?? {};
    const disabledFeatures = Object.entries(features).filter(([, on]) => !on).map(([k]) => k);

    // Fresh attempt: clear stale errors from a previous run so the UI doesn't
    // show errors for services that are now starting cleanly.
    this._errors = {};

    const dataDir = this.getDataDir();
    fs.mkdirSync(dataDir, { recursive: true });

    this.postgres = new EmbeddedPostgresService(LOCAL_ID);
    this.neo4j = new EmbeddedNeo4jService(LOCAL_ID);
    this.backend = new EmbeddedBackendService(LOCAL_ID);

    // 1. Start PostgreSQL
    this._status.postgres = 'starting';
    try {
      await this.postgres.start();
      this._status.postgres = 'running';
    } catch (err) {
      this._status.postgres = 'error';
      this._errors.postgres = describeError(err);
      console.error('StandaloneManager: Postgres failed to start', err);
      throw new Error(`PostgreSQL failed to start: ${err}`);
    }

    // 2. Start Neo4j (if available)
    if (EmbeddedNeo4jService.isInstalled()) {
      this._status.neo4j = 'starting';
      try {
        await this.neo4j.start();
        this._status.neo4j = 'running';
      } catch (err) {
        this._status.neo4j = 'error';
        this._errors.neo4j = describeError(err);
        console.error('Neo4j failed to start (non-fatal):', err);
      }
    }

    // 3. Start Backend
    const storagePath = path.join(dataDir, 'documents');
    const creds = this.postgres.credentials;

    this._status.backend = 'starting';
    const backendConfig = {
      postgresHost: '127.0.0.1',
      postgresPort: this.postgres.port,
      postgresUser: creds.user,
      postgresPassword: creds.password,
      postgresDatabase: creds.database,
      neo4jUri: this.neo4j?.running ? `bolt://127.0.0.1:${this.neo4j.port}` : undefined,
      storagePath,
      authEnabled: false,
      disabledFeatures,
    };

    let attempt = 0;
    const maxAttempts = 2;
    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        await this.backend.start(backendConfig as any);
        this._status.backend = 'running';
        break;
      } catch (err) {
        console.error(`Backend start attempt ${attempt} failed:`, err);
        if (attempt >= maxAttempts) {
          this._status.backend = 'error';
          this._errors.backend = describeError(err);
          // Do NOT stop Postgres here so the user can inspect logs and
          // re-attempt startup from the UI. Leaving the DBs running helps
          // diagnose boot races or migration problems.
          console.error(`Backend failed to start after ${attempt} attempts; leaving services running for inspection.`);
          throw new Error(`Backend failed to start after ${attempt} attempts: ${err}`);
        }
        // small backoff before retrying
        await new Promise((res) => setTimeout(res, 2000 * attempt));
      }
    }

    // 4. Start the ML worker (if installed). It polls the same jobs table; the
    // AI assistant/agents don't work without it, so the wizard installs it in
    // every profile. Non-fatal: the rest of the app still runs if it fails.
    if (EmbeddedModelsService.isInstalled()) {
      this._status.models = 'starting';
      try {
        await embeddedModels.start({
          postgres: {
            host: '127.0.0.1',
            port: this.postgres.port,
            user: creds.user,
            password: creds.password,
            database: creds.database,
          },
          neo4j: this.neo4j?.running
            ? { host: '127.0.0.1', port: this.neo4j.port, user: 'neo4j', password: 'neo4j' }
            : undefined,
          features,
          gpu: detectGpu().cuda,
        });
        this._status.models = 'running';
      } catch (err) {
        // Treat models startup failures as "not_installed" in the UI so the
        // user is prompted to (re)install models via the wizard rather than
        // exposing a low-level "error" state. This is non-fatal for the app.
        this._status.models = 'not_installed';
        console.error('Models worker failed to start — marking as not_installed (non-fatal):', err);
      }
    }

    this._running = true;
    return this.backend.url;
  }

  async stop(): Promise<void> {
    await this.stopServices();
    this._errors = {};
    this._running = false;
  }

  private async stopServices(): Promise<void> {
    if (embeddedModels.running) {
      try { await embeddedModels.stop(); } catch (e) { console.error('Error stopping models worker:', e); }
      this._status.models = 'stopped';
    }
    if (this.backend) {
      try { await this.backend.stop(); } catch (e) { console.error('Error stopping backend:', e); }
      this._status.backend = 'stopped';
    }
    if (this.neo4j) {
      try { await this.neo4j.stop(); } catch (e) { console.error('Error stopping neo4j:', e); }
      this._status.neo4j = 'stopped';
    }
    if (this.postgres) {
      try { await this.postgres.stop(); } catch (e) { console.error('Error stopping postgres:', e); }
      this._status.postgres = 'stopped';
    }
  }

  getStatus(): LocalServiceReport {
    return { services: { ...this._status }, errors: { ...this._errors } };
  }

  getBackendUrl(): string | null {
    if (!this.backend || !this.backend.running) return null;
    return this.backend.url;
  }

  isRunning(): boolean {
    return this._running && !!this.backend?.running;
  }
}

export const standaloneManager = new StandaloneManager();
