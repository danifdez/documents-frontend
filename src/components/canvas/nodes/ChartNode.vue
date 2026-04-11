<template>
  <div class="rounded-xl shadow-sm h-full flex flex-col bg-surface-elevated border border-border overflow-hidden"
    :class="{ 'ring-2 ring-accent': selected }">
    <NodeResizer :is-visible="selected" :min-width="200" :min-height="160" color="var(--color-accent, #6366f1)" />
    <Handle id="top" type="source" :position="Position.Top" :connectable="true" />
    <Handle id="right" type="source" :position="Position.Right" :connectable="true" />
    <Handle id="bottom" type="source" :position="Position.Bottom" :connectable="true" />
    <Handle id="left" type="source" :position="Position.Left" :connectable="true" />
    <NodeFloatingToolbar :selected="selected" node-type="chart" :data="node.data"
      @update="onToolbarUpdate" />

    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2 bg-surface border-b border-border shrink-0">
      <div class="flex items-center gap-1.5 min-w-0">
        <svg class="h-3.5 w-3.5 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v16h16" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 16V9" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 16V4" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M16 16v-5" />
        </svg>
        <span class="text-xs font-semibold text-text-primary truncate">{{ node.data.chartName || 'Chart' }}</span>
        <span v-if="node.data.datasetName" class="text-[9px] text-text-muted truncate">({{ node.data.datasetName }})</span>
      </div>
      <button @click="loadChart" :disabled="loading"
        class="p-1 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer nodrag shrink-0"
        title="Refresh">
        <svg class="h-3 w-3" :class="{ 'animate-spin': loading }" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div ref="contentEl" class="flex-1 min-h-0 p-2 overflow-hidden">
      <div v-if="loading" class="flex items-center justify-center h-full">
        <div class="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent"></div>
      </div>
      <div v-else-if="error" class="flex items-center justify-center h-full text-xs text-red-500 px-2 text-center">
        {{ error }}
      </div>
      <div v-else-if="!node.data.chartId && !chartReady" class="flex items-center justify-center h-full text-xs text-text-muted">
        No chart linked
      </div>
      <img v-else-if="chartImage" :src="chartImage" class="w-full h-full object-contain" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Handle, Position, useNode } from '@vue-flow/core';
import { NodeResizer } from '@vue-flow/node-resizer';
import '@vue-flow/node-resizer/dist/style.css';
import NodeFloatingToolbar from '../NodeFloatingToolbar.vue';
import { Chart, registerables } from 'chart.js';
import apiClient from '../../../services/api';

Chart.register(...registerables);

defineProps<{ id: string; data: Record<string, any>; selected: boolean }>();
const { node } = useNode();

const loading = ref(false);
const error = ref<string | null>(null);
const chartReady = ref(false);
const chartImage = ref<string | null>(null);
const contentEl = ref<HTMLElement | null>(null);

const loadChart = async () => {
  if (!node.data.chartId || !node.data.datasetId) return;

  loading.value = true;
  error.value = null;

  try {
    const chartRes = await apiClient.get(`/datasets/${node.data.datasetId}/charts`);
    const savedChart = chartRes.data.find((c: any) => c.id === node.data.chartId);

    if (!savedChart) {
      error.value = 'Chart not found';
      loading.value = false;
      return;
    }

    const statsRes = await apiClient.post(`/datasets/${node.data.datasetId}/stats`, {
      operation: 'chart',
      params: savedChart.config,
    });

    const jobId = statsRes.data.jobId;

    const result = await new Promise<any>((resolve, reject) => {
      const timer = setInterval(async () => {
        try {
          const res = await apiClient.get(`/datasets/${node.data.datasetId}/stats/${jobId}`);
          if (res.data.status === 'completed' || res.data.status === 'processed') {
            clearInterval(timer);
            resolve(res.data.result);
          } else if (res.data.status === 'failed') {
            clearInterval(timer);
            reject(new Error('Chart generation failed'));
          }
        } catch { /* keep polling */ }
      }, 1500);
      setTimeout(() => { clearInterval(timer); reject(new Error('Timeout')); }, 30000);
    });

    renderChart(result);
    chartReady.value = true;
    loading.value = false;
  } catch (err: any) {
    error.value = err.message || 'Failed to load chart';
    loading.value = false;
  }
};

const renderChart = (result: any) => {
  if (!result?.chartData) return;

  const w = 800;
  const h = 500;
  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return;

  const { chartType, chartData: data, title, yLabel } = result;
  let config: any = null;

  if (chartType === 'scatter' && data.points) {
    config = {
      type: 'scatter' as const,
      data: {
        datasets: [{
          label: title || 'Data',
          data: data.points,
          backgroundColor: 'rgba(99, 102, 241, 0.5)',
          pointRadius: 4,
        }],
      },
    };
  } else if (data.labels && data.values) {
    const isPie = chartType === 'pie' || chartType === 'doughnut';
    const bgColor = isPie
      ? data.labels.map((_: any, i: number) => `hsla(${(i * 360) / data.labels.length}, 70%, 60%, 0.7)`)
      : 'rgba(99, 102, 241, 0.6)';

    config = {
      type: (chartType === 'histogram' ? 'bar' : chartType) as any,
      data: {
        labels: data.labels,
        datasets: [{
          label: yLabel || title || 'Value',
          data: data.values,
          backgroundColor: bgColor,
          borderColor: chartType === 'line' ? 'rgba(99, 102, 241, 0.8)' : undefined,
          borderWidth: chartType === 'line' ? 2 : 1,
          fill: chartType === 'line' ? false : undefined,
          tension: chartType === 'line' ? 0.3 : undefined,
        }],
      },
    };
  }

  if (!config) return;

  const isPie = chartType === 'pie' || chartType === 'doughnut';
  config.options = {
    responsive: false,
    animation: false,
    devicePixelRatio: 2,
    plugins: {
      legend: { display: isPie, position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
    },
  };

  const chart = new Chart(ctx, config);
  chartImage.value = offscreen.toDataURL('image/png');
  chart.destroy();
};

onMounted(() => {
  if (node.data.chartId) loadChart();
});

const onToolbarUpdate = (updates: Record<string, any>) => {
  node.data = { ...node.data, ...updates };
};
</script>
