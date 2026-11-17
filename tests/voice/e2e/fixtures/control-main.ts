/** Isolated test entry: production control/IPC/engine, injected simulated runtime. */
import { app } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { evaluationProfile } from '../../../../src/main/evaluation/profile';
import { startEvaluation } from '../../../../src/main/evaluation/control';
import { LocalEngine } from '../../../../src/main/voice/localEngine';
const profile = evaluationProfile(process.argv)!;
app.setPath('userData', profile);
const stats = { loads: 0, calls: 0, decoded: 0, freed: 0 };
const save = () => fs.writeFileSync(path.join(profile, 'simulation.json'), JSON.stringify(stats), { mode: 0o600 });
const engine = new LocalEngine({
  available: () => true, hasModel: async () => true,
  load: async () => { stats.loads++; save(); return {
    transcribe: async () => { stats.calls++; save(); return { result: new Promise((resolve) => setTimeout(() => resolve([{ text: 'Simulated local transcript' }]), 1000)) }; },
    free: async () => { stats.freed++; save(); },
  }; },
  decode: async () => { stats.decoded++; save(); return new Float32Array([0.25]); },
}, undefined, { allowModelDownload: false });
app.whenReady().then(() => startEvaluation(profile, path.join(__dirname, 'preload.cjs'), engine, 'simulated')).catch(() => { process.stderr.write('Evaluation fixture failed\n'); app.exit(1); });
app.on('before-quit', () => { void engine.shutdown(); });
