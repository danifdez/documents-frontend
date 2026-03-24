import { execSync } from 'child_process';
import * as path from 'path';

const ROOT_DIR = path.join(__dirname, '..', '..', '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const MANAGE_SCRIPT = path.join(ROOT_DIR, 'manage');

function run(cmd: string, cwd = ROOT_DIR) {
  execSync(cmd, { cwd, stdio: 'inherit', timeout: 120_000 });
}

function waitForBackend(maxRetries = 60) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Check a real API endpoint, not just the root
      execSync('curl -sf http://localhost:3000/projects > /dev/null 2>&1', { timeout: 5_000 });
      return;
    } catch {}
    execSync('sleep 1');
  }
  throw new Error(`Backend not reachable after ${maxRetries}s`);
}

export default function globalSetup() {
  // 1. Reset data (stops services, drops DB, clears docs/qdrant/config, runs migrations)
  console.log('\n[global-setup] Resetting database, documents and Qdrant...');
  run(`bash ${MANAGE_SCRIPT} reset --yes`);
  console.log('[global-setup] Reset complete.');

  // 2. Start services (reset kills backend/models, so always restart)
  //    NODE_ENV=test disables rate limiting in the backend for e2e tests
  console.log('[global-setup] Starting services...');
  run(`NODE_ENV=test bash ${MANAGE_SCRIPT} start`);

  // 3. Wait for backend API to be fully ready (not just healthcheck)
  console.log('[global-setup] Waiting for backend API...');
  waitForBackend(60);
  console.log('[global-setup] Backend ready.');

  // 4. Build the Electron app (renderer + main process)
  console.log('[global-setup] Building Electron app...');
  run('npm run package', FRONTEND_DIR);
  console.log('[global-setup] Build complete.\n');
}
