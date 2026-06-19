import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { EmbeddedPostgresService } from './embedded-postgres';
import { EmbeddedQdrantService } from './embedded-qdrant';
import { EmbeddedBackendService } from './embedded-backend';
import { EmbeddedNeo4jService } from './embedded-neo4j';
import { EmbeddedModelsService, embeddedModels } from './embedded-models';
import { detectGpu } from './download-manager';

export interface LocalServiceStatus {
  postgres: 'stopped' | 'starting' | 'running' | 'error';
  backend: 'stopped' | 'starting' | 'running' | 'error';
  qdrant: 'stopped' | 'starting' | 'running' | 'error';
  neo4j: 'stopped' | 'starting' | 'running' | 'error';
  models: 'not_installed' | 'stopped' | 'starting' | 'running' | 'error';
}

const LOCAL_ID = 'local';

class StandaloneManager {
  private postgres: EmbeddedPostgresService | null = null;
  private qdrant: EmbeddedQdrantService | null = null;
  private neo4j: EmbeddedNeo4jService | null = null;
  private backend: EmbeddedBackendService | null = null;
  private _status: LocalServiceStatus = {
    postgres: 'stopped',
    backend: 'stopped',
    qdrant: 'stopped',
    neo4j: 'stopped',
    models: 'not_installed',
  };
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

    const dataDir = this.getDataDir();
    fs.mkdirSync(dataDir, { recursive: true });

    this.postgres = new EmbeddedPostgresService(LOCAL_ID);
    this.qdrant = new EmbeddedQdrantService(LOCAL_ID);
    this.neo4j = new EmbeddedNeo4jService(LOCAL_ID);
    this.backend = new EmbeddedBackendService(LOCAL_ID);

    // 1. Start PostgreSQL
    this._status.postgres = 'starting';
    try {
      await this.postgres.start();
      this._status.postgres = 'running';
    } catch (err) {
      this._status.postgres = 'error';
      throw new Error(`PostgreSQL failed to start: ${err}`);
    }

    // 2. Start Qdrant (if available)
    if (EmbeddedQdrantService.isInstalled()) {
      this._status.qdrant = 'starting';
      try {
        await this.qdrant.start();
        this._status.qdrant = 'running';
      } catch (err) {
        this._status.qdrant = 'error';
        console.error('Qdrant failed to start (non-fatal):', err);
      }
    }

    // 3. Start Neo4j (if available)
    if (EmbeddedNeo4jService.isInstalled()) {
      this._status.neo4j = 'starting';
      try {
        await this.neo4j.start();
        this._status.neo4j = 'running';
      } catch (err) {
        this._status.neo4j = 'error';
        console.error('Neo4j failed to start (non-fatal):', err);
      }
    }

    // 4. Start Backend
    const storagePath = path.join(dataDir, 'documents');
    const creds = this.postgres.credentials;

    this._status.backend = 'starting';
    try {
      await this.backend.start({
        postgresHost: 'localhost',
        postgresPort: this.postgres.port,
        postgresUser: creds.user,
        postgresPassword: creds.password,
        postgresDatabase: creds.database,
        qdrantHost: this.qdrant?.running ? 'localhost' : undefined,
        qdrantPort: this.qdrant?.running ? this.qdrant.port : undefined,
        neo4jUri: this.neo4j?.running ? `bolt://localhost:${this.neo4j.port}` : undefined,
        storagePath,
        featureRag: !!this.qdrant?.running,
        authEnabled: false,
        disabledFeatures,
      });
      this._status.backend = 'running';
    } catch (err) {
      this._status.backend = 'error';
      await this.stopServices();
      throw new Error(`Backend failed to start: ${err}`);
    }

    // 5. Start the ML worker (if installed). It polls the same jobs table; the
    // AI assistant/agents don't work without it, so the wizard installs it in
    // every profile. Non-fatal: the rest of the app still runs if it fails.
    if (EmbeddedModelsService.isInstalled()) {
      this._status.models = 'starting';
      try {
        await embeddedModels.start({
          postgres: {
            host: 'localhost',
            port: this.postgres.port,
            user: creds.user,
            password: creds.password,
            database: creds.database,
          },
          qdrant: this.qdrant?.running ? { host: 'localhost', port: this.qdrant.port } : undefined,
          neo4j: this.neo4j?.running
            ? { host: 'localhost', port: this.neo4j.port, user: 'neo4j', password: 'neo4j' }
            : undefined,
          features,
          gpu: detectGpu().cuda,
        });
        this._status.models = 'running';
      } catch (err) {
        this._status.models = 'error';
        console.error('Models worker failed to start (non-fatal):', err);
      }
    }

    this._running = true;
    return this.backend.url;
  }

  async stop(): Promise<void> {
    await this.stopServices();
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
    if (this.qdrant) {
      try { await this.qdrant.stop(); } catch (e) { console.error('Error stopping qdrant:', e); }
      this._status.qdrant = 'stopped';
    }
    if (this.postgres) {
      try { await this.postgres.stop(); } catch (e) { console.error('Error stopping postgres:', e); }
      this._status.postgres = 'stopped';
    }
  }

  getStatus(): LocalServiceStatus {
    return { ...this._status };
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
