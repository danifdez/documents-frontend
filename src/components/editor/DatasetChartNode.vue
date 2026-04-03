<template>
    <div class="dataset-chart-node my-3 rounded-xl border border-border bg-surface-elevated overflow-hidden select-none">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border">
            <div class="flex items-center gap-2">
                <svg class="h-4 w-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v16h16" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 16V9" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 16V4" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 16v-5" />
                </svg>
                <span class="text-sm font-semibold text-text-primary">{{ chartName }}</span>
                <span class="text-[10px] text-text-muted">({{ datasetName }})</span>
                <span class="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                    Live
                </span>
            </div>
            <div class="flex items-center gap-1">
                <button @click="loadChart" :disabled="loading"
                    class="p-1 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                    title="Refresh">
                    <svg class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="px-4 py-6 text-sm text-red-500 text-center">{{ error }}</div>

        <!-- Chart canvas -->
        <div v-else class="p-4">
            <canvas ref="chartCanvas" class="max-h-80"></canvas>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue';
import { Chart, registerables } from 'chart.js';
import apiClient from '../../services/api';

Chart.register(...registerables);

const props = defineProps<{
    chartId: number;
    chartName: string;
    datasetId: number;
    datasetName: string;
    editable?: boolean;
}>();

const loading = ref(false);
const error = ref<string | null>(null);
const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const loadChart = async () => {
    loading.value = true;
    error.value = null;

    try {
        // Fetch the saved chart config
        const chartRes = await apiClient.get(`/datasets/${props.datasetId}/charts`);
        const charts = chartRes.data;
        const savedChart = charts.find((c: any) => c.id === props.chartId);

        if (!savedChart) {
            error.value = 'Chart not found';
            return;
        }

        // Request chart data using the saved config
        const statsRes = await apiClient.post(`/datasets/${props.datasetId}/stats`, {
            operation: 'chart',
            params: savedChart.config,
        });

        const jobId = statsRes.data.jobId;

        // Poll for result
        const poll = () => new Promise<any>((resolve, reject) => {
            const timer = setInterval(async () => {
                try {
                    const result = await apiClient.get(`/datasets/${props.datasetId}/stats/${jobId}`);
                    if (result.data.status === 'completed' || result.data.status === 'processed') {
                        clearInterval(timer);
                        resolve(result.data.result);
                    } else if (result.data.status === 'failed') {
                        clearInterval(timer);
                        reject(new Error('Chart generation failed'));
                    }
                } catch {
                    // keep polling
                }
            }, 1500);
            // Timeout after 30s
            setTimeout(() => { clearInterval(timer); reject(new Error('Timeout')); }, 30000);
        });

        const result = await poll();
        await renderChart(result);
    } catch (err: any) {
        error.value = err.message || 'Failed to load chart';
    } finally {
        loading.value = false;
    }
};

const renderChart = async (result: any) => {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    if (!result || !result.chartData) return;

    await nextTick();
    if (!chartCanvas.value) return;

    const ctx = chartCanvas.value.getContext('2d');
    if (!ctx) return;

    const chartType = result.chartType;
    const data = result.chartData;

    if (chartType === 'scatter' && data.points) {
        chartInstance = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: result.title || 'Data',
                    data: data.points,
                    backgroundColor: 'rgba(99, 102, 241, 0.5)',
                    pointRadius: 4,
                }],
            },
            options: { responsive: true, maintainAspectRatio: false },
        });
    } else if (data.labels && data.values) {
        const bgColor = chartType === 'pie'
            ? data.labels.map((_: any, i: number) => `hsla(${(i * 360) / data.labels.length}, 70%, 60%, 0.7)`)
            : 'rgba(99, 102, 241, 0.6)';

        chartInstance = new Chart(ctx, {
            type: chartType === 'histogram' ? 'bar' : chartType,
            data: {
                labels: data.labels,
                datasets: [{
                    label: result.yLabel || result.title || 'Value',
                    data: data.values,
                    backgroundColor: bgColor,
                    borderColor: chartType === 'line' ? 'rgba(99, 102, 241, 0.8)' : undefined,
                    borderWidth: chartType === 'line' ? 2 : 1,
                    fill: chartType === 'line' ? false : undefined,
                    tension: chartType === 'line' ? 0.3 : undefined,
                }],
            },
            options: { responsive: true, maintainAspectRatio: false },
        });
    }
};

onMounted(() => {
    loadChart();
});

onUnmounted(() => {
    if (chartInstance) chartInstance.destroy();
});
</script>
