<template>
  <NodeToolbar :is-visible="selected" :position="Position.Top" :offset="8">
    <div
      class="flex items-center gap-0.5 bg-surface-elevated border border-border rounded-lg shadow-lg px-1.5 py-1 nodrag nowheel">

      <!-- Text alignment (text) -->
      <template v-if="nodeType === 'text'">
        <button @click="emit('update', { align: 'left' })" title="Align left"
          :class="[btnClass, (data.align === 'left' || !data.align) && activeClass]">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" d="M3 6h18M3 12h12M3 18h18" />
          </svg>
        </button>
        <button @click="emit('update', { align: 'center' })" title="Align center"
          :class="[btnClass, data.align === 'center' && activeClass]">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" d="M3 6h18M6 12h12M3 18h18" />
          </svg>
        </button>
        <button @click="emit('update', { align: 'right' })" title="Align right"
          :class="[btnClass, data.align === 'right' && activeClass]">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" d="M3 6h18M9 12h12M3 18h18" />
          </svg>
        </button>
        <div class="h-4 w-px bg-border mx-0.5"></div>

        <!-- Vertical alignment -->
        <button @click="emit('update', { valign: 'top' })" title="Align top"
          :class="[btnClass, (data.valign === 'top' || !data.valign) && activeClass]">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" d="M4 4h16M4 10h16M4 16h10" />
          </svg>
        </button>
        <button @click="emit('update', { valign: 'middle' })" title="Align middle"
          :class="[btnClass, data.valign === 'middle' && activeClass]">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" d="M4 6h10M4 12h16M4 18h10" />
          </svg>
        </button>
        <button @click="emit('update', { valign: 'bottom' })" title="Align bottom"
          :class="[btnClass, data.valign === 'bottom' && activeClass]">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" d="M4 8h10M4 14h16M4 20h16" />
          </svg>
        </button>
        <div class="h-4 w-px bg-border mx-0.5"></div>

        <!-- Font size -->
        <button @click="emit('update', { fontSize: 'sm' })" title="Small text"
          :class="[btnClass, (data.fontSize === 'sm' || !data.fontSize) && activeClass]">
          <span class="text-[10px] font-bold leading-none">A</span>
        </button>
        <button @click="emit('update', { fontSize: 'base' })" title="Medium text"
          :class="[btnClass, data.fontSize === 'base' && activeClass]">
          <span class="text-xs font-bold leading-none">A</span>
        </button>
        <button @click="emit('update', { fontSize: 'lg' })" title="Large text"
          :class="[btnClass, data.fontSize === 'lg' && activeClass]">
          <span class="text-sm font-bold leading-none">A</span>
        </button>
        <div class="h-4 w-px bg-border mx-0.5"></div>
      </template>

      <!-- Color picker -->
      <template v-if="nodeType === 'text' || nodeType === 'shape' || nodeType === 'bubble' || nodeType === 'card'">
        <div class="relative">
          <button ref="colorBtnRef" @click="toggleColors" title="Color" :class="btnClass">
            <div class="w-3.5 h-3.5 rounded border border-border"
              :style="{ backgroundColor: data.color || defaultColor }"></div>
          </button>
        </div>
        <div class="h-4 w-px bg-border mx-0.5"></div>
      </template>

      <Teleport to="body">
        <div v-if="showColors" class="fixed inset-0 z-[9998]" @click="showColors = false"></div>
        <div v-if="showColors" class="fixed z-[9999] bg-surface-elevated border border-border rounded-xl shadow-xl p-2.5"
          :style="colorPickerStyle">
          <div class="grid grid-cols-4 gap-1.5">
            <button v-for="c in colors" :key="c" @click="selectColor(c)"
              class="w-7 h-7 rounded-lg border-2 cursor-pointer hover:scale-110 transition-transform"
              :class="(data.color || defaultColor) === c ? 'border-accent shadow-sm' : 'border-transparent'"
              :style="{ backgroundColor: c }" />
          </div>
        </div>
      </Teleport>

      <!-- Border controls (rectangle, circle) -->
      <template v-if="nodeType === 'shape' && (data.shape === 'rectangle' || !data.shape || data.shape === 'circle')">
        <!-- Border radius (rectangle only) -->
        <template v-if="data.shape === 'rectangle' || !data.shape">
          <button @click="cycleBorderRadius" :title="`Radius: ${data.borderRadius || 0}`" :class="btnClass">
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path v-if="!data.borderRadius || data.borderRadius === 0" d="M4 4h6M4 4v6" stroke-linecap="round" />
              <path v-else-if="data.borderRadius <= 8" d="M4 10V8a4 4 0 014-4h2" stroke-linecap="round" />
              <path v-else-if="data.borderRadius <= 20" d="M4 12V10a8 8 0 018-8h2" stroke-linecap="round" />
              <path v-else d="M4 14C4 6 6 4 14 4" stroke-linecap="round" />
            </svg>
          </button>
        </template>

        <!-- Border color -->
        <div class="relative">
          <button ref="borderColorBtnRef" @click="toggleBorderColors" title="Border color" :class="btnClass">
            <div class="w-3.5 h-3.5 rounded-sm border-2"
              :style="{ borderColor: data.borderColor || data.strokeColor || '#6366F1', backgroundColor: 'transparent' }"></div>
          </button>
        </div>

        <!-- Border style -->
        <button @click="cycleBorderStyle" :title="`Border: ${data.borderStyle || 'solid'}`" :class="btnClass">
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            :stroke-dasharray="borderStylePreview">
            <line x1="3" y1="12" x2="21" y2="12" />
          </svg>
        </button>

        <!-- Border width -->
        <button @click="cycleBorderWidth" :title="`Width: ${data.borderWidth || 1.5}`" :class="btnClass">
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            :stroke-width="borderWidthPreview">
            <line x1="3" y1="12" x2="21" y2="12" />
          </svg>
        </button>

        <div class="h-4 w-px bg-border mx-0.5"></div>
      </template>

      <!-- Border color picker (teleported) -->
      <Teleport to="body">
        <div v-if="showBorderColors" class="fixed inset-0 z-[9998]" @click="showBorderColors = false"></div>
        <div v-if="showBorderColors" class="fixed z-[9999] bg-surface-elevated border border-border rounded-xl shadow-xl p-2.5"
          :style="borderColorPickerStyle">
          <div class="grid grid-cols-5 gap-1.5">
            <button v-for="c in borderColorOptions" :key="c" @click="selectBorderColor(c)"
              class="w-7 h-7 rounded-lg border-2 cursor-pointer hover:scale-110 transition-transform"
              :class="(data.borderColor || data.strokeColor || '#6366F1') === c ? 'border-accent shadow-sm' : 'border-transparent'"
              :style="{ backgroundColor: c }" />
          </div>
        </div>
      </Teleport>

      <!-- Entity tools -->
      <template v-if="nodeType === 'entity'">
        <button @click="handleDrawRelationships" title="Draw relationships with other entities on canvas"
          :class="btnClass">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>
        <div class="h-4 w-px bg-border mx-0.5"></div>
      </template>

      <!-- Duplicate -->
      <button @click="handleDuplicate" title="Duplicate" :class="btnClass">
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>

      <!-- Delete -->
      <button @click="handleDelete" title="Delete"
        :class="btnClass" class="!text-red-500 hover:!bg-red-500/10">
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  </NodeToolbar>
</template>

