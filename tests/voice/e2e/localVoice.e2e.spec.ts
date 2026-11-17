import { test, expect, type ElectronApplication, type Page } from '@playwright/test';
import { build as bundle } from 'esbuild';
import { build } from '../../../node_modules/vite/dist/node/index.js';
import vue from '@vitejs/plugin-vue';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
declare const voiceTest: { inputs(): number[][]; finish(text: string): void };
const root = path.resolve(__dirname, '../../..');
const output = process.env.VOICE_SAFETY_OUTPUT!;
let app: ElectronApplication;
let page: Page;
test.beforeAll(async () => {
  if (!output || !path.isAbsolute(output)) throw new Error('An explicit isolated output directory is required');
  await build({ configFile: false, root: path.join(__dirname, 'fixtures'), base: './', plugins: [vue()], build: { outDir: path.join(output, 'renderer'), emptyOutDir: false }, logLevel: 'error' });
  await bundle({ entryPoints: [path.join(__dirname, 'fixtures/main.ts')], outfile: path.join(output, 'main.cjs'), bundle: true, platform: 'node', external: ['electron', 'smart-whisper', 'ffmpeg-static'] });
  await bundle({ entryPoints: [path.join(root, 'src/preload.ts')], outfile: path.join(output, 'preload.cjs'), bundle: true, platform: 'node', external: ['electron'] });
});
test.beforeEach(async ({ playwright }, info) => {
  const profile = path.join(output, 'profiles', `${Date.now()}-${info.testId}`); await fs.mkdir(profile, { recursive: true });
  app = await playwright._electron.launch({ args: [path.join(output, 'main.cjs')], env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined,
    VOICE_TEST_PROFILE: profile, VOICE_TEST_HTML: path.join(output, 'renderer/index.html'), VOICE_TEST_PRELOAD: path.join(output, 'preload.cjs') } });
  page = await app.firstWindow(); await page.waitForURL(/index.html/); await page.waitForLoadState();
  await expect.poll(() => page.evaluate(() => window.voice!.refreshAvailability())).toBe(true);
});
test.afterEach(async () => { await app?.close(); });
async function startAndStop() {
  await page.getByRole('button', { name: 'Start dictation' }).dispatchEvent('pointerdown', { button: 0 });
  await expect(page.locator('#state')).toHaveText('recording');
  await page.evaluate(() => window.dispatchEvent(new Event('pointerup')));
  await expect.poll(() => app.evaluate(() => voiceTest.inputs().length)).toBe(1);
}
test('final recorder chunk reaches IPC before the one final inference', async () => {
  await startAndStop();
  expect(await app.evaluate(() => voiceTest.inputs())).toEqual([[1, 2]]);
  await app.evaluate(() => voiceTest.finish('Fixture transcript'));
  await expect(page.locator('#result')).toHaveText('Fixture transcript');
  await expect(page.locator('#count')).toHaveText('1');
  await expect(page.locator('#state')).toHaveText('idle');
});
test('unmount cancels pending final, blocks reuse until drain and rejects another owner', async () => {
  await startAndStop(); await page.getByRole('button', { name: 'Unmount' }).click();
  await expect.poll(() => page.evaluate(async () => {
    try { await window.voice!.startLocal(); return 'unexpected'; } catch { return 'busy'; }
  })).toBe('busy');
  await app.evaluate(() => voiceTest.finish('LATE_PRIVATE_TEXT'));
  let sessionId = '';
  await expect.poll(async () => {
    try { sessionId = await page.evaluate(async () => (await window.voice!.startLocal()).sessionId); return true; } catch { return false; }
  }).toBe(true);
  const other = app.windows().find((window) => window !== page)!;
  expect(await other.evaluate(async (id) => {
    try { await window.voice!.stopLocal(id); return false; } catch { return true; }
  }, sessionId)).toBe(true);
  await page.evaluate((id) => window.voice!.cancelLocal(id), sessionId);
  await expect(page.locator('#result')).toHaveText('');
  await expect(page.locator('#count')).toHaveText('0');
});

test('main-frame reload invalidates the old session without delivering its native result', async () => {
  await startAndStop(); await page.reload();
  await expect.poll(() => page.evaluate(() => window.voice!.refreshAvailability())).toBe(true);
  expect(await page.evaluate(async () => {
    try { await window.voice!.startLocal(); return false; } catch { return true; }
  })).toBe(true);
  await app.evaluate(() => voiceTest.finish('LATE_AFTER_RELOAD'));
  let sessionId = '';
  await expect.poll(async () => {
    try { sessionId = await page.evaluate(async () => (await window.voice!.startLocal()).sessionId); return true; } catch { return false; }
  }).toBe(true);
  await page.evaluate((id) => window.voice!.cancelLocal(id), sessionId);
  await expect(page.locator('#result')).toHaveText('');
});
