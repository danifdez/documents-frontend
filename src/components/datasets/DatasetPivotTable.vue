<template>
    <div class="space-y-4">
        <!-- Configuration -->
        <div class="bg-surface-elevated rounded-xl border border-border p-4 space-y-3">
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                <div>
                    <label class="block text-xs font-medium text-text-secondary mb-1">Row field *
                        <HelpTip>Field whose unique values will become the rows of the pivot table. Choose a categorical field like country, status, or category.</HelpTip>
                    </label>
                    <select v-model="config.rowField"
                        class="block w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                        <option value="">Select...</option>
                        <option v-for="f in schema" :key="f.key" :value="f.key">{{ f.name }} ({{ f.type }})</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-medium text-text-secondary mb-1">Column field *
                        <HelpTip>Field whose unique values will become the columns. This creates a cross-tabulation between the row and column fields.</HelpTip>
                    </label>
                    <select v-model="config.colField"
                        class="block w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                        <option value="">Select...</option>
                        <option v-for="f in schema" :key="f.key" :value="f.key">{{ f.name }} ({{ f.type }})</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-medium text-text-secondary mb-1">Value field
                        <HelpTip>Optional numeric field to aggregate in each cell. If left empty, each cell shows the count of records matching that row/column combination.</HelpTip>
                    </label>
                    <select v-model="config.valueField"
                        class="block w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                        <option value="">Count (no field)</option>
                        <option v-for="f in numericFields" :key="f.key" :value="f.key">{{ f.name }}</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-medium text-text-secondary mb-1">Function
                        <HelpTip>How to aggregate the value field in each cell. Count counts records, Sum adds values, Mean averages them, etc.</HelpTip>
                    </label>
                    <select v-model="config.fn"
                        class="block w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                        <option value="count">Count</option>
                        <option value="sum">Sum</option>
                        <option value="mean">Mean</option>
                        <option value="min">Min</option>
                        <option value="max">Max</option>
                        <option value="median">Median</option>
                    </select>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <button @click="handleRun" :disabled="running || !canRun"
                    class="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                    <svg v-if="running" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {{ running ? 'Computing...' : 'Generate' }}
                </button>
            </div>
        </div>

        <!-- Error -->
        <div v-if="result?.error" class="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {{ result.error }}
        </div>

        <!-- Results -->
        <template v-if="result && !result.error && result.tableData">
            <!-- Stats -->
            <div class="flex flex-wrap gap-3">
                <div v-for="(val, key) in result.stats" :key="key"
                    class="px-3 py-2 rounded-lg bg-surface-elevated border border-border">
                    <div class="text-sm font-semibold text-text-primary">{{ formatValue(val) }}</div>
                    <div class="text-[10px] text-text-muted uppercase">{{ formatLabel(key as string) }}</div>
                </div>
            </div>

            <!-- Data / Chart tabs -->
            <div class="bg-surface-elevated rounded-xl border border-border overflow-hidden">
                <!-- Tab bar -->
                <div class="flex items-center justify-between px-4 py-2 border-b border-border bg-surface">
                    <div class="flex items-center gap-1">
                        <button @click="viewTab = 'data'"
                            class="px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer"
                            :class="viewTab === 'data' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-surface-hover'">
                            Data
                        </button>
                        <button @click="viewTab = 'chart'"
                            class="px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer"
                            :class="viewTab === 'chart' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-surface-hover'">
                            Chart
                        </button>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-[11px] text-text-muted">
                            {{ result.rowFieldName }} &times; {{ result.colFieldName }}
                            <span class="font-normal">({{ result.valueFieldName }})</span>
                        </span>
                        <button v-if="viewTab === 'data'" @click="exportCsv"
                            class="text-xs text-accent hover:text-accent-dark cursor-pointer transition-colors">
                            Export CSV
                        </button>
                        <button v-if="viewTab === 'chart'" @click="exportChartPng"
                            class="text-xs text-accent hover:text-accent-dark cursor-pointer transition-colors">
                            Export PNG
                        </button>
                    </div>
                </div>

                <!-- Data view -->
                <div v-if="viewTab === 'data'" class="overflow-auto max-h-[60vh]" ref="tableRef">
                    <table class="text-xs w-full">
                        <thead>
                            <tr>
                                <th class="px-3 py-2 text-left font-semibold text-text-primary bg-surface sticky left-0 top-0 z-20 border-b border-r border-border">
                                    {{ result.rowFieldName }} \ {{ result.colFieldName }}
                                </th>
                                <th v-for="col in result.tableData.cols" :key="col"
                                    class="px-3 py-2 text-center font-medium text-text-muted bg-surface sticky top-0 z-10 border-b border-border whitespace-nowrap">
                                    {{ col }}
                                </th>
                                <th class="px-3 py-2 text-center font-semibold text-text-primary bg-surface-hover sticky top-0 z-10 border-b border-l border-border">
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(row, i) in result.tableData.values" :key="i" class="hover:bg-surface-hover/50">
                                <td class="px-3 py-2 font-medium text-text-primary bg-surface sticky left-0 z-10 border-r border-border whitespace-nowrap">
                                    {{ result.tableData.rows[i] }}
                                </td>
                                <td v-for="(val, j) in row" :key="j"
                                    class="px-3 py-2 text-center font-mono"
                                    :style="{ backgroundColor: valueCellColor(val) }">
                                    {{ formatValue(val) }}
                                </td>
                                <td class="px-3 py-2 text-center font-mono font-semibold text-text-primary bg-surface-hover/50 border-l border-border">
                                    {{ formatValue(result.tableData.rowTotals[i]) }}
                                </td>
                            </tr>
                            <!-- Column totals row -->
                            <tr class="border-t border-border">
                                <td class="px-3 py-2 font-semibold text-text-primary bg-surface-hover sticky left-0 z-10 border-r border-border">
                                    Total
                                </td>
                                <td v-for="(val, j) in result.tableData.colTotals" :key="j"
                                    class="px-3 py-2 text-center font-mono font-semibold text-text-primary bg-surface-hover/50">
                                    {{ formatValue(val) }}
                                </td>
                                <td class="px-3 py-2 text-center font-mono font-bold text-accent bg-surface-hover/50 border-l border-border">
                                    {{ formatValue(result.tableData.grandTotal) }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Chart view -->
                <div v-if="viewTab === 'chart'" class="p-4">
                    <canvas ref="chartCanvas" class="max-h-96"></canvas>
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
    result: Record<string, any> | null;
    running: boolean;
}>();