<script setup lang="ts">
import { ref, inject, computed, nextTick } from 'vue';
import { NodeToolbar } from '@vue-flow/node-toolbar';
import { Position, useNode } from '@vue-flow/core';

const btnClass = 'p-1.5 rounded-md text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer flex items-center justify-center';
const activeClass = 'bg-accent-subtle !text-accent';

const props = defineProps<{
  selected: boolean;
  nodeType: string;
  data: Record<string, any>;
}>();

const emit = defineEmits<{
  update: [data: Record<string, any>];
}>();

const { node } = useNode();
const canvasDeleteNode = inject<(id: string) => void>('canvasDeleteNode');
const canvasDuplicateNode = inject<(id: string) => void>('canvasDuplicateNode');

const handleDelete = () => canvasDeleteNode?.(node.id);
const handleDuplicate = () => canvasDuplicateNode?.(node.id);
const canvasDrawRelationships = inject<(id: string) => void>('canvasDrawRelationships');
const handleDrawRelationships = () => canvasDrawRelationships?.(node.id);

const showColors = ref(false);
const colorBtnRef = ref<HTMLElement | null>(null);
const colorPickerPos = ref({ top: 0, left: 0 });

const toggleColors = () => {
  if (showColors.value) {
    showColors.value = false;
    return;
  }
  nextTick(() => {
    if (colorBtnRef.value) {
      const rect = colorBtnRef.value.getBoundingClientRect();
      colorPickerPos.value = {
        top: rect.bottom + 6,
        left: rect.left + rect.width / 2 - 80,
      };
    }
    showColors.value = true;
  });
};

