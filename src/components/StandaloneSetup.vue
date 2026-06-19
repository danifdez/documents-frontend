<template>
  <div class="flex flex-col items-center gap-6 max-w-2xl px-6 w-full">
    <h1 class="text-2xl font-bold text-text-primary">Documents</h1>

    <!-- Checking hardware -->
    <p v-if="phase === 'checking'" class="text-sm text-text-muted">Checking your hardware…</p>

    <!-- Machine can't run the local AI → offer a server -->
    <div v-else-if="phase === 'blocked'" class="flex flex-col items-center gap-4 w-full">
      <p class="text-sm text-text-secondary text-center">This machine can't run Documents locally.</p>
      <p class="text-xs text-text-muted text-center">{{ report?.blockReason }}</p>
      <button @click="$emit('use-server')"
        class="w-full p-3 rounded-2xl border border-border bg-surface-elevated hover:bg-surface-hover transition-colors cursor-pointer text-center">
        <span class="font-medium text-text-primary">Connect to a server instead</span>
      </button>
      <button @click="$emit('back')" class="text-xs text-text-muted hover:text-text-secondary cursor-pointer">Back</button>
    </div>

    <!-- Choose a profile -->
    <template v-else-if="phase === 'choose'">
      <p class="text-sm text-text-muted text-center">Choose how much to install. You can enable or disable features later in Settings.</p>
      <p class="text-xs text-text-muted">{{ hardwareSummary }}</p>

      <div class="flex flex-col gap-3 w-full">
        <button v-for="p in report?.profiles" :key="p.key"
          @click="p.status !== 'no' && (selectedKey = p.key)"
          :disabled="p.status === 'no'"
          :class="[
            'w-full p-4 rounded-2xl border text-left transition-colors',
            p.status === 'no' ? 'opacity-50 cursor-not-allowed border-border' : 'cursor-pointer',
            selectedKey === p.key ? 'border-accent bg-surface-hover' : 'border-border bg-surface-elevated hover:bg-surface-hover',
          ]">
          <div class="flex items-center justify-between mb-1">
            <span class="font-medium text-text-primary">{{ p.label }}</span>
            <span class="flex items-center gap-2">
              <span v-if="p.key === report?.recommended && p.status !== 'no'"
                class="text-[10px] uppercase tracking-wide text-accent border border-accent rounded-full px-2 py-0.5">Recommended</span>
              <span :class="['text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5', statusClass(p.status)]">{{ statusLabel(p.status) }}</span>
            </span>
          </div>
          <div class="text-xs text-text-muted">{{ p.description }}</div>
          <div v-if="p.reason" class="text-xs text-amber-600 dark:text-amber-500 mt-1">{{ p.reason }}</div>
          <div class="text-[11px] text-text-muted mt-2">Download ≈ {{ p.downloadGB }} GB</div>
        </button>
      </div>

      <div class="flex items-center gap-3">
        <button @click="$emit('back')" class="text-xs text-text-muted hover:text-text-secondary cursor-pointer">Back</button>
        <button @click="install" :disabled="!selectedProfile"
          class="px-5 py-2 rounded-2xl bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50">
          Install {{ selectedProfile?.label }}
        </button>
      </div>
    </template>

    <!-- Installing -->
    <div v-else-if="phase === 'installing'" class="flex flex-col items-center gap-3 w-full">
      <p class="text-sm text-text-secondary">{{ progressLabel }}</p>
      <div class="w-full h-2 rounded-full bg-border overflow-hidden">
        <div class="h-full bg-accent transition-all" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="phase === 'error'" class="flex flex-col items-center gap-3 w-full">
      <p class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 w-full text-center">{{ error }}</p>
      <button @click="phase = 'choose'" class="text-xs text-text-muted hover:text-text-secondary cursor-pointer">Back to options</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useFeatureStore } from '../store/featureStore';

type ProfileStatus = 'yes' | 'slow' | 'no';
interface Profile {
  key: string;
  label: string;
  description: string;
  status: ProfileStatus;
  reason: string;
  downloadGB: number;
  components: string[];
  features: string[];
  llm: boolean;
}
interface Report {
  hardware: { cpuModel: string; cpuCores: number; ramGB: number; freeDiskGB: number | null; gpu: { name: string | null; vramGB: number } };
  canInstall: boolean;
  blockReason: string;
  profiles: Profile[];
  recommended: string;
}

const emit = defineEmits<{ (e: 'done'): void; (e: 'use-server'): void; (e: 'back'): void }>();

