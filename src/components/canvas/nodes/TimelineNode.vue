<template>
  <div class="rounded-xl shadow-sm h-full flex flex-col bg-surface-elevated border border-border p-3 overflow-hidden"
    :class="{ 'ring-2 ring-accent': selected }">
    <NodeResizer :is-visible="selected" :min-width="200" :min-height="120" color="var(--color-accent, #6366f1)" />
    <Handle id="top" type="source" :position="Position.Top" :connectable="true" />
    <Handle id="right" type="source" :position="Position.Right" :connectable="true" />
    <Handle id="bottom" type="source" :position="Position.Bottom" :connectable="true" />
    <Handle id="left" type="source" :position="Position.Left" :connectable="true" />
    <NodeFloatingToolbar :selected="selected" node-type="timeline" :data="node.data"
      @update="onToolbarUpdate" />

    <div v-if="node.data.title" class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 shrink-0">
      {{ node.data.title }}
    </div>

    <div class="flex-1 overflow-y-auto">
      <div v-if="sortedEvents.length" class="relative pl-4">
        <!-- Vertical line -->
        <div class="absolute left-[7px] top-1 bottom-1 w-px bg-border"></div>

        <div v-for="(ev, idx) in sortedEvents" :key="idx" class="relative flex items-start gap-2.5 mb-3 last:mb-0">
          <!-- Dot -->
          <div class="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full border-2 border-white shrink-0"
            :style="{ backgroundColor: ev.color || '#6366f1' }" />

          <div class="min-w-0">
            <div class="text-[10px] text-text-muted font-mono">
              {{ formatDate(ev.date) }}
              <span v-if="ev.endDate"> — {{ formatDate(ev.endDate) }}</span>
            </div>
            <div class="text-xs text-text-primary leading-snug">{{ ev.label }}</div>
          </div>
        </div>
      </div>
      <div v-else class="flex items-center justify-center h-full text-xs text-text-muted">
        No events
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

const sortedEvents = computed(() => {
  const events = node.data.events || [];
  return [...events].sort((a: any, b: any) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return da - db;
  });
});

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const onToolbarUpdate = (updates: Record<string, any>) => {
  node.data = { ...node.data, ...updates };
};
</script>
