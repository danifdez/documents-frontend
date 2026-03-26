<template>
  <div class="rounded-xl shadow-sm h-full flex flex-col items-center justify-center p-4 border border-border"
    :class="{ 'ring-2 ring-accent': selected }"
    :style="{ backgroundColor: node.data.color || '#F0F9FF' }">
    <NodeResizer :is-visible="selected" :min-width="120" :min-height="80" color="var(--color-accent, #6366f1)" />
    <Handle id="top" type="source" :position="Position.Top" :connectable="true" />
    <Handle id="right" type="source" :position="Position.Right" :connectable="true" />
    <Handle id="bottom" type="source" :position="Position.Bottom" :connectable="true" />
    <Handle id="left" type="source" :position="Position.Left" :connectable="true" />
    <NodeFloatingToolbar :selected="selected" node-type="statCard" :data="node.data"
      @update="onToolbarUpdate" />

    <div v-if="node.data.icon" class="text-2xl mb-1">{{ node.data.icon }}</div>
    <div class="font-bold text-text-primary leading-none"
      :class="valueFontClass">
      {{ node.data.prefix || '' }}{{ displayValue }}{{ node.data.suffix || '' }}
    </div>
    <div v-if="node.data.label" class="text-xs text-text-secondary mt-1.5 text-center font-medium uppercase tracking-wider">
      {{ node.data.label }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Handle, Position, useNode } from '@vue-flow/core';
import { NodeResizer } from '@vue-flow/node-resizer';
import '@vue-flow/node-resizer/dist/style.css';
import NodeFloatingToolbar from '../NodeFloatingToolbar.vue';

defineProps<{ id: string; data: Record<string, any>; selected: boolean }>();
const { node } = useNode();

const displayValue = computed(() => {
  const v = node.data.value;
  if (v === undefined || v === null) return '—';
  if (typeof v === 'number') return v.toLocaleString();
  return v;
});

const valueFontClass = computed(() => {
  switch (node.data.fontSize) {
    case 'lg': return 'text-4xl';
    case 'base': return 'text-2xl';
    default: return 'text-3xl';
  }
});

const onToolbarUpdate = (updates: Record<string, any>) => {
  node.data = { ...node.data, ...updates };
};
</script>