const workspaceStore = useWorkspaceStore();
const featureStore = useFeatureStore();

const phase = ref<'checking' | 'blocked' | 'choose' | 'installing' | 'error'>('checking');
const report = ref<Report | null>(null);
const selectedKey = ref<string>('');
const progressPercent = ref(0);
const progressComponent = ref('');
const progressStep = ref(0);
const progressTotalSteps = ref(0);
const error = ref('');

// Friendlier names for the components reported by the installer.
const COMPONENT_LABELS: Record<string, string> = {
  postgres: 'database',
  backend: 'server',
  qdrant: 'search index',
  neo4j: 'knowledge graph',
  'models-cpu': 'AI engine',
  'models-gpu': 'AI engine',
  'ai-models': 'AI models',
};

const selectedProfile = computed(() => report.value?.profiles.find((p) => p.key === selectedKey.value) || null);

const hardwareSummary = computed(() => {
  const h = report.value?.hardware;
  if (!h) return '';
  const parts = [`${h.ramGB} GB RAM`, `${h.cpuCores} cores`];
  if (h.gpu?.name) parts.push(`${h.gpu.name} (${h.gpu.vramGB} GB)`);
  if (h.freeDiskGB !== null) parts.push(`${h.freeDiskGB} GB free`);
  return parts.join(' · ');
});

const progressLabel = computed(() => {
  if (!progressComponent.value) return 'Preparing…';
  const name = COMPONENT_LABELS[progressComponent.value] || progressComponent.value;
  const stepInfo = progressTotalSteps.value ? `Step ${progressStep.value}/${progressTotalSteps.value} · ` : '';
  return `${stepInfo}Installing ${name}… ${progressPercent.value}%`;
});

function statusLabel(s: ProfileStatus): string {
  return s === 'yes' ? 'Runs well' : s === 'slow' ? 'Runs slowly' : 'Not supported';
}
function statusClass(s: ProfileStatus): string {
  return s === 'yes'
    ? 'text-green-600 border border-green-600'
    : s === 'slow'
      ? 'text-amber-600 border border-amber-600'
      : 'text-text-muted border border-border';
}

onMounted(async () => {
  window.electronAPI?.onStandaloneDownloadProgress?.((p) => {
    progressComponent.value = p.component;
    // Drive the bar with the weighted overall progress when available.
    progressPercent.value = p.overallPercent ?? p.percent;
    progressStep.value = p.step ?? 0;
    progressTotalSteps.value = p.totalSteps ?? 0;
  });
  try {
    report.value = await window.electronAPI.standaloneHardwareReport();
    if (!report.value.canInstall) {
      phase.value = 'blocked';
      return;
    }
    selectedKey.value = report.value.recommended;
    phase.value = 'choose';
  } catch (e: any) {
    error.value = e.message || 'Hardware check failed';
    phase.value = 'error';
  }
});

async function install() {
  const profile = selectedProfile.value;
  if (!profile) return;
  phase.value = 'installing';
  progressPercent.value = 0;

  try {
    // Pass plain arrays — Vue's reactive proxies aren't structured-cloneable and
    // the IPC call throws "An object could not be cloned" otherwise.
    const result = await window.electronAPI.standaloneInstallProfile({
      key: profile.key,
      components: [...profile.components],
      features: [...profile.features],
    });
    if (!result.success) {
      error.value = result.error || 'Installation failed';
      phase.value = 'error';
      return;
    }

    // Mirror the preset on the frontend: disable the features this profile omits.
    await saveDisabledFeatures(profile);

    // Start services + register the local workspace (reads the persisted profile).
    await workspaceStore.setupLocal();
    if (workspaceStore.localServerError) {
      error.value = workspaceStore.localServerError;
      phase.value = 'error';
      return;
    }
    emit('done');
  } catch (e: any) {
    // Don't leave the UI stuck on "Preparing…" — surface the failure.
    error.value = e?.message || 'Installation failed';
    phase.value = 'error';
  }
}

async function saveDisabledFeatures(profile: Profile) {
  // The universe of features is whatever the highest profile enables.
  const all = report.value?.profiles.find((p) => p.key === 'complete')?.features ?? profile.features;
  const disabledFeatures = all.filter((f) => !profile.features.includes(f));
  const settings = (await window.electronAPI.getSettings()) || {};
  await window.electronAPI.setSettings({ ...settings, disabledFeatures });
  await featureStore.loadLocalPreferences();
}
</script>