const colorPickerStyle = computed(() => ({
  top: `${colorPickerPos.value.top}px`,
  left: `${colorPickerPos.value.left}px`,
}));

const shapeColors = ['#E0E7FF', '#DBEAFE', '#FEF3C7', '#DCFCE7', '#FCE7F3', '#F3E8FF', '#FEE2E2', '#E0F2FE'];
const textColors = ['#FFFFFF', '#F1F5F9', '#DBEAFE', '#FEF3C7', '#DCFCE7', '#FCE7F3', '#F3E8FF', '#FEE2E2'];
const bubbleColors = ['#BFDBFE', '#DBEAFE', '#EFF6FF', '#BBF7D0', '#FBCFE8', '#E9D5FF', '#FED7AA', '#FECACA'];
const cardColors = ['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#0EA5E9'];
const colors = props.nodeType === 'shape' ? shapeColors
  : props.nodeType === 'bubble' ? bubbleColors
  : props.nodeType === 'card' ? cardColors
  : textColors;

const defaultColor = props.nodeType === 'shape' ? '#E0E7FF'
  : props.nodeType === 'bubble' ? '#DBEAFE'
  : props.nodeType === 'card' ? '#6366F1'
  : '#FFFFFF';

// ── Border radius ──
const borderRadiusSteps = [0, 4, 8, 16, 999];
const cycleBorderRadius = () => {
  const current = props.data.borderRadius ?? 4;
  const idx = borderRadiusSteps.findIndex(r => r >= current);
  emit('update', { borderRadius: borderRadiusSteps[(idx + 1) % borderRadiusSteps.length] });
};

// ── Border controls ──
const showBorderColors = ref(false);
const borderColorBtnRef = ref<HTMLElement | null>(null);
const borderColorPos = ref({ top: 0, left: 0 });

const borderColorOptions = ['#6366F1', '#3B82F6', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#94A3B8', '#1E293B'];

const toggleBorderColors = () => {
  if (showBorderColors.value) { showBorderColors.value = false; return; }
  nextTick(() => {
    if (borderColorBtnRef.value) {
      const rect = borderColorBtnRef.value.getBoundingClientRect();
      borderColorPos.value = { top: rect.bottom + 6, left: rect.left + rect.width / 2 - 100 };
    }
    showBorderColors.value = true;
  });
};

const borderColorPickerStyle = computed(() => ({
  top: `${borderColorPos.value.top}px`,
  left: `${borderColorPos.value.left}px`,
}));

const selectBorderColor = (color: string) => {
  showBorderColors.value = false;
  emit('update', { borderColor: color });
};

const borderStyles = ['solid', 'dashed', 'dotted', 'none'] as const;
const cycleBorderStyle = () => {
  const current = props.data.borderStyle || 'solid';
  const idx = borderStyles.indexOf(current as any);
  emit('update', { borderStyle: borderStyles[(idx + 1) % borderStyles.length] });
};

const borderStylePreview = computed(() => {
  switch (props.data.borderStyle) {
    case 'dashed': return '6 4';
    case 'dotted': return '2 3';
    case 'none': return '0';
    default: return 'none';
  }
});

const borderWidths = [1, 1.5, 2.5, 4] as const;
const cycleBorderWidth = () => {
  const current = props.data.borderWidth || 1.5;
  const idx = borderWidths.findIndex(w => w >= current);
  emit('update', { borderWidth: borderWidths[(idx + 1) % borderWidths.length] });
};

const borderWidthPreview = computed(() => {
  const w = props.data.borderWidth || 1.5;
  return Math.max(w, 1);
});

const selectColor = (color: string) => {
  showColors.value = false;
  if (props.nodeType === 'card') {
    emit('update', { accent: color });
  } else {
    emit('update', { color });
  }
};

</script>
