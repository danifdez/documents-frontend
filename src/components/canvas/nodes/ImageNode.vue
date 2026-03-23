<template>
  <div class="bg-surface-elevated border border-border rounded-lg shadow-sm overflow-hidden h-full"
    :class="{ 'ring-2 ring-accent': selected }">
    <NodeResizer :is-visible="selected" :min-width="80" :min-height="60" color="var(--color-accent, #6366f1)" />
    <Handle id="top" type="source" :position="Position.Top" :connectable="true" />
    <Handle id="right" type="source" :position="Position.Right" :connectable="true" />
    <Handle id="bottom" type="source" :position="Position.Bottom" :connectable="true" />
    <Handle id="left" type="source" :position="Position.Left" :connectable="true" />
    <NodeFloatingToolbar :selected="selected" node-type="image" :data="node.data"
      @update="onToolbarUpdate" />
    <img v-if="data.src" :src="data.src" :alt="data.alt || 'Image'"
      class="block w-full h-full object-contain" />
    <div v-else class="flex items-center justify-center w-full h-full min-w-[160px] min-h-[100px] text-text-muted text-xs">
      No image set
    </div>
    <div v-if="data.caption" class="px-2 py-1 text-xs text-text-muted text-center border-t border-border-light">
      {{ data.caption }}
    </div>
  </div>
</template>

<script setup lang="ts">
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

const onToolbarUpdate = (updates: Record<string, any>) => {
  node.data = { ...node.data, ...updates };
};
</script>
