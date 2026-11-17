import { test, expect, type ElectronApplication, type Page } from '@playwright/test';
import { build as bundle } from 'esbuild';
import { build } from '../../../node_modules/vite/dist/node/index.js';
import vue from '@vitejs/plugin-vue';
import * as fs from 'node:fs/promises';
import { constants } from 'node:fs';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import { installTimedAudio, observeEditorTiming, type EditorTiming } from './fixtures/editorTiming';
declare const voiceTest: { inputs(): number[][]; loads(): number; finish(text: string): void; armEditorCapture(requestId: string): void };
declare const notesTest: { holdSaves(): void; releaseSaves(): void; saves(): { id: number; content: string }[] };
declare const editorTiming: EditorTiming;
const root = path.resolve(__dirname, '../../..');
const output = process.env.VOICE_SAFETY_OUTPUT!;
const benchmarkTitle = 'measure real dictation latency in the note editor';
const benchmarkManifest = process.env.VOICE_TEST_TIMING_MANIFEST;
let app: ElectronApplication;
let page: Page;
let profile: string;
let mainBundle: string;
function launchOptions(realEngine = false) {
  return { args: [mainBundle, '--evaluation-capture'], env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined,
    VOICE_TEST_PROFILE: profile, VOICE_TEST_HTML: path.join(output, 'renderer/index.html'), VOICE_TEST_PRELOAD: path.join(output, 'preload.cjs'),
    VOICE_TEST_REAL_ENGINE: realEngine ? '1' : undefined } };
}
test.beforeAll(async () => {
  if (!output || !path.isAbsolute(output)) throw new Error('An explicit isolated output directory is required');
  await build({ configFile: false, root: path.join(__dirname, 'fixtures'), base: './', plugins: [vue()], build: { outDir: path.join(output, 'renderer'), emptyOutDir: false }, logLevel: 'error' });
  let mainDirectory = output;
  if (benchmarkManifest) {
    const buildCache = path.join(root, '.vite');
    await fs.mkdir(buildCache, { recursive: true });
    mainDirectory = await fs.mkdtemp(path.join(buildCache, 'voice-timing-'));
  }
  mainBundle = path.join(mainDirectory, 'main.cjs');
  await bundle({ entryPoints: [path.join(__dirname, 'fixtures/main.ts')], outfile: mainBundle, bundle: true, platform: 'node', external: ['electron', 'smart-whisper', 'ffmpeg-static'] });
  await bundle({ entryPoints: [path.join(root, 'src/preload.ts')], outfile: path.join(output, 'preload.cjs'), bundle: true, platform: 'node', external: ['electron'] });
});
test.beforeEach(async ({ playwright }, info) => {
  const realEngine = info.title === benchmarkTitle;
  test.skip(realEngine && !benchmarkManifest, 'Opt-in real voice timing with a pinned model and authorized audio');
  profile = path.join(output, 'profiles', `${Date.now()}-${info.testId}`); await fs.mkdir(profile, { recursive: true, mode: 0o700 });
  if (realEngine) {
    const { model } = await readBenchmark();
    await fs.mkdir(path.join(profile, 'voice-models'), { mode: 0o700 });
    const target = path.join(profile, 'voice-models', 'whisper-base.ggml');
    await fs.copyFile(model, target, constants.COPYFILE_EXCL);
    await fs.chmod(target, 0o600);
  }
  app = await playwright._electron.launch(launchOptions(realEngine));
  page = await app.firstWindow();
  await expect.poll(() => app.windows().length).toBe(2);
  for (const window of app.windows()) { await window.waitForURL(/index.html/); await window.waitForLoadState(); }
  await expect.poll(() => page.evaluate(() => window.voice!.refreshAvailability())).toBe(true);
});

interface TimingCase { label: string; audio: string; frames: number }
async function readBenchmark(): Promise<{ model: string; trials: TimingCase[] }> {
  if (!benchmarkManifest || !path.isAbsolute(benchmarkManifest)) throw new Error('Use a private timing manifest');
  return JSON.parse(await fs.readFile(benchmarkManifest, 'utf8'));
}

