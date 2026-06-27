<template>
  <div class="mb-2.5 flex flex-wrap items-center gap-1 bg-surface-elevated p-2 rounded-lg">

    <!-- Text -->
    <Button @click="selectTool('text')" title="Text" size="small" borderless
      :active="pendingTool === 'text'">
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
      </svg>
    </Button>

    <!-- ── Flowchart ── -->
    <div class="h-6 w-px bg-border mx-0.5"></div>
    <button v-for="s in flowShapes" :key="s.shape" @click="selectShapeTool(s.shape)" :title="s.title"
      :class="[sBtnClass, pendingTool === `shape-${s.shape}` && sBtnActive]" v-html="s.icon">
    </button>

    <!-- ── Infographic ── -->
    <div class="h-6 w-px bg-border mx-0.5"></div>
    <button v-for="item in infographicItems" :key="item.type" @click="selectInfographicTool(item.type)"
      :title="item.label"
      :class="[sBtnClass, pendingTool === item.type && sBtnActive]">
      <span class="text-sm leading-none">{{ item.icon }}</span>
    </button>

    <!-- ── Media & Refs ── -->
    <div class="h-6 w-px bg-border mx-0.5"></div>

    <Button @click="$emit('pick-image')" title="Image" size="small" borderless>
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </Button>

    <Button @click="$emit('pick-doc')" title="Document Reference" size="small" borderless>
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </Button>

    <Button @click="$emit('pick-resource')" title="Resource Reference" size="small" borderless>
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    </Button>

    <div class="flex-1"></div>

    <!-- Export -->
    <Button @click="$emit('export')" title="Export as image" size="small" borderless>
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    </Button>

    <div class="h-6 w-px bg-border mx-0.5"></div>

    <!-- Save status -->
    <div class="flex items-center gap-1.5 text-xs">
      <template v-if="isSaving">
        <svg class="animate-spin h-3 w-3 text-text-muted" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <span class="text-text-muted">Saving...</span>
      </template>
      <template v-else-if="savedSuccessfully">
        <svg class="h-3 w-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span class="text-green-600">Saved</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Button from '../ui/Button.vue';
import { useFeatureStore } from '../../store/featureStore';

const featureStore = useFeatureStore();

const props = defineProps<{
  isSaving: boolean;
  savedSuccessfully: boolean;
  pendingTool: string | null;
}>();

const emit = defineEmits<{
  'select-tool': [tool: string, data: Record<string, any>];
  'clear-tool': [];
  'pick-doc': [];
  'pick-resource': [];
  'pick-image': [];
  'pick-infographic': [type: string];
  'export': [];
}>();

const sBtnClass = 'p-1 rounded hover:bg-surface-hover transition-colors cursor-pointer text-text-secondary';
const sBtnActive = 'bg-accent-subtle !text-accent';

// ── Flowchart shapes ──
const flowShapes = [
  { shape: 'rectangle', title: 'Process', icon: '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/></svg>' },
  { shape: 'circle', title: 'Circle', icon: '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/></svg>' },
  { shape: 'parallelogram', title: 'Input / Output', icon: '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="6,5 22,5 18,19 2,19"/></svg>' },
  { shape: 'cylinder', title: 'Database', icon: '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/></svg>' },
  { shape: 'hexagon', title: 'Preparation', icon: '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12,2 21,7 21,17 12,22 3,17 3,7"/></svg>' },
  { shape: 'triangle', title: 'Manual Op', icon: '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12,3 22,21 2,21"/></svg>' },
  { shape: 'arrow-right', title: 'Off-page Ref', icon: '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="2,7 15,7 15,3 22,12 15,21 15,17 2,17"/></svg>' },
  { shape: 'star', title: 'Star', icon: '<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9"/></svg>' },
];

const toolData: Record<string, Record<string, any>> = {
  text: { text: '' },
};

const selectTool = (tool: string) => {
  if (props.pendingTool === tool) {
    emit('clear-tool');
  } else {
    emit('select-tool', tool, toolData[tool] || {});
  }
};

const selectShapeTool = (shape: string) => {
  const tool = `shape-${shape}`;
  if (props.pendingTool === tool) {
    emit('clear-tool');
  } else {
    emit('select-tool', tool, { shape, label: '' });
  }
};

const infographicItems = computed(() => [
  { type: 'chart', label: 'Chart', icon: '📊', feature: 'datasets' },
  { type: 'timeline', label: 'Timeline', icon: '⏱', feature: 'timelines' },
  { type: 'entityGraph', label: 'Entity Graph', icon: '🔗', feature: 'relationships' },
].filter(item => featureStore.isEnabled(item.feature)));

const selectInfographicTool = (type: string) => {
  emit('pick-infographic', type);
};
</script>
