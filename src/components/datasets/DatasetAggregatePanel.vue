<template>
    <div class="space-y-4">
        <div class="flex items-end gap-2">
            <div class="flex-1">
                <label class="block text-xs font-medium text-text-secondary mb-1">Function</label>
                <select v-model="fn"
                    class="block w-full rounded-lg bg-surface-elevated border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    <option value="count">Count</option>
                    <option value="sum">Sum</option>
                    <option value="avg">Average</option>
                    <option value="min">Min</option>
                    <option value="max">Max</option>
                </select>
            </div>
            <div class="flex-1">
                <label class="block text-xs font-medium text-text-secondary mb-1">Field</label>
                <select v-model="field"
                    class="block w-full rounded-lg bg-surface-elevated border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    <option value="">Select field...</option>
                    <option v-for="f in numericFields" :key="f.key" :value="f.key">{{ f.name }}</option>
                </select>
            </div>
            <div class="flex-1">
                <label class="block text-xs font-medium text-text-secondary mb-1">Group by (optional)</label>
                <select v-model="groupBy"
                    class="block w-full rounded-lg bg-surface-elevated border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                    <option value="">No grouping</option>
                    <option v-for="f in schema" :key="f.key" :value="f.key">{{ f.name }}</option>
                </select>
            </div>
            <button @click="handleRun" :disabled="!field && fn !== 'count'"
                class="px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
                Run
            </button>
        </div>

        <!-- Results -->
        <div v-if="results.length > 0" class="bg-surface-elevated rounded-lg border border-border overflow-hidden">
            <table class="w-full text-sm">
                <thead>
                    <tr class="bg-surface border-b border-border">
                        <th v-if="groupBy"
                            class="px-4 py-2 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                            {{ getFieldName(groupBy) }}
                        </th>
                        <th
                            class="px-4 py-2 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                            {{ fn.toUpperCase() }}({{ getFieldName(field) }})
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-border-light">
                    <tr v-for="(row, i) in results" :key="i" class="hover:bg-surface-hover transition-colors">
                        <td v-if="groupBy" class="px-4 py-2 text-text-primary">{{ row.group ?? '(empty)' }}</td>
                        <td class="px-4 py-2 text-text-primary font-medium">
                            {{ typeof row.value === 'number' ? Number(row.value).toLocaleString(undefined, { maximumFractionDigits: 2 }) : row.value }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { DatasetField, AggregateResult } from '../../services/datasets/useDatasets';

const props = defineProps<{
    schema: DatasetField[];
}>();

const emit = defineEmits<{
    aggregate: [field: string, fn: string, groupBy: string | undefined, callback: (results: AggregateResult[]) => void];
}>();

const fn = ref('count');
const field = ref('');
const groupBy = ref('');
const results = ref<AggregateResult[]>([]);

const numericFields = computed(() => props.schema.filter(f => f.type === 'number'));

const getFieldName = (key: string): string => {
    if (!key) return '*';
    return props.schema.find(f => f.key === key)?.name || key;
};

const handleRun = () => {
    emit('aggregate', field.value, fn.value, groupBy.value || undefined, (data) => {
        results.value = data;
    });
};
</script>