test(benchmarkTitle, async () => {
  test.setTimeout(20 * 60 * 1000);
  const { trials } = await readBenchmark();
  const directory = path.join(output, 'timing');
  await fs.mkdir(directory, { mode: 0o700 });
  for (const [index, trial] of trials.entries()) {
    await test.step(`${index + 1} ${trial.label}`, async () => {
      if (index) {
        await page.reload();
        await expect.poll(() => page.evaluate(() => window.voice!.refreshAvailability())).toBe(true);
      }
      const audio = await fs.readFile(trial.audio);
      if (audio.length !== 44 + trial.frames * 2 || audio.length > 4 * 1024 * 1024) throw new Error('Unexpected WAV fixture size');
      await page.evaluate(installTimedAudio, audio.toString('base64'));
      const requestId = await startNoteDictation();
      await page.evaluate(observeEditorTiming, requestId);
      await expect.poll(() => page.evaluate(() => editorTiming.audioEndedUs !== null && editorTiming.outputs.some((event) => !event.final && event.editorApplied)), { timeout: 75000 }).toBe(true);
      await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup')));
      await expect.poll(() => page.evaluate(() => editorTiming.outputs.some((event) => event.final && event.editorApplied)), { timeout: 90000 }).toBe(true);
      await expect.poll(() => page.evaluate(async (id) => {
        const status = await window.voice!.getStatusLocal(id);
        return status.status;
      }, requestId)).toBe('completed');
      const capture = await page.evaluate((id) => window.voice!.getCaptureLocal(id, true), requestId);
      const timing = await page.evaluate(() => editorTiming);
      await fs.writeFile(path.join(directory, `${String(index).padStart(3, '0')}-${requestId}.json`), JSON.stringify({
        capture, evidence_mode: 'observed', timing, trial: { index, label: trial.label, frames: trial.frames },
      }), { flag: 'wx', mode: 0o600 });
    });
  }
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


test('authorized capture survives process restart and never replays recognition', async ({ playwright }) => {
  const requestId = randomUUID();
  const options = { capture: { requestId, consent: 'granted' as const, purpose: 'evaluation' as const, mediaType: 'audio/wav' as const } };
  const start = await page.evaluate((value) => window.voice!.startLocal(value), options);
  expect(start).toMatchObject({ sessionId: requestId, claimed: true });
  const other = app.windows().find((window) => window !== page)!;
  expect(await other.evaluate(async (id) => {
    try { await window.voice!.getCaptureLocal(id, true); return false; } catch { return true; }
  }, requestId)).toBe(true);
  await page.evaluate(async (id) => {
    await window.voice!.pushChunkLocal(id, new Uint8Array([7, 8]).buffer, 1);
    await window.voice!.pushChunkLocal(id, new Uint8Array([7, 8]).buffer, 1);
  }, requestId);
  const stopping = page.evaluate((id) => window.voice!.stopLocal(id), requestId);
  await expect.poll(() => app.evaluate(() => voiceTest.inputs())).toEqual([[7, 8]]);
  await app.evaluate(() => voiceTest.finish('Captured synthetic result')); await stopping;
  const capture = await page.evaluate((id) => window.voice!.getCaptureLocal(id, true), requestId);
  expect(capture).toMatchObject({ status: 'completed', artifacts: { '1': { base64: 'Bwg=' } } });
  expect(capture.events[1]).toMatchObject({ eventType: 'engine.observed', payload: { adapter: { name: 'smart-whisper', version: '0.8.1' } } });
  expect(capture.missing).not.toContain('engine.native_binary_identity');
  expect(capture.missing).toContain('engine.whisper_cpp_revision');
  const exports = path.join(output, 'exports'); await fs.mkdir(exports, { recursive: true, mode: 0o700 });
  await fs.writeFile(path.join(exports, `engine-capture-${requestId}.json`), JSON.stringify({ capture, evidence_mode: 'simulated' }), { flag: 'wx', mode: 0o600 });
  const journal = path.join(profile, 'evaluation/voice', requestId, 'events.jsonl'); const bytes = await fs.readFile(journal);
  expect(await page.evaluate((id) => window.voice!.getCaptureLocal(id), requestId)).toEqual({ sessionId: requestId, status: 'completed', claimed: false });
  await app.close(); app = await playwright._electron.launch(launchOptions()); page = await app.firstWindow(); await page.waitForLoadState();
  for (let i = 0; i < 3; i++) {
    expect(await page.evaluate((id) => window.voice!.getCaptureLocal(id, true), requestId)).toEqual(capture);
    expect(await page.evaluate((value) => window.voice!.startLocal(value), options)).toEqual({ sessionId: requestId, status: 'completed', claimed: false });
  }
  expect(await app.evaluate(() => voiceTest.inputs())).toEqual([]); expect(await app.evaluate(() => voiceTest.loads())).toBe(0);
  expect(await fs.readFile(journal)).toEqual(bytes);
});

test('cancelled capture keeps its incomplete call without publishing late text', async () => {
  const requestId = randomUUID();
  await page.evaluate((id) => window.voice!.startLocal({ capture: { requestId: id, consent: 'granted', purpose: 'evaluation', mediaType: 'audio/wav' } }), requestId);
  await page.evaluate((id) => window.voice!.pushChunkLocal(id, new Uint8Array([3]).buffer, 1), requestId);
  const stopping = page.evaluate((id) => window.voice!.stopLocal(id), requestId);
  await expect.poll(() => app.evaluate(() => voiceTest.inputs().length)).toBe(1);
  await page.evaluate((id) => window.voice!.cancelLocal(id), requestId);
  const capture = await page.evaluate((id) => window.voice!.getCaptureLocal(id, true), requestId);
  expect(capture).toMatchObject({ status: 'cancelled', missing: expect.arrayContaining(['call.1.finish']) });
  await app.evaluate(() => voiceTest.finish('LATE_CAPTURE_RESULT')); await stopping;
  expect(await page.evaluate((id) => window.voice!.getCaptureLocal(id, true), requestId)).toEqual(capture);
  await expect(page.locator('#result')).toHaveText('');
});

const editor = () => page.locator('.notes-overlay .ProseMirror');
const noteVoiceButton = (name: string) => page.locator('.notes-overlay').getByRole('button', { name });

async function openNoteEditor() {
  await page.getByRole('button', { name: 'Open notes' }).click();
  await page.getByRole('button', { name: /First note/ }).click();
  await expect(editor()).toHaveText('Notes: | existing ending');
}

async function startNoteDictation(selectSuffix = false) {
  await openNoteEditor();
  await editor().evaluate((node, select) => {
    (node as HTMLElement).focus();
    const suffix = node.querySelector('p')!.lastChild!;
    window.getSelection()!.setBaseAndExtent(suffix, 1, suffix, select ? suffix.textContent!.length : 1);
  }, selectSuffix);
  await expect.poll(() => editor().evaluate((node) => {
    const tiptap = (node as HTMLElement & { editor: { state: { selection: { from: number; to: number } } } }).editor;
    return [tiptap.state.selection.from, tiptap.state.selection.to];
  })).toEqual(['Notes: '.length + 1, (selectSuffix ? 'Notes: | existing ending'.length : 'Notes: '.length) + 1]);
  const requestId = randomUUID();
  await app.evaluate((_electron, id) => voiceTest.armEditorCapture(id), requestId);
  await noteVoiceButton('Start dictation').dispatchEvent('pointerdown', { button: 0 });
  await expect(noteVoiceButton('Stop dictation')).toBeVisible();
  return requestId;
}

async function finishNoteCall(index: number, transcript: string) {
  await expect.poll(() => app.evaluate(() => voiceTest.inputs().length)).toBe(index);
  await app.evaluate((_electron, text) => voiceTest.finish(text), transcript);
}

async function waitForVoiceDrain() {
  await expect.poll(() => page.evaluate(async () => {
    try {
      const { sessionId } = await window.voice!.startLocal();
      await window.voice!.cancelLocal(sessionId);
      return true;
    } catch { return false; }
  })).toBe(true);
}

async function exportEditorEvidence(requestId: string, scenario: string, status: 'completed' | 'cancelled', observations: object) {
  const capture = await page.evaluate((id) => window.voice!.getCaptureLocal(id, true), requestId);
  expect(capture).toMatchObject({ requestId, status });
  const directory = path.join(output, 'editor-evidence');
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  await fs.writeFile(path.join(directory, `${scenario}-${requestId}.json`), JSON.stringify({
    capture, evidence_mode: 'simulated',
    editor: { schema_version: 'documents-note-editor-e2e/1', scenario, request_id: requestId,
      capture_manifest_hash: capture.manifestHash, observations },
  }), { flag: 'wx', mode: 0o600 });
}

test('note editor replaces partials at the caret and inserts the final transcript once', async () => {
  const requestId = await startNoteDictation();
  const initial = await editor().textContent();
  await finishNoteCall(1, 'buy');
  await expect(editor()).toHaveText('Notes: buy| existing ending');
  const firstPartial = await editor().textContent();
  await finishNoteCall(2, 'buy bread today');
  await expect(editor()).toHaveText('Notes: buy bread today| existing ending');
  const secondPartial = await editor().textContent();
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup')));
  await finishNoteCall(3, 'buy bread');
  await expect(noteVoiceButton('Start dictation')).toBeEnabled();
  await expect(editor()).toHaveText('Notes: buy bread| existing ending');
  await expect(editor().locator('strong')).toHaveText('Notes:');
  const caretPrefix = () => editor().evaluate((node) => {
    const selection = window.getSelection();
    if (!selection?.isCollapsed || !selection.anchorNode || !node.contains(selection.anchorNode)) return null;
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(selection.anchorNode, selection.anchorOffset);
    return range.toString();
  });
  await expect.poll(caretPrefix).toBe('Notes: buy bread');
  await exportEditorEvidence(requestId, 'replace-partials', 'completed', {
    initial, first_partial: firstPartial, second_partial: secondPartial, final: await editor().textContent(),
    retained_bold: await editor().locator('strong').textContent(), caret_prefix: await caretPrefix(),
  });
});

test('cancelling the pointer discards an in-flight partial in the open note', async () => {
  const requestId = await startNoteDictation();
  const initial = await editor().textContent();
  await expect.poll(() => app.evaluate(() => voiceTest.inputs().length)).toBe(1);
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointercancel')));
  await expect(noteVoiceButton('Start dictation')).toBeEnabled();
  await finishNoteCall(1, 'late partial after cancellation');
  await waitForVoiceDrain();
  await expect(editor()).toHaveText('Notes: | existing ending');
  const inputs = await app.evaluate(() => voiceTest.inputs());
  const saves = await page.evaluate(() => notesTest.saves());
  expect(inputs).toEqual([[1]]);
  expect(saves).toEqual([]);
  await exportEditorEvidence(requestId, 'cancel-pointer', 'cancelled', {
    initial, after_late_result: await editor().textContent(), processing_calls: inputs.length, saves,
  });
});

test('switching notes while the previous save is pending discards the late final', async () => {
  const requestId = await startNoteDictation();
  await finishNoteCall(1, 'first partial');
  await expect(editor()).toHaveText('Notes: first partial| existing ending');
  const firstPartial = await editor().textContent();
  await page.evaluate(() => {
    notesTest.holdSaves();
    window.dispatchEvent(new PointerEvent('pointerup'));
  });
  await expect.poll(() => app.evaluate(() => voiceTest.inputs().length)).toBe(2);
  await page.getByRole('button', { name: /Second note/ }).click();
  await expect.poll(() => page.evaluate(() => notesTest.saves().length)).toBeGreaterThan(0);
  const stillMounted = await editor().count();
  try {
    await finishNoteCall(2, 'late final from first note');
    await waitForVoiceDrain();
    expect(stillMounted).toBe(0);
  } finally {
    await page.evaluate(() => notesTest.releaseSaves());
  }
  await expect(editor()).toHaveText('Other document');
  const secondNote = await editor().textContent();
  await page.getByRole('button', { name: /First note/ }).click();
  await expect(editor()).toHaveText('Notes: first partial| existing ending');
  const saves = await page.evaluate(() => notesTest.saves());
  expect(saves.every((save) => save.id === 1 && !save.content.includes('late final'))).toBe(true);
  await exportEditorEvidence(requestId, 'switch-note', 'cancelled', {
    first_partial: firstPartial, editors_during_save: stillMounted, second_note: secondNote,
    first_note_after_return: await editor().textContent(), saves,
  });
});

test('note dictation handles permission denial without changing the note', async () => {
  await openNoteEditor();
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Permission denied', 'NotAllowedError'); };
  });
  const button = noteVoiceButton('Start dictation');
  await button.dispatchEvent('pointerdown', { button: 0 });
  await expect(button).toHaveAttribute('title', 'Microphone permission denied. Enable it in your system settings.');
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup')));
  await expect(editor()).toHaveText('Notes: | existing ending');
  expect(await app.evaluate(() => voiceTest.inputs())).toEqual([]);
  expect(await page.evaluate(() => notesTest.saves())).toEqual([]);
});

