<template>
  <button
    type="button"
    :class="buttonClass"
    :disabled="isDisabled"
    :aria-label="ariaLabel"
    :title="tooltip || ariaLabel"
    @pointerdown="onPointerDown"
    @contextmenu.prevent
  >
    <span class="flex items-center gap-1.5">
      <svg
        v-if="state === 'recording' || state === 'stopping'"
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <rect x="6" y="6" width="12" height="12" rx="2" />
      </svg>
      <svg
        v-else-if="state === 'queued'"
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4 animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 2v4" />
        <path d="M12 18v4" />
        <path d="M4.93 4.93l2.83 2.83" />
        <path d="M16.24 16.24l2.83 2.83" />
        <path d="M2 12h4" />
        <path d="M18 12h4" />
        <path d="M4.93 19.07l2.83-2.83" />
        <path d="M16.24 7.76l2.83-2.83" />
      </svg>
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="9" y="3" width="6" height="12" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="8" y1="22" x2="16" y2="22" />
      </svg>
      <span v-if="state === 'recording'" class="text-xs tabular-nums">{{ durationLabel }}</span>
      <span v-else-if="state === 'requestingPermission'" class="text-xs">Permission…</span>
      <span v-else-if="state === 'loadingModel'" class="text-xs">Loading model…</span>
      <span v-else-if="state === 'stopping'" class="text-xs">Finalizing…</span>
      <span v-else-if="state === 'queued'" class="text-xs">{{ queuedLabel }}</span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { createVoiceDriver } from '../../services/voice/voiceDriverFactory';
import { VoiceCancelledError, type VoiceDriver, type VoicePartial, type VoiceQueuedInfo } from '../../types/voice';

type VoiceState =
  | 'idle'
  | 'requestingPermission'
  | 'loadingModel'
  | 'queued'
  | 'recording'
  | 'stopping'
  | 'error';

const props = withDefaults(defineProps<{
  mode?: 'inline' | 'standalone';
  disabled?: boolean;
  chunkMs?: number;
}>(), {
  mode: 'inline',
  disabled: false,
  chunkMs: 500,
});

const emit = defineEmits<{
  (e: 'transcribed', text: string, isFinal: boolean): void;
  (e: 'error', err: Error): void;
  (e: 'stateChange', state: VoiceState): void;
}>();

const state = ref<VoiceState>('idle');
const tooltip = ref<string>('');
const startedAt = ref<number | null>(null);
const now = ref<number>(0);
const queuePosition = ref<number>(0);
const queueEta = ref<number>(0);
let tickTimer: ReturnType<typeof setInterval> | null = null;

let driver: VoiceDriver | null = null;
let unsubPartial: (() => void) | null = null;
let unsubError: (() => void) | null = null;
let unsubQueued: (() => void) | null = null;
let recorder: MediaRecorder | null = null;
let stream: MediaStream | null = null;
let locked = false; // prevents rapid double clicks during transitions

function setState(next: VoiceState) {
  state.value = next;
  emit('stateChange', next);
}

const isDisabled = computed(() => props.disabled || locked);

const ariaLabel = computed(() => {
  if (state.value === 'recording') return 'Stop dictation';
  if (state.value === 'queued') return 'Cancel wait';
  return 'Start dictation';
});