const emit = defineEmits<{
    run: [operation: string, params: Record<string, any>];
}>();

const numericFields = computed(() => props.schema.filter(f => f.type === 'number'));
const config = ref({ rowField: '', colField: '', valueField: '', fn: 'count' });
const viewTab = ref<'data' | 'chart'>('data');
const chartCanvas = ref<HTMLCanvasElement | null>(null);
const tableRef = ref<HTMLElement | null>(null);
let chartInstance: Chart | null = null;

const canRun = computed(() => config.value.rowField && config.value.colField);

const handleRun = () => {
    const p: Record<string, any> = {
        rowField: config.value.rowField,
        colField: config.value.colField,
        fn: config.value.fn,
    };
    if (config.value.valueField) p.valueField = config.value.valueField;
    emit('run', 'pivot_table', p);
};

// Max value for color scaling
const maxVal = computed(() => {
    if (!props.result?.tableData?.values) return 1;
    let max = 0;
    for (const row of props.result.tableData.values) {
        for (const v of row) {
            if (v !== null && Math.abs(v) > max) max = Math.abs(v);
        }
    }
    return max || 1;
});

const valueCellColor = (val: number | null): string => {
    if (val === null || val === 0) return 'transparent';
    const intensity = Math.min(Math.abs(val) / maxVal.value, 1) * 0.15;
    return `rgba(99, 102, 241, ${intensity})`;
};

const renderChart = async () => {
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    if (!props.result?.chartData?.barDatasets) return;

    await nextTick();
    if (!chartCanvas.value) return;
    const ctx = chartCanvas.value.getContext('2d');
    if (!ctx) return;

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: props.result.chartData.barLabels,
            datasets: props.result.chartData.barDatasets,
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { stacked: true }, y: { stacked: true } },
            plugins: { legend: { position: 'bottom' } },
        },
    });
};

// Re-render chart when result changes or when switching to chart tab
watch(() => props.result, () => {
    if (viewTab.value === 'chart') renderChart();
}, { deep: true });

watch(viewTab, (tab) => {
    if (tab === 'chart') renderChart();
    else if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
});

onUnmounted(() => { if (chartInstance) chartInstance.destroy(); });

const formatValue = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') {
        if (Number.isInteger(val)) return val.toLocaleString();
        return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return String(val);
};

const formatLabel = (key: string): string => {
    return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
};

const exportCsv = () => {
    if (!props.result?.tableData) return;
    const td = props.result.tableData;
    let csv = `"",${td.cols.map((c: string) => `"${c}"`).join(',')},Total\n`;
    td.values.forEach((row: (number | null)[], i: number) => {
        csv += `"${td.rows[i]}",${row.map((v: number | null) => v ?? '').join(',')},${td.rowTotals[i] ?? ''}\n`;
    });
    csv += `Total,${td.colTotals.map((v: number | null) => v ?? '').join(',')},${td.grandTotal ?? ''}\n`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'pivot_table.csv'; a.click();
    URL.revokeObjectURL(url);
};

const exportChartPng = () => {
    if (!chartCanvas.value) return;
    const url = chartCanvas.value.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = 'pivot_chart.png'; a.click();
};
</script>
