import { createApp, h, ref } from 'vue';
import { createPinia } from 'pinia';
import VoiceCaptureButton from '../../../../src/components/voice/VoiceCaptureButton.vue';
import NotesPanel from '../../../../src/components/notes/NotesPanel.vue';
import apiClient from '../../../../src/services/api';
import { setApiBaseUrlValue } from '../../../../src/services/apiBase';
import { workspaceKey } from '../../../../src/services/workspaceScope';
import { useVoiceSettingsStore } from '../../../../src/store/voiceSettingsStore';

const notes = [
  { id: 1, title: 'First note', content: '<p><strong>Notes:</strong> | existing ending</p>', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 2, title: 'Second note', content: '<p>Other document</p>', updatedAt: '2026-01-02T00:00:00Z' },
];
const saves: { id: number; content: string }[] = [];
const pinia = createPinia();
let saveBarrier: Promise<void> | undefined;
let releaseSave: (() => void) | undefined;
Object.assign(window, { notesTest: {
  holdSaves: () => { saveBarrier = new Promise((resolve) => { releaseSave = resolve; }); },
  releaseSaves: () => { releaseSave?.(); saveBarrier = undefined; },
  saves: () => saves,
  useRemote: (origin: string, token: string) => {
    setApiBaseUrlValue(origin);
    localStorage.setItem(workspaceKey('accessToken'), token);
    useVoiceSettingsStore(pinia).setEngine('remote');
  },
  clearRemote: () => localStorage.removeItem(workspaceKey('accessToken')),
} });
apiClient.defaults.adapter = async (config) => {
  let data: unknown;
  if (config.method === 'get' && config.url === '/projects') data = [];
  else if (config.method === 'get' && config.url === '/notes') data = structuredClone(notes);
  else {
    const note = notes.find((value) => config.url === `/notes/${value.id}`);
    if (!note) throw new Error('Unexpected Notes fixture request');
    if (config.method === 'patch') {
      const update = JSON.parse(config.data);
      if (typeof update.content === 'string') saves.push({ id: note.id, content: update.content });
      await saveBarrier;
      Object.assign(note, update);
    } else if (config.method !== 'get') throw new Error('Unexpected Notes fixture method');
    data = structuredClone(note);
  }
  return { data, status: 200, statusText: 'OK', headers: {}, config };
};
class Recorder extends EventTarget {
  static isTypeSupported() { return true; }
  state = 'inactive';
  ondataavailable?: (event: { data: Blob }) => void;
  start() { this.state = 'recording'; this.ondataavailable?.({ data: new Blob([new Uint8Array([1])]) }); }
  stop() {
    this.state = 'inactive';
    setTimeout(() => {
      this.ondataavailable?.({ data: new Blob([new Uint8Array([2])]) });
      this.dispatchEvent(new Event('stop'));
    }, 0);
  }
}
Object.defineProperty(globalThis, 'MediaRecorder', { value: Recorder });
Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) } });
createApp({
  setup() {
    const mounted = ref(true); const text = ref(''); const count = ref(0); const state = ref('idle');
    const notesOpen = ref(false);
    return () => h('main', [
      h('button', { onClick: () => { mounted.value = !mounted.value; } }, mounted.value ? 'Unmount' : 'Mount'),
      h('button', { onClick: () => { notesOpen.value = true; } }, 'Open notes'),
      h(NotesPanel, { modelValue: notesOpen.value, 'onUpdate:modelValue': (value: boolean) => { notesOpen.value = value; } }),
      mounted.value ? h(VoiceCaptureButton, { onTranscribed: (value: string) => { text.value = value; count.value++; }, onStateChange: (value: string) => { state.value = value; } }) : null,
      h('output', { id: 'result' }, text.value), h('output', { id: 'count' }, String(count.value)), h('output', { id: 'state' }, state.value),
    ]);
  },
}).use(pinia).mount('#app');
