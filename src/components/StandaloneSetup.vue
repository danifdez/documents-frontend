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

    <!-- Confirm the base install -->
    <template v-else-if="phase === 'confirm'">
      <p class="text-sm text-text-secondary text-center">Documents runs entirely on your machine, including the AI assistant. You can enable extra features later in Settings.</p>
      <p class="text-xs text-text-muted">{{ hardwareSummary }}</p>

      <div class="w-full p-4 rounded-2xl border border-border bg-surface-elevated text-left">
        <div class="flex items-center justify-between mb-1">
          <span class="font-medium text-text-primary">Install Documents</span>
          <span v-if="plan?.status === 'slow'"
            class="text-[10px] uppercase tracking-wide text-amber-600 border border-amber-600 rounded-full px-2 py-0.5">Runs slowly</span>
        </div>
        <div class="text-xs text-text-muted">Includes {{ componentSummary }}.</div>
        <div v-if="plan?.reason" class="text-xs text-amber-600 dark:text-amber-500 mt-1">{{ plan.reason }}</div>
        <div class="text-[11px] text-text-muted mt-2">Download ≈ {{ plan?.downloadGB }} GB</div>
      </div>

      <div class="flex items-center gap-3">
        <button @click="$emit('back')" class="text-xs text-text-muted hover:text-text-secondary cursor-pointer">Back</button>
        <button @click="startInstall"
          class="px-5 py-2 rounded-2xl bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer">
          Install
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
      <button @click="phase = 'confirm'" class="text-xs text-text-muted hover:text-text-secondary cursor-pointer">Back</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useWorkspaceStore } from '../store/workspaceStore';

interface InstallPlan {
  status: 'yes' | 'slow' | 'no';
  reason: string;
  downloadGB: number;
  components: string[];
  bundle: string;
}
interface Report {
  hardware: { cpuModel: string; cpuCores: number; ramGB: number; freeDiskGB: number | null; gpu: { name: string | null; vramGB: number } };
  canInstall: boolean;
  blockReason: string;
  install: InstallPlan;
}

const emit = defineEmits<{ (e: 'done'): void; (e: 'use-server'): void; (e: 'back'): void }>();

const workspaceStore = useWorkspaceStore();

const phase = ref<'checking' | 'blocked' | 'confirm' | 'installing' | 'error'>('checking');
const report = ref<Report | null>(null);
const progressPercent = ref(0);
const progressComponent = ref('');
const progressStep = ref(0);
const progressTotalSteps = ref(0);
const error = ref('');

// Friendlier names for the components reported by the installer.
const COMPONENT_LABELS: Record<string, string> = {
  postgres: 'database',
  backend: 'server',
  neo4j: 'knowledge graph',
  'models-cpu': 'AI engine',
  'models-gpu': 'AI engine',
  'ai-models': 'AI models',
};

const plan = computed(() => report.value?.install ?? null);

const componentSummary = computed(() =>
  (plan.value?.components ?? []).map((c) => COMPONENT_LABELS[c] || c).join(', '),
);

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
    phase.value = report.value.canInstall ? 'confirm' : 'blocked';
  } catch (e: any) {
    error.value = e.message || 'Hardware check failed';
    phase.value = 'error';
  }
});

async function startInstall() {
  if (!plan.value) return;
  phase.value = 'installing';
  progressPercent.value = 0;

  try {
    // Pass plain arrays — Vue's reactive proxies aren't structured-cloneable and
    // the IPC call throws "An object could not be cloned" otherwise.
    const result = await window.electronAPI.standaloneInstallProfile({
      key: 'base',
      components: [...plan.value.components],
      features: [],
    });
    if (!result.success) {
      error.value = result.error || 'Installation failed';
      phase.value = 'error';
      return;
    }

    // Start services + register the local workspace (reads the persisted install).
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
</script>