const durationLabel = computed(() => {
  if (!startedAt.value) return '00:00';
  const total = Math.max(0, Math.floor((now.value - startedAt.value) / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
});

const queuedLabel = computed(() => {
  const eta = queueEta.value;
  const pos = queuePosition.value;
  if (!pos) return 'Queued…';
  if (!eta) return `Queued (${pos})`;
  const mm = String(Math.floor(eta / 60)).padStart(2, '0');
  const ss = String(eta % 60).padStart(2, '0');
  return `Queued (${pos}) — ${mm}:${ss}`;
});

const buttonClass = computed(() => {
  const base = 'inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  const size = props.mode === 'standalone' ? 'px-3 py-2' : 'px-2 py-1.5';
  if (state.value === 'recording') return `${base} ${size} bg-red-500/10 text-red-500 hover:bg-red-500/20`;
  if (state.value === 'queued') return `${base} ${size} bg-amber-500/10 text-amber-600 hover:bg-amber-500/20`;
  if (state.value === 'error') return `${base} ${size} bg-red-500/10 text-red-500`;
  return `${base} ${size} text-text-secondary hover:bg-surface-hover hover:text-text-primary`;
});

// Push-to-talk: hold to record, release to finish.
// `holding` is updated on mousedown/up so that, if the user releases
// during startup (requestingPermission/queued), we ask to stop as soon
// as the session reaches `recording`. We capture `pointerup` on window
// because the user may drag the pointer outside the button before
// releasing.
let holding = false;

function onPointerDown(ev: PointerEvent) {
  if (locked || props.disabled) return;
  if (state.value !== 'idle' && state.value !== 'error') return;
  if (ev.button !== 0) return; // primary button only
  holding = true;
  window.addEventListener('pointerup', onWindowPointerUp);
  window.addEventListener('pointercancel', onWindowPointerUp);
  void startSession().then(() => {
    // If released during startup, stop immediately.
    if (!holding && state.value === 'recording') {
      void stopSession();
    }
  });
}

function onWindowPointerUp() {
  window.removeEventListener('pointerup', onWindowPointerUp);
  window.removeEventListener('pointercancel', onWindowPointerUp);
  holding = false;
  if (state.value === 'recording') {
    void stopSession();
  } else if (state.value === 'queued') {
    void cancelFromQueue();
  }
  // If in requestingPermission/loadingModel/stopping, we wait for
  // startSession to resolve and check `holding`.
}

async function startSession() {
  locked = true;
  try {
    setState('requestingPermission');
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    if (typeof MediaRecorder === 'undefined') {
      throw new Error('MediaRecorder not available in this environment.');
    }

    driver = createVoiceDriver();
    unsubPartial = driver.onPartial(onPartial);
    unsubError = driver.onError(onDriverError);
    if (driver.onQueued) {
      unsubQueued = driver.onQueued(onQueuedInfo);
    }

    await driver.start();

    // start() resolved → we have a worker assigned. Start recording now.
    const mimeType = pickMimeType();
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0 && driver) {
        driver.pushChunk(ev.data);
      }
    };
    recorder.start(props.chunkMs);

    startedAt.value = Date.now();
    now.value = startedAt.value;
    tickTimer = setInterval(() => { now.value = Date.now(); }, 500);

    setState('recording');
  } catch (err) {
    await cleanup();
    if (err instanceof VoiceCancelledError) {
      setState('idle');
      return;
    }
    showError(err);
  } finally {
    locked = false;
  }
}

async function stopSession() {
  if (state.value !== 'recording') return;
  locked = true;
  try {
    setState('stopping');
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    if (driver) {
      await driver.stop();
    }
  } catch (err) {
    showError(err);
  } finally {
    await cleanup();
    if ((state.value as VoiceState) !== 'error') setState('idle');
    locked = false;
  }
}

async function cancelFromQueue() {
  if (state.value !== 'queued') return;
  locked = true;
  try {
    if (driver) await driver.cancel();
  } finally {
    await cleanup();
    setState('idle');
    locked = false;
  }
}

function pickMimeType(): string | undefined {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
  ];
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return undefined;
  }
  return candidates.find((c) => MediaRecorder.isTypeSupported(c));
}

function onPartial(p: VoicePartial) {
  emit('transcribed', p.text, p.isFinal);
}

function onQueuedInfo(info: VoiceQueuedInfo) {
  queuePosition.value = info.position;
  queueEta.value = info.eta;
  // Only enter 'queued' state if we are not already recording.
  if (state.value === 'requestingPermission' || state.value === 'queued') {
    setState('queued');
  }
}

function onDriverError(err: Error) {
  showError(err);
  void cleanup();
}

function showError(err: unknown) {
  const e = err instanceof Error ? err : new Error(String(err));
  tooltip.value = friendlyMessage(e);
  setState('error');
  emit('error', e);
}

function friendlyMessage(err: Error): string {
  const msg = err.message || '';
  if (err.name === 'NotAllowedError' || /denied/i.test(msg)) {
    return 'Microphone permission denied. Enable it in your system settings.';
  }
  if (err.name === 'NotFoundError') {
    return 'No microphone detected.';
  }
  return msg || 'Failed to start dictation.';
}

async function cleanup() {
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  startedAt.value = null;
  queuePosition.value = 0;
  queueEta.value = 0;

  if (recorder) {
    try {
      if (recorder.state !== 'inactive') recorder.stop();
    } catch { /* ignore */ }
    recorder.ondataavailable = null;
    recorder = null;
  }
  if (stream) {
    for (const track of stream.getTracks()) track.stop();
    stream = null;
  }
  if (unsubPartial) { unsubPartial(); unsubPartial = null; }
  if (unsubError) { unsubError(); unsubError = null; }
  if (unsubQueued) { unsubQueued(); unsubQueued = null; }
  driver = null;
}

onBeforeUnmount(() => {
  window.removeEventListener('pointerup', onWindowPointerUp);
  window.removeEventListener('pointercancel', onWindowPointerUp);
  void cleanup();
});
</script>
