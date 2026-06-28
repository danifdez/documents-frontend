import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { ChildProcess, spawn } from 'child_process';

/**
 * Runs the bundled Python ML worker (PyInstaller `documents-models`) as a child
 * process in standalone mode. It polls the same Postgres `jobs` table the backend
 * uses, so it just needs to point at the embedded services and know which feature
 * flags are on for the chosen profile.
 *
 * The worker reads its config from MODELS_CONFIG_PATH (a writable file we author
 * here with the dynamic ports + features) deep-merged over its bundled defaults.
 */
export interface ModelsConfig {
  postgres: { host: string; port: number; user: string; password: string; database: string };
  /** Worker feature flags (config.features) — keyed like the profile features. */
  features: Record<string, boolean>;
  /** Offload LLM layers to GPU when true. */
  gpu: boolean;
}

export class EmbeddedModelsService {
  private process: ChildProcess | null = null;
  private _running = false;

  private servicesDir(): string {
    return path.join(app.getPath('userData'), 'models-service');
  }

  private dataDir(): string {
    return path.join(app.getPath('userData'), 'local-server', 'models');
  }

  private getBinaryPath(): string {
    const ext = process.platform === 'win32' ? '.exe' : '';
    for (const name of ['documents-models', 'jobs']) {
      const p = path.join(this.servicesDir(), name + ext);
      if (fs.existsSync(p)) return p;
    }
    throw new Error('Models service not installed.');
  }

  static isInstalled(): boolean {
    const ext = process.platform === 'win32' ? '.exe' : '';
    const dir = path.join(app.getPath('userData'), 'models-service');
    return (
      fs.existsSync(path.join(dir, 'documents-models' + ext)) ||
      fs.existsSync(path.join(dir, 'jobs' + ext))
    );
  }

  async start(config: ModelsConfig): Promise<void> {
    if (this._running) return;

    const binary = this.getBinaryPath();
    const dataDir = this.dataDir();
    fs.mkdirSync(dataDir, { recursive: true });

    // Author the config override the worker reads (merged over its defaults).
    const overrides = {
      database: {
        host: config.postgres.host,
        port: config.postgres.port,
        name: config.postgres.database,
        user: config.postgres.user,
        password: config.postgres.password,
      },
      // The graph (Apache AGE) shares this same Postgres, so it needs no extra
      // connection config. Whether it's active follows features.relationships.
      features: config.features,
      // GGUF models live in a writable dir (the bundle is read-only); the worker
      // reads them from here, matching MODELS_MODEL_DIR used at download time.
      llm_defaults: { model_dir: path.join(this.servicesDir(), 'models') },
    };
    const configPath = path.join(dataDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(overrides, null, 2));

    const logStream = fs.createWriteStream(path.join(dataDir, 'models.log'), { flags: 'a' });

    const env: Record<string, string> = {
      ...process.env,
      MODELS_CONFIG_PATH: configPath,
      MODELS_DATA_DIR: dataDir,
      MODELS_MODEL_DIR: path.join(this.servicesDir(), 'models'),
      HF_HOME: path.join(this.servicesDir(), 'hf-cache'),
      LLM_N_GPU_LAYERS: config.gpu ? '-1' : '0',
    };

    this.process = spawn(binary, [], {
      env,
      cwd: this.servicesDir(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    this.process.stdout?.pipe(logStream);
    this.process.stderr?.pipe(logStream);
    this.process.on('exit', (code) => {
      this._running = false;
      this.process = null;
      if (code !== 0 && code !== null) {
        console.error(`Models worker exited with code ${code}`);
      }
    });

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
        if (this.process) this.process.kill('SIGKILL');
      }, 5000);
    });
  }

  get running(): boolean {
    return this._running;
  }
}

export const embeddedModels = new EmbeddedModelsService();
