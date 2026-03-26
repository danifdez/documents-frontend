<template>
  <div class="rounded-xl shadow-sm h-full flex flex-col bg-surface-elevated border border-border p-3 overflow-hidden"
    :class="{ 'ring-2 ring-accent': selected }">
    <NodeResizer :is-visible="selected" :min-width="160" :min-height="100" color="var(--color-accent, #6366f1)" />
    <Handle id="top" type="source" :position="Position.Top" :connectable="true" />
    <Handle id="right" type="source" :position="Position.Right" :connectable="true" />
    <Handle id="bottom" type="source" :position="Position.Bottom" :connectable="true" />
    <Handle id="left" type="source" :position="Position.Left" :connectable="true" />
    <NodeFloatingToolbar :selected="selected" node-type="list" :data="node.data"
      @update="onToolbarUpdate" />

    <div v-if="node.data.title" class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 shrink-0">
      {{ node.data.title }}
    </div>

    <div class="flex-1 overflow-y-auto space-y-1.5">
      <div v-for="(item, idx) in displayItems" :key="idx" class="flex items-center gap-2">
        <span class="text-[10px] text-text-muted w-4 text-right shrink-0">{{ idx + 1 }}</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs text-text-primary truncate">{{ item.label }}</span>
            <span v-if="item.value !== undefined" class="text-[10px] text-text-muted shrink-0 font-mono">
              {{ item.value }}
            </span>
          </div>
          <div v-if="node.data.showBars && maxValue > 0" class="mt-0.5 h-1 rounded-full bg-surface-hover overflow-hidden">
            <div class="h-full rounded-full transition-all"
              :style="{
                width: `${(item.value / maxValue) * 100}%`,
                backgroundColor: item.color || node.data.barColor || '#6366f1',
              }" />
          </div>
        </div>
      </div>
      <div v-if="!displayItems.length" class="text-xs text-text-muted text-center py-4">
        No items
      </div>
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

const displayItems = computed(() => {
  const items = node.data.items || [];
  const max = node.data.maxItems || 10;
  return items.slice(0, max);
});

const maxValue = computed(() => {
  return Math.max(0, ...displayItems.value.map((i: any) => Number(i.value) || 0));
});

const onToolbarUpdate = (updates: Record<string, any>) => {
  node.data = { ...node.data, ...updates };
};
</script>
