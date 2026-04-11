<template>
  <div class="relative rounded-xl shadow-sm h-full flex flex-col items-center justify-center border-2 px-4 py-3 min-w-[80px]"
    :class="{ 'ring-2 ring-accent ring-offset-2': selected }"
    :style="{ backgroundColor: bgColor, borderColor: accentColor }">
    <NodeResizer :is-visible="selected" :min-width="80" :min-height="50" color="var(--color-accent, #6366f1)" />
    <Handle id="top" type="source" :position="Position.Top" :connectable="true" />
    <Handle id="right" type="source" :position="Position.Right" :connectable="true" />
    <Handle id="bottom" type="source" :position="Position.Bottom" :connectable="true" />
    <Handle id="left" type="source" :position="Position.Left" :connectable="true" />
    <NodeFloatingToolbar :selected="selected" node-type="entity" :data="node.data"
      @update="onToolbarUpdate" />

    <!-- Loading spinner for relationship search -->
    <div v-if="node.data._relLoading" class="absolute inset-0 flex items-center justify-center rounded-xl z-10"
      :style="{ backgroundColor: bgColor + 'cc' }">
      <div class="flex flex-col items-center gap-1">
        <div class="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent"
          :style="{ borderColor: accentColor, borderTopColor: 'transparent' }"></div>
        <span class="text-[8px] text-text-muted">Searching...</span>
      </div>
    </div>

    <div class="text-[9px] font-medium uppercase tracking-wider mb-0.5"
      :style="{ color: accentColor }">
      {{ node.data.entityType || '' }}
    </div>
    <div class="text-sm font-semibold text-text-primary text-center leading-tight">
      {{ node.data.entityName || 'Entity' }}
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

const typeColors: Record<string, { bg: string; accent: string }> = {
  PERSON: { bg: '#EEF2FF', accent: '#6366f1' },
  PER: { bg: '#EEF2FF', accent: '#6366f1' },
  ORG: { bg: '#EFF6FF', accent: '#3b82f6' },
  ORGANIZATION: { bg: '#EFF6FF', accent: '#3b82f6' },
  GPE: { bg: '#ECFDF5', accent: '#10b981' },
  LOCATION: { bg: '#ECFDF5', accent: '#10b981' },
  LOC: { bg: '#ECFDF5', accent: '#10b981' },
  EVENT: { bg: '#FFFBEB', accent: '#f59e0b' },
  WORK: { bg: '#FDF2F8', accent: '#ec4899' },
  DATE: { bg: '#F0FDFA', accent: '#14b8a6' },
};

const colors = computed(() => {
  const t = (node.data.entityType || '').toUpperCase();
  return typeColors[t] || { bg: '#F8FAFC', accent: '#94a3b8' };
});

const bgColor = computed(() => colors.value.bg);
const accentColor = computed(() => colors.value.accent);

const onToolbarUpdate = (updates: Record<string, any>) => {
  node.data = { ...node.data, ...updates };
};
</script>
