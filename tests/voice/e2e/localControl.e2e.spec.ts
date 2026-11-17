import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { spawn, type ChildProcess } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as net from 'node:net';
import * as path from 'node:path';
import * as os from 'node:os';
import { randomUUID, createHash } from 'node:crypto';
import type { EvaluationInput } from '../../../src/ipc/evaluation';
const output = process.env.VOICE_SAFETY_OUTPUT!;
let profile: string; let processChild: ChildProcess;
const fixture = path.join(output, 'control');
const input = (): EvaluationInput => ({ media_type: 'audio/wav', chunks: [{ size: 2, base64: 'Bwg=', sha256: 'sha256:' + createHash('sha256').update(Buffer.from([7, 8])).digest('hex') }],
  execution: { delivery: 'ordered_ack', finish: 'stop', evidence_mode: 'simulated' } });
async function request(operation: string, requestId: string | null = null, value: unknown = null, forgedToken?: string): Promise<import("../../../src/types/voice").LocalCaptureSnapshot & { evidence_mode: string; calls: number }> {
  const credentials = JSON.parse(await fs.readFile(path.join(profile, 'evaluation-control.json'), 'utf8'));
  return new Promise((resolve, reject) => {
    const channel = net.createConnection(path.join(profile, 'evaluation.sock')); let raw = '';
    channel.setTimeout(15000, () => { channel.destroy(); reject(new Error('Control timeout')); });
    channel.on('error', reject);
    channel.on('connect', () => channel.write(JSON.stringify({ token: forgedToken ?? credentials.token, operation, requestId, input: value }) + '\n'));
    channel.on('data', (part) => { raw += part; if (raw.includes('\n')) { const reply = JSON.parse(raw); channel.end(); if (reply.ok) resolve(reply.value); else reject(new Error('Control rejected request: '+operation)); } });
  });
}
test.beforeAll(async () => {
  if (!output || !path.isAbsolute(output)) throw new Error('Isolated output required');
  await build({ entryPoints: [path.join(__dirname, 'fixtures/control-main.ts')], outfile: path.join(fixture, 'control.cjs'), bundle: true, platform: 'node', external: ['electron','smart-whisper','ffmpeg-static'] });
  await build({ entryPoints: [path.resolve(__dirname, '../../../src/preload.ts')], outfile: path.join(fixture, 'preload.cjs'), bundle: true, platform: 'node', external: ['electron'] });
});
test.beforeEach(async () => {
  profile = await fs.mkdtemp(path.join(os.tmpdir(), 'documents-evaluation-'));
  await fs.writeFile(path.join(profile, '.ai-train-laboratory'), 'ai-train-laboratory/1\n', { mode: 0o600 });
  // Plain Electron child: no Playwright debugger, remote ports or sandbox bypass.
  const binary = path.resolve(__dirname, '../../../node_modules/electron/dist/electron');
  const log = await fs.open(path.join(profile, 'electron.log'), 'ax', 0o600);
  processChild = spawn(binary, [path.join(fixture, 'control.cjs'), '--evaluation-control','--evaluation-capture','--evaluation-profile='+profile], {
    env: { PATH: process.env.PATH, HOME: process.env.HOME, DISPLAY: process.env.DISPLAY, XAUTHORITY: process.env.XAUTHORITY,
      XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR, DBUS_SESSION_BUS_ADDRESS: process.env.DBUS_SESSION_BUS_ADDRESS },
    stdio: ['ignore',log.fd,log.fd],
  });
  await log.close();
  await expect.poll(async () => { try { return (await request('health')).evidence_mode; } catch { return null; } }, { timeout: 15000 }).toBe('simulated');
});
test.afterEach(async () => {
  if (processChild?.exitCode === null) await request('shutdown');
  await expect.poll(() => processChild?.exitCode, { timeout: 15000 }).not.toBeNull();
  // Profiles and captures intentionally survive for inspection/final cleanup.
});
test('private control rejects unauthenticated, executable and wrong-mode requests', async () => {
  const id = randomUUID();
  await expect(request('run', id, input(), '0'.repeat(64))).rejects.toThrow('rejected');
  await expect(request('eval', id, { command: 'touch /tmp/not-allowed' })).rejects.toThrow('rejected');
  await expect(request('run', id, { ...input(), code: 'not executable' })).rejects.toThrow('rejected');
  const value = input(); value.execution.evidence_mode = 'observed';
  await expect(request('run', id, value)).rejects.toThrow('rejected');
  expect((await request('status', id)).status).toBe('not_found');
  expect((await fs.stat(path.join(profile,'evaluation-control.json'))).mode & 0o777).toBe(0o600);
  expect((await fs.stat(path.join(profile,'evaluation.sock'))).mode & 0o777).toBe(0o600);
  await expect(fs.stat(path.join(profile,'simulation.json'))).rejects.toThrow();
});
test('one durable request survives lost connection and repeated submissions without another call', async () => {
  const id = randomUUID();
  const { token } = JSON.parse(await fs.readFile(path.join(profile,'evaluation-control.json'),'utf8'));
  await new Promise<void>((resolve,reject) => {
    const channel=net.createConnection(path.join(profile,'evaluation.sock'));channel.on('error',reject);
    channel.on('connect',() => channel.end(JSON.stringify({ token,operation:'run',requestId:id,input:input() })+'\n',() => { channel.destroy();resolve(); }));
  });
  await Promise.all(Array.from({ length:3 },() => request('run',id,input())));
  await expect.poll(async () => (await request('status', id)).status).toBe('completed');
  const capture = await request('capture', id);
  const before = await fs.readFile(path.join(profile,'simulation.json'),'utf8');
  for (let i=0;i<3;i++) { await request('run',id,input()); expect(await request('capture',id)).toEqual(capture); }
  expect(await fs.readFile(path.join(profile,'simulation.json'),'utf8')).toBe(before);
  expect(JSON.parse(before)).toMatchObject({ loads:1,calls:1,decoded:1 });
  const conflict=input(); conflict.execution.finish='cancel';
  await expect(request('run',id,conflict)).rejects.toThrow('rejected');
  const journal=path.join(profile,'evaluation/voice',id,'events.jsonl'); await fs.appendFile(journal,'BROKEN\n');
  await expect(request('status',id)).rejects.toThrow('rejected');
});
test('cancellation drains the simulated native call and never publishes its late result', async () => {
  const id=randomUUID();await request('run',id,input());
  await expect.poll(async () => { try { return JSON.parse(await fs.readFile(path.join(profile,'simulation.json'),'utf8')).calls; } catch { return 0; } }).toBe(1);
  await request('cancel',id);
  const capture=await request('capture',id);expect(capture.status).toBe('cancelled');expect(capture.missing).toContain('call.1.finish');
  await expect.poll(async () => JSON.parse(await fs.readFile(path.join(profile,'simulation.json'),'utf8')).calls).toBe(1);
  await request('run',id,input());expect(await request('capture',id)).toEqual(capture);
  expect(capture.events.some((event: { eventType: string }) => event.eventType==='output.sent')).toBe(false);
});