test('note dictation preserves a prior selection when the caret and focus move', async () => {
  await startNoteDictation(true);
  await editor().evaluate((node) => {
    const suffix = node.querySelector('p')!.lastChild!;
    window.getSelection()!.collapse(suffix, suffix.textContent!.length);
  });
  await page.getByPlaceholder('Note title').focus();
  await finishNoteCall(1, 'draft');
  await expect(editor()).toHaveText('Notes: draft| existing ending');
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup')));
  await finishNoteCall(2, 'final');
  await expect(noteVoiceButton('Start dictation')).toBeEnabled();
  await expect(editor()).toHaveText('Notes: final| existing ending');
});

test('empty partial and final recognition leave the note text unchanged', async () => {
  const requestId = await startNoteDictation();
  await finishNoteCall(1, '');
  await expect.poll(() => page.evaluate(async (id) => {
    try {
      const capture = await window.voice!.getCaptureLocal(id, true);
      return capture.events.some((event) => event.eventType === 'output.sent' && event.payload.final === false);
    } catch {
      return false; // The partial may still be committed to the journal.
    }
  }, requestId)).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup')));
  await finishNoteCall(2, '');
  await expect.poll(() => page.evaluate(async (id) => (await window.voice!.getStatusLocal(id)).status, requestId)).toBe('completed');
  const capture = await page.evaluate((id) => window.voice!.getCaptureLocal(id, true), requestId);
  expect(capture.events.filter((event) => event.eventType === 'call.completed').map((event) => event.payload.text)).toEqual(['', '']);
  await expect(editor()).toHaveText('Notes: | existing ending');
  expect(await page.evaluate(() => notesTest.saves())).toEqual([]);
});
