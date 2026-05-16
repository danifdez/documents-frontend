<template>
  <div class="space-y-3">
    <div>
      <h3 class="text-sm font-semibold text-text-primary">Transcription engine</h3>
      <p class="text-xs text-text-muted mt-0.5">
        Changes apply to the next dictation session, not the current one.
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <label
        v-for="opt in options"
        :key="opt.value"
        class="flex items-start gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors"
        :class="engine === opt.value
          ? 'border-accent bg-accent-subtle'
          : 'border-border bg-surface hover:bg-surface-hover'"
      >
        <input
          type="radio"
          name="voice-engine"
          :value="opt.value"
          :checked="engine === opt.value"
          class="accent-accent w-3.5 h-3.5 mt-0.5"
          @change="onSelect(opt.value)"
        />
        <div class="min-w-0">
          <div class="text-sm font-medium text-text-primary">{{ opt.label }}</div>
          <div class="text-xs text-text-muted">{{ opt.description }}</div>
        </div>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVoiceEngine } from '../../composables/useVoiceEngine';
import type { VoiceEngine } from '../../store/voiceSettingsStore';
import { preloadLocalEngineIfNeeded } from '../../services/voice/preloadLocalEngine';

const { engine, setEngine } = useVoiceEngine();

const options: { value: VoiceEngine; label: string; description: string }[] = [
  {
    value: 'local',
    label: 'Local (recommended, no network)',
    description: 'Transcribes on your machine with whisper.cpp. Maximum privacy, no cost.',
  },
  {
    value: 'remote',
    label: 'Server (when local is slow or fails)',
    description: 'Sends audio to the workspace server. Useful on modest machines.',
  },
];

function onSelect(value: VoiceEngine) {
  setEngine(value);
  if (value === 'local') {
    // Trigger the download + warm-up now so the first dictation is instant.
    preloadLocalEngineIfNeeded();
  }
}
</script>
