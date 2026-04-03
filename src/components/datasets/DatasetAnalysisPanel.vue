<template>
    <div class="space-y-4">
        <!-- Operation selector -->
        <div class="flex items-center gap-1.5 flex-wrap">
            <button v-for="op in operations" :key="op.id" @click="selectedOp = op.id"
                :title="op.tooltip"
                class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                :class="selectedOp === op.id ? 'bg-accent text-white' : 'bg-surface-elevated border border-border text-text-secondary hover:bg-surface-hover'">
                {{ op.label }}
            </button>
        </div>

        <!-- Delegate to sub-panel -->
        <DatasetStatsPanel v-if="statsOps.includes(selectedOp)"
            :schema="schema" :result="result" :running="running"
            :selected-operation="selectedOp"
            @run="(op, params) => $emit('run', op, params)" />

        <DatasetCorrelationMatrix v-else-if="selectedOp === 'correlation'"
            :schema="schema" :result="result" :running="running"
            @run="(op, params) => $emit('run', op, params)" />

        <DatasetOutlierPanel v-else-if="selectedOp === 'outliers'"
            :schema="schema" :result="result" :running="running"
            @run="(op, params) => $emit('run', op, params)" />

        <DatasetPivotTable v-else-if="selectedOp === 'pivot'"
            :schema="schema" :result="result" :running="running"
            @run="(op, params) => $emit('run', op, params)" />
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { DatasetField } from '../../services/datasets/useDatasets';
import DatasetStatsPanel from './DatasetStatsPanel.vue';
import DatasetCorrelationMatrix from './DatasetCorrelationMatrix.vue';
import DatasetOutlierPanel from './DatasetOutlierPanel.vue';
import DatasetPivotTable from './DatasetPivotTable.vue';

defineProps<{
    schema: DatasetField[];
    result: Record<string, any> | null;
    running: boolean;
}>();

defineEmits<{
    run: [operation: string, params: Record<string, any>];
}>();

const statsOps = ['summary', 'distribution', 'time-series'];

const operations = [
    { id: 'summary', label: 'Summary', tooltip: 'Quick overview of all fields: counts, means, ranges, and top values' },
    { id: 'distribution', label: 'Distribution', tooltip: 'Histogram for numeric fields or frequency chart for categories' },
    { id: 'time-series', label: 'Time Series', tooltip: 'Track how a numeric value changes over time' },
    { id: 'correlation', label: 'Correlation', tooltip: 'Pearson correlation matrix between numeric fields' },
    { id: 'outliers', label: 'Outliers', tooltip: 'Detect outliers using IQR method and Z-scores' },
    { id: 'pivot', label: 'Pivot Table', tooltip: 'Cross-tabulation with custom aggregation functions' },
];

const selectedOp = ref('summary');
</script>
