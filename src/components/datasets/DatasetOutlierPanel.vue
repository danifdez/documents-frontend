<template>
    <div :class="mode === 'display' ? 'h-full flex flex-col gap-3 overflow-hidden' : 'space-y-4'">
        <!-- Configuration -->
        <div v-if="showControls" class="bg-surface-elevated rounded-xl border border-border p-4 space-y-3">
            <p class="text-xs text-text-muted leading-relaxed">Find unusual values in a numeric field using the IQR method (values beyond 1.5x the interquartile range) and Z-scores above 3.</p>
            <div>
                <label class="block text-xs font-medium text-text-secondary mb-1">Numeric field</label>
                <select v-model="selectedField"
                    class="block w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    <option value="">Select...</option>
                    <option v-for="f in numericFields" :key="f.key" :value="f.key">{{ f.name }}</option>
                </select>
            </div>
            <button @click="handleRun" :disabled="running || !selectedField"
                class="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                <svg v-if="running" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {{ running ? 'Analyzing...' : 'Detect Outliers' }}
            </button>
        </div>

        <!-- Saved views for this type -->
        <div v-if="showControls && savedViews && savedViews.length > 0"
            class="bg-surface-elevated rounded-xl border border-border overflow-hidden">
            <div class="px-3 py-2 border-b border-border-light bg-surface">
                <span class="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Saved</span>
            </div>
            <div class="divide-y divide-border-light max-h-32 overflow-y-auto">
                <div v-for="sv in savedViews" :key="sv.id"
                    class="flex items-center justify-between px-3 py-2 hover:bg-surface-hover transition-colors group">
                    <button @click="$emit('loadSaved', sv)"
                        class="flex-1 min-w-0 text-xs text-text-primary hover:text-accent transition-colors cursor-pointer text-left truncate">
                        {{ sv.name }}
                    </button>
                    <button @click="$emit('deleteSaved', sv.id)"
                        class="p-0.5 rounded text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 shrink-0">
                        <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>

        <!-- Error -->
        <div v-if="showResults && result?.error" class="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {{ result.error }}
        </div>

        <!-- Results -->
        <template v-if="showResults && result && !result.error && result.chartData">
            <!-- Stats cards -->
            <div class="flex flex-wrap gap-3 shrink-0">
                <div v-for="(val, key) in result.stats" :key="key"
                    class="px-3 py-2 rounded-lg border border-border"
                    :class="key === 'outlierCount' && val > 0 ? 'bg-red-50 border-red-200' : 'bg-surface-elevated'">
                    <div class="text-sm font-semibold" :class="key === 'outlierCount' && val > 0 ? 'text-red-700' : 'text-text-primary'">
                        {{ formatValue(val) }}
                    </div>
                    <div class="text-[10px] text-text-muted uppercase">{{ formatLabel(key as string) }}</div>
                </div>
            </div>

            <!-- Strip plot + Box overlay -->
            <div class="rounded-xl border border-border overflow-hidden flex flex-col flex-1 min-h-0">
                <div class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface">
                    <span class="text-sm font-medium text-text-primary">
                        {{ result.fieldName }} — Distribution & Outliers
                    </span>
                    <button @click="exportPng"
                        class="text-xs text-accent hover:text-accent-dark cursor-pointer transition-colors">
                        Export PNG
                    </button>
                </div>
                <div class="p-4 flex-1 min-h-0">
                    <canvas ref="chartCanvas" class="w-full h-full"></canvas>
                </div>
                <!-- Box plot summary -->
                <div class="px-4 pb-3 flex items-center gap-4 text-[10px] text-text-muted">
                    <span><span class="inline-block w-2 h-2 rounded-full bg-indigo-400 mr-1"></span>Normal</span>
                    <span><span class="inline-block w-2 h-2 rounded-full bg-red-500 mr-1"></span>Outlier (IQR)</span>
                    <span class="ml-auto">
                        Fences: [{{ formatValue(result.chartData.lowerFence) }}, {{ formatValue(result.chartData.upperFence) }}]
                    </span>
                </div>
            </div>

            <!-- Outlier records table -->
            <div v-if="result.tableData?.rows?.length > 0"
                class="rounded-xl border border-border overflow-hidden flex flex-col shrink-0" style="max-height: 30%;">
                <div class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface shrink-0">
                    <span class="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                        Outlier Records ({{ result.tableData.rows.length }})
                    </span>
                    <button @click="exportCsv"
                        class="text-xs text-accent hover:text-accent-dark cursor-pointer transition-colors">
                        Export CSV
                    </button>
                </div>
                <div class="overflow-auto flex-1 min-h-0">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b border-border-light bg-surface">
                                <th v-for="col in result.tableData.columns" :key="col"
                                    class="px-3 py-1.5 text-left text-xs text-text-muted">{{ col }}</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-border-light">
                            <tr v-for="(row, i) in result.tableData.rows" :key="i" class="hover:bg-surface-hover">
                                <td v-for="(val, j) in row" :key="j"
                                    class="px-3 py-1.5 font-mono text-xs"
                                    :class="j === 2 && val > 3 ? 'text-red-600 font-semibold' : 'text-text-secondary'">
                                    {{ formatValue(val) }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue';
import { Chart, registerables } from 'chart.js';
import type { DatasetField } from '../../services/datasets/useDatasets';
import HelpTip from '../ui/HelpTip.vue';

Chart.register(...registerables);

const props = defineProps<{
    schema: DatasetField[];
    result: any | null;
    running: boolean;
    mode?: 'full' | 'sidebar' | 'display';
    savedViews?: { id: number; name: string; config: Record<string, any> }[];
}>();

const emit = defineEmits<{
    run: [operation: string, params: Record<string, any>];
    loadSaved: [view: any];
    deleteSaved: [id: number];
}>();

const showControls = computed(() => !props.mode || props.mode === 'full' || props.mode === 'sidebar');
const showResults = computed(() => !props.mode || props.mode === 'full' || props.mode === 'display');

const numericFields = computed(() => props.schema.filter(f => f.type === 'number'));
const selectedField = ref('');
const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const handleRun = () => {
    emit('run', 'outliers', { field: selectedField.value });
};

// Render strip + box chart
const renderChart = async (newResult: any) => {
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    if (!newResult || newResult.error || !newResult.chartData?.allPoints) return;
    if (!showResults.value) return;

    await nextTick();
    if (!chartCanvas.value) return;
    const ctx = chartCanvas.value.getContext('2d');
    if (!ctx) return;

    const allPoints = newResult.chartData.allPoints;
    const normalPoints = allPoints.filter((p: any) => !p.isOutlier);
    const outlierPoints = allPoints.filter((p: any) => p.isOutlier);

    const jitter = () => (Math.random() - 0.5) * 0.6;

    chartInstance = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [
                {
                    label: 'Normal',
                    data: normalPoints.map((p: any) => ({ x: p.value, y: 1 + jitter() })),
                    backgroundColor: 'rgba(99, 102, 241, 0.4)',
                    pointRadius: 3,
                },
                {
                    label: 'Outlier',
                    data: outlierPoints.map((p: any) => ({ x: p.value, y: 1 + jitter() })),
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    pointRadius: 5,
                    pointStyle: 'triangle',
                },
                {
                    label: 'IQR Box',
                    type: 'line' as const,
                    data: [
                        { x: newResult.chartData.q1, y: 0.5 },
                        { x: newResult.chartData.q1, y: 1.5 },
                        { x: newResult.chartData.q3, y: 1.5 },
                        { x: newResult.chartData.q3, y: 0.5 },
                        { x: newResult.chartData.q1, y: 0.5 },
                    ],
                    borderColor: 'rgba(99, 102, 241, 0.8)',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                },
                {
                    label: 'Median',
                    type: 'line' as const,
                    data: [
                        { x: newResult.chartData.median, y: 0.5 },
                        { x: newResult.chartData.median, y: 1.5 },
                    ],
                    borderColor: 'rgba(34, 197, 94, 0.9)',
                    borderWidth: 2,
                    borderDash: [4, 4],
                    pointRadius: 0,
                    fill: false,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { display: false, min: 0, max: 2 },
                x: { title: { display: true, text: newResult.fieldName } },
            },
            plugins: {
                legend: { position: 'bottom', labels: { filter: (item: any) => item.text !== 'IQR Box' && item.text !== 'Median' } },
            },
        },
    });
};

watch(() => props.result, (newResult) => {
    if (newResult) renderChart(newResult);
}, { deep: true });

watch(chartCanvas, (canvas) => {
    if (canvas && props.result) renderChart(props.result);
});

onUnmounted(() => { if (chartInstance) chartInstance.destroy(); });

const formatValue = (val: any): string => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') {
        if (Number.isInteger(val)) return val.toLocaleString();
        return val.toLocaleString(undefined, { maximumFractionDigits: 3 });
    }
    return String(val);
};

const formatLabel = (key: string): string => {
    return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
};

const exportPng = () => {
    if (!chartCanvas.value) return;
    const url = chartCanvas.value.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = `outliers_${selectedField.value}.png`; a.click();
};

const exportCsv = () => {
    if (!props.result?.tableData) return;
    const td = props.result.tableData;
    let csv = td.columns.join(',') + '\n';
    td.rows.forEach((row: any[]) => {
        csv += row.map((v: any) => `"${v}"`).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `outliers_${selectedField.value}.csv`; a.click();
    URL.revokeObjectURL(url);
};
</script>
