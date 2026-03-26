<template>
  <div class="rounded-xl shadow-sm h-full flex flex-col bg-surface-elevated border border-border overflow-hidden"
    :class="{ 'ring-2 ring-accent': selected }">
    <NodeResizer :is-visible="selected" :min-width="180" :min-height="120" color="var(--color-accent, #6366f1)" />
    <Handle id="top" type="source" :position="Position.Top" :connectable="true" />
    <Handle id="right" type="source" :position="Position.Right" :connectable="true" />
    <Handle id="bottom" type="source" :position="Position.Bottom" :connectable="true" />
    <Handle id="left" type="source" :position="Position.Left" :connectable="true" />
    <NodeFloatingToolbar :selected="selected" node-type="wordCloud" :data="node.data"
      @update="onToolbarUpdate" />

    <div v-if="node.data.title" class="text-xs font-semibold text-text-secondary uppercase tracking-wider px-3 pt-3 shrink-0">
      {{ node.data.title }}
    </div>

    <div ref="containerRef" class="flex-1 flex flex-wrap items-center justify-center gap-1 p-3 overflow-hidden content-center">
      <span v-for="(word, idx) in displayWords" :key="idx"
        class="inline-block leading-none transition-transform hover:scale-110 cursor-default"
        :style="{
          fontSize: `${word.size}px`,
          color: word.color,
          fontWeight: word.weight > 0.7 ? '700' : word.weight > 0.4 ? '500' : '400',
          opacity: 0.7 + word.weight * 0.3,
        }">
        {{ word.text }}
      </span>
      <div v-if="!displayWords.length" class="text-xs text-text-muted">
        No words
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Handle, Position, useNode } from '@vue-flow/core';
import { NodeResizer } from '@vue-flow/node-resizer';
import '@vue-flow/node-resizer/dist/style.css';
import NodeFloatingToolbar from '../NodeFloatingToolbar.vue';

defineProps<{ id: string; data: Record<string, any>; selected: boolean }>();
const { node } = useNode();
const containerRef = ref<HTMLElement | null>(null);

const colorSchemes: Record<string, string[]> = {
  default: ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'],
  warm: ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#dc2626', '#ea580c', '#d97706', '#ca8a04'],
  cool: ['#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#4f46e5', '#2563eb', '#0891b2', '#0d9488'],
  mono: ['#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#374151', '#4b5563', '#6b7280'],
};

const displayWords = computed(() => {
  const words = node.data.words || [];
  if (!words.length) return [];

  const maxWeight = Math.max(...words.map((w: any) => w.weight || 1));
  const minSize = 10;
  const maxSize = 28;
  const colors = colorSchemes[node.data.colorScheme || 'default'] || colorSchemes.default;

  return words.map((w: any, i: number) => {
    const normalizedWeight = maxWeight > 0 ? (w.weight || 1) / maxWeight : 0.5;
    return {
      text: w.text,
      weight: normalizedWeight,
      size: minSize + normalizedWeight * (maxSize - minSize),
      color: colors[i % colors.length],
    };
  });
});

const onToolbarUpdate = (updates: Record<string, any>) => {
  node.data = { ...node.data, ...updates };
};
</script>
