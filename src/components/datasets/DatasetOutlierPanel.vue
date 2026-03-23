<template>
    <div class="space-y-4">
        <!-- Configuration -->
        <div class="bg-surface-elevated rounded-xl border border-border p-4 space-y-3">
            <div class="grid grid-cols-2 gap-3 items-end">
                <div>
                    <label class="block text-xs font-medium text-text-secondary mb-1">Numeric field
                        <HelpTip>Select a numeric field to analyze. Outliers are detected using the IQR method: values below Q1-1.5*IQR or above Q3+1.5*IQR are flagged. Z-scores above 3 are also reported.</HelpTip>
                    </label>
                    <select v-model="selectedField"
                        class="block w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                        <option value="">Select...</option>
                        <option v-for="f in numericFields" :key="f.key" :value="f.key">{{ f.name }}</option>
                    </select>
                </div>
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

        <!-- Error -->
        <div v-if="result?.error" class="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {{ result.error }}
        </div>

        <!-- Results -->
        <template v-if="result && !result.error && result.chartData">
            <!-- Stats cards -->
            <div class="flex flex-wrap gap-3">
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
            <div class="bg-surface-elevated rounded-xl border border-border overflow-hidden">
                <div class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface">
                    <span class="text-sm font-medium text-text-primary">
                        {{ result.fieldName }} — Distribution & Outliers
                    </span>
                    <button @click="exportPng"
                        class="text-xs text-accent hover:text-accent-dark cursor-pointer transition-colors">
                        Export PNG
                    </button>
                </div>
                <div class="p-4">
                    <canvas ref="chartCanvas" class="max-h-72"></canvas>
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
                class="bg-surface-elevated rounded-xl border border-border overflow-hidden">
                <div class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface">
                    <span class="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                        Outlier Records ({{ result.tableData.rows.length }})
                    </span>
                    <button @click="exportCsv"
                        class="text-xs text-accent hover:text-accent-dark cursor-pointer transition-colors">
                        Export CSV
                    </button>
                </div>
                <div class="overflow-x-auto max-h-60">
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
}>();

const emit = defineEmits<{
    run: [operation: string, params: Record<string, any>];
}>();

const numericFields = computed(() => props.schema.filter(f => f.type === 'number'));
const selectedField = ref('');
const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const handleRun = () => {
    emit('run', 'outliers', { field: selectedField.value });
};

// Render strip + box chart
watch(() => props.result, async (newResult) => {
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    if (!newResult || newResult.error || !newResult.chartData?.allPoints) return;

    await nextTick();
    if (!chartCanvas.value) return;
    const ctx = chartCanvas.value.getContext('2d');
    if (!ctx) return;

    const allPoints = newResult.chartData.allPoints;
    const normalPoints = allPoints.filter((p: any) => !p.isOutlier);
    const outlierPoints = allPoints.filter((p: any) => p.isOutlier);

    // Jitter Y for strip plot effect
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
                // Box whisker lines as line datasets
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
}, { deep: true });

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
