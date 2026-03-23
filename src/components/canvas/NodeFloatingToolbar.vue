<template>
  <NodeToolbar :is-visible="selected" :position="Position.Top" :offset="8">
    <div
      class="flex items-center gap-0.5 bg-surface-elevated border border-border rounded-lg shadow-lg px-1.5 py-1 nodrag nowheel">

      <!-- Text alignment (text, sticky) -->
      <template v-if="nodeType === 'text' || nodeType === 'sticky'">
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

      <!-- Color picker (text, sticky, shape) -->
      <template v-if="nodeType === 'text' || nodeType === 'sticky' || nodeType === 'shape'">
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

      <!-- Shape type (shape only) -->
      <template v-if="nodeType === 'shape'">
        <button @click="emit('update', { shape: 'rectangle' })" title="Rectangle"
          :class="[btnClass, (data.shape === 'rectangle' || !data.shape) && activeClass]">
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="5" width="18" height="14" rx="2" />
          </svg>
        </button>
        <button @click="emit('update', { shape: 'circle' })" title="Circle"
          :class="[btnClass, data.shape === 'circle' && activeClass]">
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9" />
          </svg>
        </button>
        <button @click="emit('update', { shape: 'diamond' })" title="Diamond"
          :class="[btnClass, data.shape === 'diamond' && activeClass]">
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12,2 22,12 12,22 2,12" />
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

const stickyColors = ['#FEF08A', '#BBF7D0', '#BFDBFE', '#FBCFE8', '#FED7AA', '#E9D5FF', '#FECACA', '#D1FAE5'];
const shapeColors = ['#E0E7FF', '#DBEAFE', '#FEF3C7', '#DCFCE7', '#FCE7F3', '#F3E8FF', '#FEE2E2', '#E0F2FE'];
const textColors = ['#FFFFFF', '#F1F5F9', '#DBEAFE', '#FEF3C7', '#DCFCE7', '#FCE7F3', '#F3E8FF', '#FEE2E2'];

const colors = props.nodeType === 'sticky' ? stickyColors
  : props.nodeType === 'shape' ? shapeColors
  : textColors;

const defaultColor = props.nodeType === 'sticky' ? '#FEF08A'
  : props.nodeType === 'shape' ? '#E0E7FF'
  : '#FFFFFF';

const selectColor = (color: string) => {
  showColors.value = false;
  emit('update', { color });
};
</script>
