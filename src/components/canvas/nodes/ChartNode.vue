<template>
  <div class="rounded-xl shadow-sm h-full flex flex-col bg-surface-elevated border border-border p-3 overflow-hidden"
    :class="{ 'ring-2 ring-accent': selected }">
    <NodeResizer :is-visible="selected" :min-width="200" :min-height="160" color="var(--color-accent, #6366f1)" />
    <Handle id="top" type="source" :position="Position.Top" :connectable="true" />
    <Handle id="right" type="source" :position="Position.Right" :connectable="true" />
    <Handle id="bottom" type="source" :position="Position.Bottom" :connectable="true" />
    <Handle id="left" type="source" :position="Position.Left" :connectable="true" />
    <NodeFloatingToolbar :selected="selected" node-type="chart" :data="node.data"
      @update="onToolbarUpdate" />

    <div v-if="node.data.title" class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 shrink-0">
      {{ node.data.title }}
    </div>

    <div class="flex-1 min-h-0 relative">
      <component v-if="chartComponent && hasData" :is="chartComponent" :data="chartData" :options="chartOptions" />
      <div v-else class="flex items-center justify-center h-full text-xs text-text-muted">
        No chart data
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, onMounted } from 'vue';
import { Handle, Position, useNode } from '@vue-flow/core';
import { NodeResizer } from '@vue-flow/node-resizer';
import '@vue-flow/node-resizer/dist/style.css';
import NodeFloatingToolbar from '../NodeFloatingToolbar.vue';

defineProps<{ id: string; data: Record<string, any>; selected: boolean }>();
const { node } = useNode();

const chartComponent = shallowRef<any>(null);

onMounted(async () => {
  const chartjs = await import('chart.js');
  chartjs.Chart.register(...chartjs.registerables);
  const vueChartjs = await import('vue-chartjs');

  const typeMap: Record<string, any> = {
    bar: vueChartjs.Bar,
    line: vueChartjs.Line,
    pie: vueChartjs.Pie,
    doughnut: vueChartjs.Doughnut,
    scatter: vueChartjs.Scatter,
  };
  chartComponent.value = typeMap[node.data.chartType || 'bar'] || vueChartjs.Bar;
});

const hasData = computed(() => {
  const cd = node.data.chartData;
  return cd && cd.labels?.length > 0;
});

const defaultColors = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4',
];

const chartData = computed(() => {
  const cd = node.data.chartData;
  if (!cd) return { labels: [], datasets: [] };

  const datasets = (cd.datasets || []).map((ds: any, i: number) => ({
    ...ds,
    backgroundColor: ds.backgroundColor || defaultColors.slice(0, (cd.labels || []).length),
    borderColor: ds.borderColor || defaultColors[i % defaultColors.length],
    borderWidth: ds.borderWidth ?? 1,
  }));

  return { labels: cd.labels || [], datasets };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: {
      display: node.data.chartType === 'pie' || node.data.chartType === 'doughnut',
      position: 'bottom' as const,
      labels: { boxWidth: 10, font: { size: 10 } },
    },
  },
  scales: (node.data.chartType === 'pie' || node.data.chartType === 'doughnut') ? {} : {
    x: { ticks: { font: { size: 9 }, maxRotation: 45 } },
    y: { ticks: { font: { size: 9 } }, beginAtZero: true },
  },
  ...node.data.chartOptions,
}));

const onToolbarUpdate = (updates: Record<string, any>) => {
  node.data = { ...node.data, ...updates };
};
</script>
