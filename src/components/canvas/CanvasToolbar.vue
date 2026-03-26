<template>
  <div class="mb-2.5 flex flex-wrap items-center gap-1 bg-surface-elevated p-2 rounded-lg">
    <Button @click="selectTool('text')" title="Add Text" size="small" borderless
      :active="pendingTool === 'text'">
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
      </svg>
    </Button>

    <Button @click="selectTool('sticky')" title="Add Sticky Note" size="small" borderless
      :active="pendingTool === 'sticky'">
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    </Button>

    <div class="h-6 w-px bg-border mx-0.5"></div>

    <!-- Shapes dropdown -->
    <div class="relative">
      <Button @click="showShapes = !showShapes" title="Add Shape" size="small" borderless
        :active="pendingTool?.startsWith('shape')">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      </Button>
      <div v-if="showShapes"
        class="absolute top-9 left-0 z-30 bg-surface-elevated border border-border rounded-lg shadow-lg p-2 flex gap-1">
        <button @click="selectShapeTool('rectangle')"
          class="p-1.5 rounded hover:bg-surface-hover transition-colors cursor-pointer" title="Rectangle">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="5" width="18" height="14" rx="2" />
          </svg>
        </button>
        <button @click="selectShapeTool('circle')"
          class="p-1.5 rounded hover:bg-surface-hover transition-colors cursor-pointer" title="Circle">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="9" />
          </svg>
        </button>
        <button @click="selectShapeTool('diamond')"
          class="p-1.5 rounded hover:bg-surface-hover transition-colors cursor-pointer" title="Diamond">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polygon points="12,2 22,12 12,22 2,12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Infographic dropdown -->
    <div class="relative">
      <Button @click="showInfographic = !showInfographic" title="Add Infographic" size="small" borderless
        :active="pendingTool?.startsWith('infographic-')">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M3 13h2v8H3zM8 8h2v13H8zM13 11h2v10h-2zM18 4h2v17h-2z" />
        </svg>
      </Button>
      <div v-if="showInfographic"
        class="absolute top-9 left-0 z-30 bg-surface-elevated border border-border rounded-lg shadow-lg p-1.5 w-44">
        <button v-for="item in infographicItems" :key="item.type" @click="selectInfographicTool(item.type)"
          class="flex items-center gap-2 w-full px-2.5 py-2 rounded-md hover:bg-surface-hover transition-colors cursor-pointer text-left">
          <span class="text-sm">{{ item.icon }}</span>
          <span class="text-xs text-text-primary">{{ item.label }}</span>
        </button>
      </div>
    </div>

    <div class="h-6 w-px bg-border mx-0.5"></div>

    <Button @click="$emit('pick-image')" title="Add Image" size="small" borderless>
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </Button>

    <div class="h-6 w-px bg-border mx-0.5"></div>

    <Button @click="$emit('pick-doc')" title="Add Document Reference" size="small" borderless>
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </Button>

    <Button @click="$emit('pick-resource')" title="Add Resource Reference" size="small" borderless>
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    </Button>

    <div class="h-6 w-px bg-border mx-0.5"></div>

    <Button @click="$emit('toggle-ai-panel')" title="AI Image Generation" size="small" borderless
      :active="aiPanelOpen">
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
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
import { ref, watch } from 'vue';
import Button from '../ui/Button.vue';

const props = defineProps<{
  isSaving: boolean;
  savedSuccessfully: boolean;
  pendingTool: string | null;
  aiPanelOpen?: boolean;
}>();

const emit = defineEmits<{
  'select-tool': [tool: string, data: Record<string, any>];
  'clear-tool': [];
  'pick-doc': [];
  'pick-resource': [];
  'pick-image': [];
  'pick-infographic': [type: string];
  'export': [];
  'toggle-ai-panel': [];
}>();

const showShapes = ref(false);
const showInfographic = ref(false);

const infographicItems = [
  { type: 'statCard', label: 'Stat Card', icon: '#' },
  { type: 'chart', label: 'Chart', icon: '📊' },
  { type: 'list', label: 'List / Ranking', icon: '📋' },
  { type: 'wordCloud', label: 'Word Cloud', icon: '☁' },
  { type: 'timeline', label: 'Timeline', icon: '⏱' },
  { type: 'entityGraph', label: 'Entity Graph', icon: '🔗' },
  { type: 'quoteCard', label: 'Quote Card', icon: '💬' },
];

const toolData: Record<string, Record<string, any>> = {
  text: { text: '' },
  sticky: { text: '', color: '#FEF08A' },
  'shape-rectangle': { shape: 'rectangle', label: '' },
  'shape-circle': { shape: 'circle', label: '' },
  'shape-diamond': { shape: 'diamond', label: '' },
};

const selectTool = (tool: string) => {
  if (props.pendingTool === tool) {
    emit('clear-tool');
  } else {
    emit('select-tool', tool, toolData[tool] || {});
  }
};

const selectShapeTool = (shape: string) => {
  showShapes.value = false;
  const tool = `shape-${shape}`;
  emit('select-tool', tool, toolData[tool] || { shape, label: '' });
};

const selectInfographicTool = (type: string) => {
  showInfographic.value = false;
  emit('pick-infographic', type);
};
</script>
