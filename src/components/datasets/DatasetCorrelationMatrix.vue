<template>
    <div class="space-y-4">
        <!-- Configuration -->
        <div class="bg-surface-elevated rounded-xl border border-border p-4 space-y-3">
            <div>
                <label class="block text-xs font-medium text-text-secondary mb-1.5">Numeric fields to include
                    <HelpTip>Select which numeric fields to compare. The matrix shows the Pearson correlation (r) between each pair: values near +1 indicate strong positive relationship, near -1 strong negative, near 0 no linear relationship.</HelpTip>
                </label>
                <div class="flex flex-wrap gap-1.5">
                    <label v-for="f in numericFields" :key="f.key"
                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs cursor-pointer transition-colors"
                        :class="selectedFields.includes(f.key)
                            ? 'bg-accent text-white'
                            : 'bg-surface border border-border text-text-secondary hover:bg-surface-hover'">
                        <input type="checkbox" :value="f.key" v-model="selectedFields" class="hidden" />
                        {{ f.name }}
                    </label>
                </div>
                <button v-if="numericFields.length > 2" @click="toggleAll"
                    class="mt-1.5 text-xs text-accent hover:text-accent-dark cursor-pointer">
                    {{ selectedFields.length === numericFields.length ? 'Deselect all' : 'Select all' }}
                </button>
            </div>
            <button @click="handleRun" :disabled="running || selectedFields.length < 2"
                class="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                <svg v-if="running" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {{ running ? 'Computing...' : 'Compute Matrix' }}
            </button>
        </div>

        <!-- Error -->
        <div v-if="result?.error" class="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {{ result.error }}
        </div>

        <!-- Results -->
        <template v-if="result && !result.error && result.chartData?.matrix">
            <!-- Strong correlations summary -->
            <div v-if="result.stats?.strongCorrelations?.length > 0" class="flex flex-wrap gap-2">
                <div v-for="(sc, i) in result.stats.strongCorrelations" :key="i"
                    class="px-3 py-2 rounded-lg border border-border text-xs"
                    :class="sc.correlation > 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'">
                    <span class="font-semibold" :class="sc.correlation > 0 ? 'text-blue-700' : 'text-red-700'">
                        r={{ sc.correlation.toFixed(2) }}
                    </span>
                    <span class="text-text-muted ml-1">{{ sc.field1Name }} &harr; {{ sc.field2Name }}</span>
                    <span v-if="sc.pValue < 0.05" class="ml-1 text-green-600">*</span>
                </div>
            </div>

            <!-- Heatmap table -->
            <div class="bg-surface-elevated rounded-xl border border-border overflow-hidden">
                <div class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface">
                    <span class="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                        Correlation Matrix ({{ result.chartData.fields.length }} fields)
                    </span>
                    <div class="flex gap-2">
                        <button @click="exportPng"
                            class="text-xs text-accent hover:text-accent-dark cursor-pointer transition-colors">
                            Export PNG
                        </button>
                        <button @click="exportCsv"
                            class="text-xs text-accent hover:text-accent-dark cursor-pointer transition-colors">
                            Export CSV
                        </button>
                    </div>
                </div>
                <div class="overflow-auto" ref="matrixRef">
                    <table class="text-xs w-full">
                        <thead>
                            <tr>
                                <th class="px-3 py-2 text-left font-medium text-text-muted bg-surface sticky left-0 z-10 border-b border-r border-border"></th>
                                <th v-for="f in result.chartData.fields" :key="f.key"
                                    class="px-3 py-2 text-center font-medium text-text-muted bg-surface border-b border-border whitespace-nowrap">
                                    {{ f.name }}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(row, i) in result.chartData.matrix" :key="i">
                                <td class="px-3 py-2 font-medium text-text-primary bg-surface sticky left-0 z-10 border-r border-border whitespace-nowrap">
                                    {{ result.chartData.fields[i].name }}
                                </td>
                                <td v-for="(val, j) in row" :key="j"
                                    class="px-3 py-2 text-center font-mono cursor-pointer transition-all hover:ring-2 hover:ring-accent/40 hover:z-20 relative"
                                    :style="{ backgroundColor: cellColor(val), color: cellTextColor(val) }"
                                    :title="cellTooltip(i, j)"
                                    @click="handleCellClick(i, j)">
                                    {{ val !== null ? val.toFixed(2) : '—' }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <!-- Color legend -->
                <div class="px-4 py-2 border-t border-border bg-surface flex items-center gap-3 text-[10px] text-text-muted">
                    <div class="flex items-center gap-1">
                        <div class="w-4 h-3 rounded" style="background: rgba(239, 68, 68, 0.7)"></div>
                        <span>-1.0</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <div class="w-4 h-3 rounded" style="background: rgba(255, 255, 255, 1)"></div>
                        <span>0</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <div class="w-4 h-3 rounded" style="background: rgba(59, 130, 246, 0.7)"></div>
                        <span>+1.0</span>
                    </div>
                    <span class="ml-auto">Click a cell to view scatter plot</span>
                </div>
            </div>

            <!-- Scatter detail -->
            <div v-if="scatterResult && !scatterResult.error"
                class="bg-surface-elevated rounded-xl border border-border overflow-hidden">
                <div class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface">
                    <span class="text-sm font-medium text-text-primary">
                        {{ scatterResult.field1Name }} vs {{ scatterResult.field2Name }}
                        <span class="text-text-muted ml-2 text-xs">
                            r={{ scatterResult.stats?.correlation?.toFixed(3) }},
                            p={{ scatterResult.stats?.pValue?.toFixed(4) }}
                        </span>
                    </span>
                    <button @click="scatterResult = null"
                        class="p-1 rounded text-text-muted hover:text-text-primary cursor-pointer">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div class="p-4">
                    <canvas ref="scatterCanvas" class="max-h-72"></canvas>
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
const selectedFields = ref<string[]>([]);
const scatterResult = ref<any>(null);
const matrixRef = ref<HTMLElement | null>(null);
const scatterCanvas = ref<HTMLCanvasElement | null>(null);
let scatterChart: Chart | null = null;

// Default: select all numeric fields
watch(() => props.schema, () => {
    selectedFields.value = numericFields.value.map(f => f.key);
}, { immediate: true });

const toggleAll = () => {
    if (selectedFields.value.length === numericFields.value.length) {
        selectedFields.value = [];
    } else {
        selectedFields.value = numericFields.value.map(f => f.key);
    }
};

const handleRun = () => {
    scatterResult.value = null;
    emit('run', 'correlation_matrix', { fields: selectedFields.value });
};

const cellColor = (val: number | null): string => {
    if (val === null) return 'transparent';
    const abs = Math.abs(val);
    if (val > 0) return `rgba(59, 130, 246, ${abs * 0.7})`;
    if (val < 0) return `rgba(239, 68, 68, ${abs * 0.7})`;
    return 'rgba(255, 255, 255, 1)';
};

const cellTextColor = (val: number | null): string => {
    if (val === null) return 'inherit';
    return Math.abs(val) > 0.6 ? 'white' : 'inherit';
};

const cellTooltip = (i: number, j: number): string => {
    if (!props.result?.chartData) return '';
    const fields = props.result.chartData.fields;
    const r = props.result.chartData.matrix[i][j];
    const p = props.result.chartData.pValues[i][j];
    if (r === null) return 'Insufficient data';
    return `${fields[i].name} ↔ ${fields[j].name}\nr = ${r.toFixed(4)}\np = ${p?.toFixed(4) ?? '—'}${p !== null && p < 0.05 ? ' (significant)' : ''}`;
};

const handleCellClick = (i: number, j: number) => {
    if (i === j || !props.result?.chartData) return;
    const fields = props.result.chartData.fields;
    emit('run', 'correlation', { field1: fields[i].key, field2: fields[j].key });
};

// Render scatter when correlation result comes through
watch(() => props.result, async (newResult) => {
    if (newResult && newResult.operation === 'correlation' && newResult.chartData?.points) {
        scatterResult.value = newResult;
        if (scatterChart) { scatterChart.destroy(); scatterChart = null; }
        await nextTick();
        if (!scatterCanvas.value) return;
        const ctx = scatterCanvas.value.getContext('2d');
        if (!ctx) return;
        scatterChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: `${newResult.field1Name} vs ${newResult.field2Name}`,
                        data: newResult.chartData.points,
                        backgroundColor: 'rgba(99, 102, 241, 0.5)',
                        pointRadius: 4,
                    },
                    ...(newResult.chartData.regression ? [{
                        label: 'Regression',
                        type: 'line' as const,
                        data: [
                            { x: newResult.chartData.regression.xRange[0], y: newResult.chartData.regression.slope * newResult.chartData.regression.xRange[0] + newResult.chartData.regression.intercept },
                            { x: newResult.chartData.regression.xRange[1], y: newResult.chartData.regression.slope * newResult.chartData.regression.xRange[1] + newResult.chartData.regression.intercept },
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
    }
}, { deep: true });

onUnmounted(() => { if (scatterChart) scatterChart.destroy(); });

const exportCsv = () => {
    if (!props.result?.chartData) return;
    const fields = props.result.chartData.fields;
    const matrix = props.result.chartData.matrix;
    let csv = ',' + fields.map((f: any) => `"${f.name}"`).join(',') + '\n';
    matrix.forEach((row: any[], i: number) => {
        csv += `"${fields[i].name}",` + row.map((v: any) => v !== null ? v.toFixed(4) : '').join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'correlation_matrix.csv'; a.click();
    URL.revokeObjectURL(url);
};

const exportPng = () => {
    // Export scatter canvas if available, otherwise render matrix to canvas
    if (scatterCanvas.value) {
        const url = scatterCanvas.value.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url; a.download = 'correlation_matrix.png'; a.click();
        return;
    }
    if (!props.result?.chartData) return;
    const fields = props.result.chartData.fields;
    const matrix = props.result.chartData.matrix;
    const n = fields.length;
    const cellSize = 60;
    const labelW = 100;
    const canvas = document.createElement('canvas');
    canvas.width = labelW + n * cellSize;
    canvas.height = labelW + n * cellSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Column headers
    fields.forEach((f: any, j: number) => {
        ctx.fillStyle = '#666';
        ctx.fillText(f.name.slice(0, 10), labelW + j * cellSize + cellSize / 2, labelW / 2);
    });
    // Rows
    matrix.forEach((row: any[], i: number) => {
        ctx.fillStyle = '#333';
        ctx.textAlign = 'right';
        ctx.fillText(fields[i].name.slice(0, 12), labelW - 6, labelW + i * cellSize + cellSize / 2);
        row.forEach((val: number | null, j: number) => {
            const x = labelW + j * cellSize;
            const y = labelW + i * cellSize;
            ctx.fillStyle = val !== null ? cellColor(val) : '#f5f5f5';
            ctx.fillRect(x, y, cellSize, cellSize);
            ctx.strokeStyle = '#ddd';
            ctx.strokeRect(x, y, cellSize, cellSize);
            ctx.fillStyle = val !== null && Math.abs(val) > 0.6 ? '#fff' : '#333';
            ctx.textAlign = 'center';
            ctx.fillText(val !== null ? val.toFixed(2) : '—', x + cellSize / 2, y + cellSize / 2);
        });
    });
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = 'correlation_matrix.png'; a.click();
};
</script>
