<template>
    <div class="space-y-4">
        <!-- Operation selector -->
        <div class="bg-surface-elevated rounded-xl border border-border p-4 space-y-3">
            <div class="flex items-center gap-2 flex-wrap">
                <button v-for="op in operations" :key="op.id" @click="selectedOp = op.id"
                    :title="op.tooltip"
                    class="px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer"
                    :class="selectedOp === op.id ? 'bg-accent text-white' : 'bg-surface border border-border text-text-secondary hover:bg-surface-hover'">
                    {{ op.label }}
                </button>
            </div>

            <!-- Operation-specific parameters -->
            <div class="grid grid-cols-2 gap-3 items-end">
                <!-- Distribution -->
                <template v-if="selectedOp === 'distribution'">
                    <div>
                        <label class="block text-xs font-medium text-text-secondary mb-1">Field
                            <HelpTip>Select a field to see its distribution. For numeric fields you get a histogram; for text/select fields you get a frequency bar chart of the most common values.</HelpTip>
                        </label>
                        <select v-model="params.field"
                            class="block w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                            <option value="">Select...</option>
                            <option v-for="f in schema" :key="f.key" :value="f.key">{{ f.name }} ({{ f.type }})</option>
                        </select>
                    </div>
                </template>

                <!-- Time Series -->
                <template v-if="selectedOp === 'time_series'">
                    <div>
                        <label class="block text-xs font-medium text-text-secondary mb-1">Date field
                            <HelpTip>A date or datetime field to use as the time axis. Records are grouped into periods (day, week, month, etc.).</HelpTip>
                        </label>
                        <select v-model="params.dateField"
                            class="block w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                            <option value="">Select...</option>
                            <option v-for="f in dateFields" :key="f.key" :value="f.key">{{ f.name }}</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-text-secondary mb-1">Value field
                            <HelpTip>Numeric field to track over time. The average value per period will be plotted as a trend line.</HelpTip>
                        </label>
                        <select v-model="params.valueField"
                            class="block w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                            <option value="">Select...</option>
                            <option v-for="f in numericFields" :key="f.key" :value="f.key">{{ f.name }}</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-text-secondary mb-1">Period
                            <HelpTip>Time granularity for grouping. Day gives the most detail, Year the broadest view. Choose based on your date range.</HelpTip>
                        </label>
                        <select v-model="params.period"
                            class="block w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                            <option value="D">Day</option>
                            <option value="W">Week</option>
                            <option value="ME">Month</option>
                            <option value="QE">Quarter</option>
                            <option value="YE">Year</option>
                        </select>
                    </div>
                </template>

            </div>

            <!-- Run button -->
            <button @click="handleRun" :disabled="running"
                class="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                <svg v-if="running" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {{ running ? 'Analyzing...' : 'Run' }}
            </button>
        </div>

        <!-- Error -->
        <div v-if="result?.error" class="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {{ result.error }}
        </div>

        <!-- Results -->
        <template v-if="result && !result.error">
            <!-- Stats summary -->
            <div v-if="result.stats" class="flex flex-wrap gap-3">
                <div v-for="(val, key) in result.stats" :key="key"
                    class="px-3 py-2 rounded-lg bg-surface-elevated border border-border">
                    <div class="text-sm font-semibold text-text-primary">{{ formatValue(val) }}</div>
                    <div class="text-[10px] text-text-muted uppercase">{{ formatLabel(key as string) }}</div>
                </div>
            </div>

            <!-- Chart -->
            <div v-if="result.chartType && result.chartType !== 'none' && result.chartData"
                class="bg-surface-elevated rounded-xl border border-border overflow-hidden">
                <div class="flex items-center justify-end px-4 py-2 border-b border-border-light bg-surface">
                    <button @click="exportPng"
                        class="text-xs text-accent hover:text-accent-dark cursor-pointer transition-colors">
                        Export PNG
                    </button>
                </div>
                <div class="p-4">
                    <canvas ref="chartCanvas" class="max-h-80"></canvas>
                </div>
            </div>

            <!-- Summary table (for summary operation) -->
            <div v-if="result.operation === 'summary' && result.tableData?.fields"
                class="bg-surface-elevated rounded-xl border border-border overflow-hidden">
                <div class="px-4 py-2.5 border-b border-border bg-surface text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                    Fields Overview
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b border-border-light bg-surface">
                                <th class="px-3 py-2 text-left text-xs text-text-muted">Field</th>
                                <th class="px-3 py-2 text-left text-xs text-text-muted">Type</th>
                                <th class="px-3 py-2 text-right text-xs text-text-muted">Non-null</th>
                                <th class="px-3 py-2 text-right text-xs text-text-muted">Null %</th>
                                <th class="px-3 py-2 text-right text-xs text-text-muted">Mean</th>
                                <th class="px-3 py-2 text-right text-xs text-text-muted">Std</th>
                                <th class="px-3 py-2 text-right text-xs text-text-muted">Min</th>
                                <th class="px-3 py-2 text-right text-xs text-text-muted">Max</th>
                                <th class="px-3 py-2 text-right text-xs text-text-muted">Unique / Top</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-border-light">
                            <tr v-for="f in result.tableData.fields" :key="f.field" class="hover:bg-surface-hover">
                                <td class="px-3 py-2 font-medium text-text-primary">{{ f.name }}</td>
                                <td class="px-3 py-2">
                                    <span class="px-1.5 py-0.5 rounded text-[10px] bg-surface-hover text-text-muted">{{ f.type }}</span>
                                </td>
                                <td class="px-3 py-2 text-right text-text-secondary">{{ f.nonNullCount }}</td>
                                <td class="px-3 py-2 text-right" :class="f.nullPercent > 10 ? 'text-amber-600' : 'text-text-muted'">
                                    {{ f.nullPercent != null ? `${formatValue(f.nullPercent)}%` : '—' }}
                                </td>
                                <td class="px-3 py-2 text-right text-text-secondary">{{ f.mean != null ? formatValue(f.mean) : '—' }}</td>
                                <td class="px-3 py-2 text-right text-text-secondary">{{ f.std != null ? formatValue(f.std) : '—' }}</td>
                                <td class="px-3 py-2 text-right text-text-secondary">{{ f.min != null ? formatValue(f.min) : '—' }}</td>
                                <td class="px-3 py-2 text-right text-text-secondary">{{ f.max != null ? formatValue(f.max) : '—' }}</td>
                                <td class="px-3 py-2 text-right text-text-secondary text-xs">
                                    <span v-if="f.uniqueCount != null">{{ f.uniqueCount }} unique</span>
                                    <span v-if="f.topValue" class="block text-text-muted truncate max-w-[8rem]">top: {{ f.topValue }}</span>
                                    <span v-if="!f.uniqueCount && !f.topValue">—</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Data table (for chart-based results) -->
            <div v-if="result.tableData && result.operation !== 'summary'"
                class="bg-surface-elevated rounded-xl border border-border overflow-hidden">
                <div class="px-4 py-2.5 border-b border-border bg-surface flex items-center justify-between">
                    <span class="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Data</span>
                    <button @click="exportCsv"
                        class="text-xs text-accent hover:text-accent-dark cursor-pointer transition-colors">
                        Export CSV
                    </button>
                </div>
                <div class="overflow-x-auto max-h-60">
                    <!-- Labels + values format -->
                    <table v-if="result.tableData.labels && result.tableData.values" class="w-full text-sm">
                        <tbody class="divide-y divide-border-light">
                            <tr v-for="(label, i) in result.tableData.labels" :key="i" class="hover:bg-surface-hover">
                                <td class="px-3 py-1.5 text-text-primary">{{ label }}</td>
                                <td class="px-3 py-1.5 text-right text-text-secondary font-mono">
                                    {{ Array.isArray(result.tableData.values[i]) ? result.tableData.values[i].join(', ') : formatValue(result.tableData.values[i]) }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <!-- Rows format (scatter, query) -->
                    <table v-else-if="result.tableData.rows" class="w-full text-sm">
                        <thead v-if="result.tableData.columns">
                            <tr class="border-b border-border-light bg-surface">
                                <th v-for="col in result.tableData.columns" :key="col"
                                    class="px-3 py-1.5 text-left text-xs text-text-muted">{{ col }}</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-border-light">
                            <tr v-for="(row, i) in result.tableData.rows.slice(0, 100)" :key="i" class="hover:bg-surface-hover">
                                <td v-for="(val, j) in (Array.isArray(row) ? row : [row])" :key="j"
                                    class="px-3 py-1.5 text-text-secondary font-mono text-xs">{{ formatValue(val) }}</td>
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
    result: Record<string, any> | null;
    running: boolean;
}>();

