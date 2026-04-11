<template>
  <div class="flex items-center justify-center w-full h-full" :class="{ 'drop-shadow-md': selected }">
    <NodeResizer :is-visible="selected" :min-width="60" :min-height="60" color="var(--color-accent, #6366f1)" />
    <Handle id="top" type="source" :position="Position.Top" :connectable="true" />
    <Handle id="right" type="source" :position="Position.Right" :connectable="true" />
    <Handle id="bottom" type="source" :position="Position.Bottom" :connectable="true" />
    <Handle id="left" type="source" :position="Position.Left" :connectable="true" />
    <NodeFloatingToolbar :selected="selected" node-type="shape" :data="node.data"
      @update="onToolbarUpdate" />
    <svg width="100%" height="100%" :viewBox="`0 0 ${svgSize.w} ${svgSize.h}`" class="overflow-visible" preserveAspectRatio="none">
      <rect v-if="shapeType === 'rectangle'" x="1" y="1" :width="svgSize.w - 2" :height="svgSize.h - 2"
        :rx="node.data.borderRadius === 999 ? Math.min(svgSize.w, svgSize.h) / 2 : (node.data.borderRadius ?? 4)"
        :fill="fillColor" :stroke="strokeColor" :stroke-width="strokeWidth" :stroke-dasharray="strokeDasharray" />
      <rect v-else-if="shapeType === 'rounded-rectangle'" x="1" y="1" :width="svgSize.w - 2" :height="svgSize.h - 2" :rx="Math.min(svgSize.w, svgSize.h) * 0.3"
        :fill="fillColor" :stroke="strokeColor" :stroke-width="strokeWidth" :stroke-dasharray="strokeDasharray" />
      <ellipse v-else-if="shapeType === 'circle'" :cx="svgSize.w / 2" :cy="svgSize.h / 2" :rx="svgSize.w / 2 - 1" :ry="svgSize.h / 2 - 1"
        :fill="fillColor" :stroke="strokeColor" :stroke-width="strokeWidth" :stroke-dasharray="strokeDasharray" />
      <polygon v-else-if="shapeType === 'diamond'"
        :points="`${svgSize.w/2},1 ${svgSize.w-1},${svgSize.h/2} ${svgSize.w/2},${svgSize.h-1} 1,${svgSize.h/2}`"
        :fill="fillColor" :stroke="strokeColor" :stroke-width="strokeWidth" :stroke-dasharray="strokeDasharray" />
      <polygon v-else-if="shapeType === 'triangle'"
        :points="`${svgSize.w/2},1 ${svgSize.w-1},${svgSize.h-1} 1,${svgSize.h-1}`"
        :fill="fillColor" :stroke="strokeColor" :stroke-width="strokeWidth" :stroke-dasharray="strokeDasharray" />
      <polygon v-else-if="shapeType === 'parallelogram'"
        :points="`${svgSize.w*0.2},1 ${svgSize.w-1},1 ${svgSize.w*0.8},${svgSize.h-1} 1,${svgSize.h-1}`"
        :fill="fillColor" :stroke="strokeColor" :stroke-width="strokeWidth" :stroke-dasharray="strokeDasharray" />
      <g v-else-if="shapeType === 'cylinder'">
        <path :d="`M1,${eRy} v${svgSize.h - eRy*2} a${svgSize.w/2-1},${eRy} 0 0,0 ${svgSize.w-2},0 v-${svgSize.h - eRy*2}`"
          :fill="fillColor" :stroke="strokeColor" :stroke-width="strokeWidth" :stroke-dasharray="strokeDasharray" />
        <ellipse :cx="svgSize.w/2" :cy="eRy" :rx="svgSize.w/2-1" :ry="eRy"
          :fill="fillColor" :stroke="strokeColor" :stroke-width="strokeWidth" :stroke-dasharray="strokeDasharray" />
      </g>
      <polygon v-else-if="shapeType === 'hexagon'"
        :points="`${svgSize.w*0.25},1 ${svgSize.w*0.75},1 ${svgSize.w-1},${svgSize.h/2} ${svgSize.w*0.75},${svgSize.h-1} ${svgSize.w*0.25},${svgSize.h-1} 1,${svgSize.h/2}`"
        :fill="fillColor" :stroke="strokeColor" :stroke-width="strokeWidth" :stroke-dasharray="strokeDasharray" />
      <polygon v-else-if="shapeType === 'star'"
        :points="starPoints"
        :fill="fillColor" :stroke="strokeColor" :stroke-width="strokeWidth" :stroke-dasharray="strokeDasharray" />
      <polygon v-else-if="shapeType === 'arrow-right'"
        :points="`1,${svgSize.h*0.25} ${svgSize.w*0.6},${svgSize.h*0.25} ${svgSize.w*0.6},1 ${svgSize.w-1},${svgSize.h/2} ${svgSize.w*0.6},${svgSize.h-1} ${svgSize.w*0.6},${svgSize.h*0.75} 1,${svgSize.h*0.75}`"
        :fill="fillColor" :stroke="strokeColor" :stroke-width="strokeWidth" :stroke-dasharray="strokeDasharray" />
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

const svgSize = computed(() => {
  const style = node.style || {};
  const w = typeof style.width === 'string' ? parseInt(style.width) : (style.width || 60);
  const h = typeof style.height === 'string' ? parseInt(style.height) : (style.height || 60);
  return { w, h };
});

const eRy = computed(() => Math.min(svgSize.value.h * 0.18, 14));

const fillColor = computed(() => node.data.color || '#E0E7FF');

const defaultStrokeColors: Record<string, string> = {
  rectangle: '#6366F1', 'rounded-rectangle': '#6366F1', circle: '#3B82F6',
  diamond: '#F59E0B', triangle: '#EF4444', parallelogram: '#8B5CF6',
  cylinder: '#0EA5E9', hexagon: '#10B981', star: '#F59E0B', 'arrow-right': '#6366F1',
};
const strokeColor = computed(() => node.data.borderColor || defaultStrokeColors[shapeType.value] || '#6366F1');
const strokeWidth = computed(() => node.data.borderStyle === 'none' ? 0 : (node.data.borderWidth || 1.5));
const strokeDasharray = computed(() => {
  switch (node.data.borderStyle) {
    case 'dashed': return '6 4';
    case 'dotted': return '2 3';
    default: return 'none';
  }
});

const starPoints = computed(() => {
  const cx = svgSize.value.w / 2, cy = svgSize.value.h / 2;
  const outer = Math.min(cx, cy) - 1, inner = outer * 0.4;
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / 2) * -1 + (Math.PI / 5) * i;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
});

const onToolbarUpdate = (updates: Record<string, any>) => {
  node.data = { ...node.data, ...updates };
};
</script>
