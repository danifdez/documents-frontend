import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';
import { EmbeddedPostgresService } from './embedded-postgres';
import { EmbeddedBackendService } from './embedded-backend';
import { EmbeddedModelsService, embeddedModels } from './embedded-models';
import { detectGpu } from './download-manager';
import { readInstalledComponent } from './installed-components';
import { getPersistentLocalDataDir, migrateLegacyLocalData } from './local-data';

export interface LocalServiceStatus {
  postgres: 'stopped' | 'starting' | 'running' | 'error';
  backend: 'stopped' | 'starting' | 'running' | 'error';
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
  private backend: EmbeddedBackendService | null = null;
  private _status: LocalServiceStatus = {
    postgres: 'stopped',
    backend: 'stopped',
    models: 'not_installed',
  };
  // Last error message per service, surfaced read-only in the Settings → Server
  // tab so the user can see *why* a service failed, not just that it did.
  private _errors: ServiceErrors = {};
  private _running = false;

  private getDataDir(): string {
    return getPersistentLocalDataDir();
  }

  async start(opts?: { features?: Record<string, boolean>; backendPort?: number }): Promise<string> {
    if (this._running && this.backend?.running) {
      return this.backend.url;
    }

    // Fresh attempt: clear stale errors from a previous run so the UI doesn't
    // show errors for services that are now starting cleanly.
    this._errors = {};

    migrateLegacyLocalData();
    const dataDir = this.getDataDir();
    fs.mkdirSync(dataDir, { recursive: true });

    // 1. Start PostgreSQL. The entity graph (Apache AGE) and embeddings
    // (pgvector) are extensions inside this same instance — no separate service.
    await this.ensurePostgres();

    // 2 & 3. Start Backend and the ML worker with the requested feature set.
    await this.startBackendAndModels(opts?.features ?? {}, opts?.backendPort);

    this._running = true;
    return this.backend!.url;
  }

  /**
   * Re-apply the feature set to the running local server. Backend and Models
   * read `FEATURE_*` / `config.features` at boot, so they must be restarted;
   * PostgreSQL is left untouched and keeps all data.
   */
  async applyFeatures(features: Record<string, boolean>): Promise<string | null> {
    if (!this.isRunning() || !this.backend) {
      return this.backend?.url ?? null;
    }
    const port = this.backend.port;
    this._errors = {};
    await this.stopBackendAndModels();
    await this.startBackendAndModels(features, port);
    return this.backend.url;
  }

  private async ensurePostgres(): Promise<void> {
    if (this.postgres?.running) {
      this._status.postgres = 'running';
      return;
    }
    this.postgres = new EmbeddedPostgresService(LOCAL_ID);
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
  }

  private async startBackendAndModels(features: Record<string, boolean>, backendPort?: number): Promise<void> {
    const dataDir = this.getDataDir();
    const storagePath = path.join(dataDir, 'documents');
    const creds = this.postgres!.credentials;
    const modelsEnrollmentToken = randomBytes(32).toString('base64url');
    const disabledFeatures = Object.entries(features).filter(([, on]) => !on).map(([k]) => k);

    // Reuse the existing instance across restarts: it retains the port the
    // workspace URL was built with, so feature changes never move the API.
    if (!this.backend) this.backend = new EmbeddedBackendService();

    this._status.backend = 'starting';
    const backendConfig = {
      postgresHost: '127.0.0.1',
      postgresPort: this.postgres!.port,
      postgresUser: creds.user,
      postgresPassword: creds.password,
      postgresDatabase: creds.database,
      storagePath,
      modelsEnrollmentToken,
      authEnabled: false,
      disabledFeatures,
      port: backendPort,
    };

    try {
      await this.backend.start(backendConfig);
      this._status.backend = 'running';
    } catch (err) {
      console.error('Backend start failed:', err);
      this._status.backend = 'error';
      this._errors.backend = describeError(err);
      // Do NOT stop Postgres here so the user can inspect logs and
      // re-attempt startup from the UI. Leaving the DB running helps
      // diagnose boot races or migration problems.
      throw new Error(`Backend failed to start: ${err}`);
    }

    // The ML worker (if installed) consumes work exclusively through the
    // Backend protocol. Non-fatal: the rest of the app still runs if it fails.
    if (EmbeddedModelsService.isInstalled()) {
      this._status.models = 'starting';
      try {
        await embeddedModels.start({
          backendUrl: this.backend.url,
          enrollmentToken: modelsEnrollmentToken,
          postgres: {
            host: '127.0.0.1',
            port: this.postgres!.port,
            user: creds.user,
            password: creds.password,
            database: creds.database,
          },
          features,
          gpu: readInstalledComponent(app.getPath('userData'), 'models')?.state.variant === 'cuda' && detectGpu().cuda,
        });
        this._status.models = 'running';
      } catch (err) {
        // Treat models startup failures as "not_installed" in the UI so the
        // user is prompted to (re)install models via the wizard rather than
        // exposing a low-level "error" state. This is non-fatal for the app.
        this._status.models = 'not_installed';
        console.error('Models worker failed to start — marking as not_installed (non-fatal):', err);
      }
    } else {
      this._status.models = 'not_installed';
    }
  }

  async stop(): Promise<void> {
    await this.stopServices();
    this._errors = {};
    this._running = false;
  }

  private async stopBackendAndModels(): Promise<void> {
    if (embeddedModels.running) {
      try { await embeddedModels.stop(); } catch (e) { console.error('Error stopping models worker:', e); }
    }
    this._status.models = EmbeddedModelsService.isInstalled() ? 'stopped' : 'not_installed';
    if (this.backend) {
      try { await this.backend.stop(); } catch (e) { console.error('Error stopping backend:', e); }
      this._status.backend = 'stopped';
    }
  }

  private async stopServices(): Promise<void> {
    await this.stopBackendAndModels();
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
