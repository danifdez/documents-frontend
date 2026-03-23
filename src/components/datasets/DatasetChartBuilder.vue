<template>
    <div class="space-y-4">
        <!-- Configuration -->
        <div class="bg-surface-elevated rounded-xl border border-border p-4 space-y-4">
            <!-- Chart type selector -->
            <div>
                <label class="block text-xs font-medium text-text-secondary mb-2">Chart Type
                    <HelpTip>Select how to visualize your data. Bar and Line work best for categories, Pie for proportions, Scatter for comparing two numeric fields.</HelpTip>
                </label>
                <div class="flex gap-2">
                    <button v-for="ct in chartTypes" :key="ct.id" @click="config.chartType = ct.id"
                        class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer"
                        :class="config.chartType === ct.id ? 'bg-accent text-white' : 'bg-surface border border-border text-text-secondary hover:bg-surface-hover'">
                        <component :is="ct.icon" class="h-4 w-4" />
                        {{ ct.label }}
                    </button>
                </div>
            </div>

            <!-- Field selectors -->
            <div class="grid grid-cols-2 gap-3 items-end">
                <div>
                    <label class="block text-xs font-medium text-text-secondary mb-1">
                        {{ config.chartType === 'scatter' ? 'X Axis' : 'Category / Labels' }}
                        <HelpTip>{{ config.chartType === 'scatter' ? 'Numeric field for the horizontal axis of the scatter plot.' : 'Field used to group data. Each unique value becomes a bar, slice, or point on the chart.' }}</HelpTip>
                    </label>
                    <select v-model="config.xField"
                        class="block w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                        <option value="">Select field...</option>
                        <option v-for="f in availableXFields" :key="f.key" :value="f.key">{{ f.name }} ({{ f.type }})
                        </option>
                    </select>
                </div>

                <div>
                    <label class="block text-xs font-medium text-text-secondary mb-1">
                        {{ config.chartType === 'scatter' ? 'Y Axis' : 'Values (numeric)' }}
                        <HelpTip>{{ config.chartType === 'scatter' ? 'Numeric field for the vertical axis.' : 'Numeric field to aggregate. Leave empty to count occurrences of each category.' }}</HelpTip>
                    </label>
                    <select v-model="config.yField"
                        class="block w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                        <option value="">{{ config.chartType === 'scatter' ? 'Select field...' : 'Count (no field)' }}
                        </option>
                        <option v-for="f in numericFields" :key="f.key" :value="f.key">{{ f.name }}</option>
                    </select>
                </div>

                <!-- Aggregation (only for non-scatter with yField) -->
                <div v-if="config.chartType !== 'scatter' && config.yField">
                    <label class="block text-xs font-medium text-text-secondary mb-1">Aggregation
                        <HelpTip>How to combine values within each category. Sum adds them up, Mean averages them, Count counts records, Min/Max finds extremes.</HelpTip>
                    </label>
                    <select v-model="config.aggregation"
                        class="block w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                        <option value="sum">Sum</option>
                        <option value="mean">Mean</option>
                        <option value="count">Count</option>
                        <option value="min">Min</option>
                        <option value="max">Max</option>
                        <option value="median">Median</option>
                    </select>
                </div>

                <!-- Sort -->
                <div v-if="config.chartType !== 'scatter'">
                    <label class="block text-xs font-medium text-text-secondary mb-1">Sort by
                        <HelpTip>Order results by their aggregated value (highest/lowest first) or alphabetically by label name.</HelpTip>
                    </label>
                    <div class="flex gap-1">
                        <select v-model="config.sortBy"
                            class="flex-1 rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                            <option value="value">Value</option>
                            <option value="label">Label</option>
                        </select>
                        <select v-model="config.sortOrder"
                            class="w-20 rounded-lg bg-surface border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                            <option value="desc">Desc</option>
                            <option value="asc">Asc</option>
                        </select>
                    </div>
                </div>

                <!-- Limit -->
                <div v-if="config.chartType !== 'scatter'">
                    <label class="block text-xs font-medium text-text-secondary mb-1">Max categories
                        <HelpTip>Limit the number of categories shown. Useful when a field has many unique values to keep the chart readable.</HelpTip>
                    </label>
                    <input v-model.number="config.limit" type="number" min="1" max="100"
                        class="block w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                </div>
            </div>

            <!-- Active filters indicator -->
            <div v-if="filters && filters.length > 0"
                class="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
                <span class="font-medium">Active filters:</span>
                <span v-for="(f, i) in filters" :key="i"
                    class="inline-flex items-center px-1.5 py-0.5 rounded bg-accent-subtle text-accent text-[10px]">
                    {{ f.field }} {{ f.operator }} {{ f.value }}
                </span>
            </div>

            <!-- Generate button -->
            <button @click="handleGenerate" :disabled="running || !canGenerate"
                class="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                <svg v-if="running" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {{ running ? 'Generating...' : 'Generate Chart' }}
            </button>
        </div>

        <!-- Error -->
        <div v-if="result?.error" class="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {{ result.error }}
        </div>

        <!-- Chart result -->
        <div v-if="result && !result.error && result.chartData"
            class="bg-surface-elevated rounded-xl border border-border overflow-hidden">
            <!-- Chart header with export buttons -->
            <div class="flex items-center justify-between px-4 py-3 border-b border-border-light">
                <h3 class="text-sm font-medium text-text-primary">{{ result.title || 'Chart' }}</h3>
                <div class="flex gap-2">
                    <button @click="exportAsImage"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Export PNG
                    </button>
                    <button @click="exportCsv"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export CSV
                    </button>
                </div>
            </div>

            <!-- Chart canvas -->
            <div class="p-4">
                <canvas ref="chartCanvas" class="max-h-96"></canvas>
            </div>

            <!-- Stats summary -->
            <div v-if="result.stats" class="px-4 pb-4 flex flex-wrap gap-2">
                <div v-for="(val, key) in result.stats" :key="key"
                    class="px-2.5 py-1.5 rounded-lg bg-surface border border-border">
                    <span class="text-xs font-semibold text-text-primary">{{ formatValue(val) }}</span>
                    <span class="text-[10px] text-text-muted ml-1">{{ formatLabel(key as string) }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted, h } from 'vue';
