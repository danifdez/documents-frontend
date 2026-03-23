<template>
  <div class="flex items-center justify-center w-full h-full" :class="{ 'drop-shadow-md': selected }">
    <NodeResizer :is-visible="selected" :min-width="60" :min-height="60" color="var(--color-accent, #6366f1)" />
    <Handle id="top" type="source" :position="Position.Top" :connectable="true" />
    <Handle id="right" type="source" :position="Position.Right" :connectable="true" />
    <Handle id="bottom" type="source" :position="Position.Bottom" :connectable="true" />
    <Handle id="left" type="source" :position="Position.Left" :connectable="true" />
    <NodeFloatingToolbar :selected="selected" node-type="shape" :data="node.data"
      @update="onToolbarUpdate" />
    <svg width="100%" height="100%" class="overflow-visible" preserveAspectRatio="none">
      <rect v-if="shapeType === 'rectangle'" x="1" y="1" width="100%" height="100%" rx="4"
        :fill="node.data.color || '#E0E7FF'" stroke="#6366F1" stroke-width="1.5" />
      <ellipse v-else-if="shapeType === 'circle'" cx="50%" cy="50%" rx="49%" ry="49%"
        :fill="node.data.color || '#DBEAFE'" stroke="#3B82F6" stroke-width="1.5" />
      <polygon v-else-if="shapeType === 'diamond'"
        points="50,1 99,50 50,99 1,50"
        :fill="node.data.color || '#FEF3C7'" stroke="#F59E0B" stroke-width="1.5" />
    </svg>
    <div v-if="node.data.label" class="absolute text-xs text-text-primary text-center px-2 pointer-events-none">
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

defineProps<{
  id: string;
  data: Record<string, any>;
  selected: boolean;
}>();

const { node } = useNode();

const shapeType = computed(() => node.data.shape || 'rectangle');

const onToolbarUpdate = (updates: Record<string, any>) => {
  node.data = { ...node.data, ...updates };
};
</script>
