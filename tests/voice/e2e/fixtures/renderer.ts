import { createApp, h, ref } from 'vue';
import { createPinia } from 'pinia';
import VoiceCaptureButton from '../../../../src/components/voice/VoiceCaptureButton.vue';
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
    return () => h('main', [
      h('button', { onClick: () => { mounted.value = !mounted.value; } }, mounted.value ? 'Unmount' : 'Mount'),
      mounted.value ? h(VoiceCaptureButton, { onTranscribed: (value: string) => { text.value = value; count.value++; }, onStateChange: (value: string) => { state.value = value; } }) : null,
      h('output', { id: 'result' }, text.value), h('output', { id: 'count' }, String(count.value)), h('output', { id: 'state' }, state.value),
    ]);
  },
}).use(createPinia()).mount('#app');