import { Chart, registerables } from 'chart.js';
import type { DatasetField } from '../../services/datasets/useDatasets';
import HelpTip from '../ui/HelpTip.vue';

Chart.register(...registerables);

const props = defineProps<{
    schema: DatasetField[];
    result: any | null;
    running: boolean;
    filters?: { field: string; operator: string; value: string }[];
}>();

const emit = defineEmits<{
    run: [operation: string, params: Record<string, any>];
}>();

const chartTypes = [
    { id: 'bar', label: 'Bar', icon: { render: () => h('svg', { viewBox: '0 0 16 16', fill: 'currentColor' }, [h('rect', { x: 1, y: 8, width: 3, height: 7 }), h('rect', { x: 6, y: 3, width: 3, height: 12 }), h('rect', { x: 11, y: 6, width: 3, height: 9 })]) } },
    { id: 'line', label: 'Line', icon: { render: () => h('svg', { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [h('polyline', { points: '1,12 5,6 9,9 15,3' })]) } },
    { id: 'pie', label: 'Pie', icon: { render: () => h('svg', { viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5 }, [h('circle', { cx: 8, cy: 8, r: 6 }), h('path', { d: 'M8 2v6h6', fill: 'currentColor', stroke: 'none', opacity: 0.3 })]) } },
    { id: 'scatter', label: 'Scatter', icon: { render: () => h('svg', { viewBox: '0 0 16 16', fill: 'currentColor' }, [h('circle', { cx: 3, cy: 11, r: 1.5 }), h('circle', { cx: 6, cy: 7, r: 1.5 }), h('circle', { cx: 10, cy: 5, r: 1.5 }), h('circle', { cx: 13, cy: 9, r: 1.5 })]) } },
];

const config = ref({
    chartType: 'bar',
    xField: '',
    yField: '',
    aggregation: 'sum',
    sortBy: 'value',
    sortOrder: 'desc',
    limit: 20,
});

const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const numericFields = computed(() => props.schema.filter(f => f.type === 'number'));
const availableXFields = computed(() => {
    if (config.value.chartType === 'scatter') {
        return props.schema.filter(f => f.type === 'number');
    }
    return props.schema;
});

const canGenerate = computed(() => {
    if (!config.value.xField) return false;
    if (config.value.chartType === 'scatter' && !config.value.yField) return false;
    return true;
});

const handleGenerate = () => {
    const params: Record<string, any> = {
        chartType: config.value.chartType,
        xField: config.value.xField,
    };
    if (config.value.yField) params.yField = config.value.yField;
    if (config.value.chartType !== 'scatter') {
        params.aggregation = config.value.yField ? config.value.aggregation : 'count';
        params.sortBy = config.value.sortBy;
        params.sortOrder = config.value.sortOrder;
        params.limit = config.value.limit;
    }
    emit('run', 'chart', params);
};

// Chart rendering
watch(() => props.result, async (newResult) => {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }

    if (!newResult || !newResult.chartData || newResult.error) return;

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
                datasets: [{
                    label: newResult.title || 'Data',
                    data: data.points,
                    backgroundColor: 'rgba(99, 102, 241, 0.5)',
                    pointRadius: 4,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { title: { display: true, text: newResult.xLabel || '' } },
                    y: { title: { display: true, text: newResult.yLabel || '' } },
                },
            },
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
                    label: newResult.yLabel || newResult.title || 'Value',
                    data: data.values,
                    backgroundColor: bgColor,
                    borderColor: chartType === 'line' ? 'rgba(99, 102, 241, 0.8)' : undefined,
                    borderWidth: chartType === 'line' ? 2 : 1,
                    fill: chartType === 'line' ? false : undefined,
                    tension: chartType === 'line' ? 0.3 : undefined,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: chartType === 'pie' ? {} : {
                    x: { title: { display: true, text: newResult.xLabel || '' } },
                    y: { title: { display: true, text: newResult.yLabel || '' } },
                },
            },
        });
    }
}, { deep: true });

onUnmounted(() => {
    if (chartInstance) chartInstance.destroy();
});

const exportAsImage = () => {
    if (!chartCanvas.value) return;
    const url = chartCanvas.value.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `chart-${Date.now()}.png`;
    link.href = url;
    link.click();
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
        td.rows.forEach((row: any[]) => {
            csv += row.map((v: any) => `"${v}"`).join(',') + '\n';
        });
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `chart-data-${Date.now()}.csv`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
};

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
</script>