const emit = defineEmits<{
    run: [operation: string, params: Record<string, any>];
}>();

const operations = [
    { id: 'summary', label: 'Summary', tooltip: 'Quick overview of all fields: counts, means, ranges, and top values' },
    { id: 'distribution', label: 'Distribution', tooltip: 'Histogram for numeric fields or frequency chart for categories' },
    { id: 'time_series', label: 'Time Series', tooltip: 'Track how a numeric value changes over time' },
];

const selectedOp = ref('summary');
const params = ref<Record<string, any>>({ fn: 'mean', period: 'ME', chartType: 'bar' });
const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const numericFields = computed(() => props.schema.filter(f => f.type === 'number'));
const dateFields = computed(() => props.schema.filter(f => f.type === 'date' || f.type === 'datetime'));

const handleRun = () => {
    emit('run', selectedOp.value, { ...params.value });
};

// Chart rendering
watch(() => props.result, async (newResult) => {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    if (!newResult || !newResult.chartData || newResult.chartType === 'none') return;

    await nextTick();
    if (!chartCanvas.value) return;

    const ctx = chartCanvas.value.getContext('2d');
    if (!ctx) return;

    const chartType = newResult.chartType;
    const data = newResult.chartData;

    if (chartType === 'scatter' && data.points) {
        chartInstance = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: `${newResult.field1Name} vs ${newResult.field2Name}`,
                        data: data.points,
                        backgroundColor: 'rgba(99, 102, 241, 0.5)',
                        pointRadius: 4,
                    },
                    ...(data.regression ? [{
                        label: 'Regression',
                        type: 'line' as const,
                        data: [
                            { x: data.regression.xRange[0], y: data.regression.slope * data.regression.xRange[0] + data.regression.intercept },
                            { x: data.regression.xRange[1], y: data.regression.slope * data.regression.xRange[1] + data.regression.intercept },
                        ],
                        borderColor: 'rgba(239, 68, 68, 0.7)',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                    }] : []),
                ],
            },
            options: { responsive: true, maintainAspectRatio: false },
        });
    } else if (chartType === 'box' && data.outliers !== undefined) {
        // Render box plot as a bar chart approximation
        const boxData = data;
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Min', 'Q1', 'Median', 'Q3', 'Max'],
                datasets: [{
                    label: newResult.fieldName,
                    data: [boxData.min, boxData.q1, boxData.median, boxData.q3, boxData.max],
                    backgroundColor: [
                        'rgba(99, 102, 241, 0.3)',
                        'rgba(99, 102, 241, 0.5)',
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(99, 102, 241, 0.5)',
                        'rgba(99, 102, 241, 0.3)',
                    ],
                }],
            },
            options: { responsive: true, maintainAspectRatio: false },
        });
    } else if (data.labels && data.values) {
        const bgColor = chartType === 'pie'
            ? data.labels.map((_: string, i: number) => `hsla(${(i * 360) / data.labels.length}, 70%, 60%, 0.7)`)
            : 'rgba(99, 102, 241, 0.6)';

        chartInstance = new Chart(ctx, {
            type: chartType === 'histogram' ? 'bar' : chartType,
            data: {
                labels: data.labels,
                datasets: [{
                    label: newResult.fieldName || newResult.fn || 'Value',
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
}, { deep: true });

onUnmounted(() => {
    if (chartInstance) chartInstance.destroy();
});

const formatValue = (val: string | number | null | undefined): string => {
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
    a.href = url; a.download = `stats_${selectedOp.value}.png`; a.click();
};

const exportCsv = () => {
    if (!props.result?.tableData) return;
    const td = props.result.tableData;
    let csv = '';

    if (td.labels && td.values) {
        csv = 'Label,Value\n';
        td.labels.forEach((l: string, i: number) => {
            csv += `"${l}",${td.values[i]}\n`;
        });
    } else if (td.columns && td.rows) {
        csv = td.columns.join(',') + '\n';
        td.rows.forEach((row: (string | number | null)[]) => {
            csv += row.map((v: string | number | null) => `"${v}"`).join(',') + '\n';
        });
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis_${props.result.operation || 'data'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};
</script>
