export interface EditorTiming {
  firstAudioUs: number | null;
  audioEndedUs: number | null;
  pointerUpUs: number | null;
  outputs: { final: boolean; receivedUs: number; editorAppliedUs: number | null; editorApplied: boolean; text: string }[];
}

/** Test recorder for regular PCM WAV fixtures with a 44-byte header. */
export function installTimedAudio(base64: string) {
  const audio = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  const timing: EditorTiming = { firstAudioUs: null, audioEndedUs: null, pointerUpUs: null, outputs: [] };
  Object.assign(window, { editorTiming: timing });
  class TimedRecorder extends EventTarget {
    static isTypeSupported() { return true; }
    state = 'inactive';
    ondataavailable?: (event: { data: Blob }) => void;
    private timer?: ReturnType<typeof setTimeout>;
    start(timeslice: number) {
      this.state = 'recording';
      const bytesPerMs = 32;
      const startedAt = performance.now();
      let offset = 0;
      const deliver = (elapsed: number) => {
        if (this.state !== 'recording') return;
        const end = Math.min(44 + elapsed * bytesPerMs, audio.length);
        const now = Math.round(performance.now() * 1000);
        timing.firstAudioUs ??= now;
        this.ondataavailable?.({ data: new Blob([audio.slice(offset, end)]) });
        offset = end;
        if (end === audio.length) timing.audioEndedUs = now;
        else schedule(elapsed + timeslice);
      };
      const schedule = (next: number) => {
        const elapsed = Math.min(next, (audio.length - 44) / bytesPerMs);
        this.timer = setTimeout(() => deliver(elapsed), Math.max(0, startedAt + elapsed - performance.now()));
      };
      schedule(timeslice);
    }
    stop() {
      this.state = 'inactive';
      clearTimeout(this.timer);
      setTimeout(() => this.dispatchEvent(new Event('stop')), 0);
    }
  }
  Object.defineProperty(globalThis, 'MediaRecorder', { value: TimedRecorder });
}

/** Observe the real editor transaction and matching same-session IPC on one renderer clock. */
export function observeEditorTiming(requestId: string) {
  const timing = (window as Window & { editorTiming: EditorTiming }).editorTiming;
  window.addEventListener('pointerup', () => { timing.pointerUpUs = Math.round(performance.now() * 1000); }, { capture: true, once: true });
  const node = document.querySelector('.notes-overlay .ProseMirror') as HTMLElement & {
    editor: { on(event: 'transaction', callback: (value: { transaction: { docChanged: boolean } }) => void): void };
  };
  let appliedAt: number | null = null;
  node.editor.on('transaction', ({ transaction }) => {
    if (transaction.docChanged) appliedAt = Math.round(performance.now() * 1000);
  });
  const unsubscribe = window.voice!.onPartialLocal((result) => {
    if (result.sessionId !== requestId) return;
    const receivedUs = Math.round(performance.now() * 1000);
    const applied = appliedAt !== null && Boolean(result.text) && node.textContent === `Notes: ${result.text}| existing ending`;
    timing.outputs.push({ final: result.isFinal, receivedUs, editorAppliedUs: applied ? appliedAt : null, editorApplied: applied, text: result.text });
    appliedAt = null;
    if (result.isFinal) unsubscribe();
  });
}
