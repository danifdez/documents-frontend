<template>
    <div class="dataset-view-node my-3 rounded-xl border border-border bg-surface-elevated overflow-hidden select-none">
        <!-- Header -->
        <div class="flex items-center justify-between px-4 py-2.5 bg-surface border-b border-border">
            <div class="flex items-center gap-2">
                <svg class="h-4 w-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                <span class="text-sm font-semibold text-text-primary">{{ datasetName }}</span>
                <span v-if="activeFilters.length > 0"
                    class="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-accent-subtle text-accent">
                    {{ activeFilters.length }} filter{{ activeFilters.length > 1 ? 's' : '' }}
                </span>
                <span class="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                    Live
                </span>
            </div>
            <div class="flex items-center gap-1">
                <button @click="loadData" :disabled="loading"
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

        <!-- Filter badges -->
        <div v-if="activeFilters.length > 0" class="px-4 py-1.5 bg-surface-hover/50 border-b border-border-light flex flex-wrap gap-1">
            <span v-for="(f, i) in activeFilters" :key="i"
                class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-surface border border-border-light text-text-muted">
                {{ f.field }} {{ operatorLabel(f.operator) }} {{ f.value }}
            </span>
        </div>

        <!-- Loading -->
        <div v-if="loading && records.length === 0" class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="px-4 py-4 text-sm text-red-500 text-center">{{ error }}</div>

        <!-- Empty -->
        <div v-else-if="records.length === 0" class="px-4 py-6 text-sm text-text-muted text-center">
            No records found
        </div>

        <!-- Data table -->
        <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b border-border bg-surface">
                        <th v-for="field in visibleFields" :key="field"
                            class="px-3 py-2 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap">
                            {{ field }}
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-border-light">
                    <tr v-for="record in records" :key="record.id" class="hover:bg-surface-hover/50">
                        <td v-for="field in visibleFields" :key="field"
                            class="px-3 py-1.5 text-text-primary whitespace-nowrap">
                            {{ formatValue(record.data[field]) }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Footer -->
        <div v-if="total > 0" class="px-4 py-1.5 border-t border-border bg-surface text-[10px] text-text-muted">
            {{ records.length }} of {{ total }} records
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import apiClient from '../../services/api';

const props = defineProps<{
    datasetId: number;
    datasetName: string;
    fields: string;
    filters: string;
    editable: boolean;
}>();

const records = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const error = ref<string | null>(null);

const visibleFields = computed(() => {
    try { return JSON.parse(props.fields); }
    catch { return []; }
});

const activeFilters = computed(() => {
    try { return JSON.parse(props.filters); }
    catch { return []; }
});

const operatorLabel = (op: string) => {
    const map: Record<string, string> = { eq: '=', gt: '>', gte: '>=', lt: '<', lte: '<=', contains: '~' };
    return map[op] || op;
};

const formatValue = (val: any) => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return String(val);
};

const loadData = async () => {
    if (!props.datasetId) return;
    loading.value = true;
    error.value = null;
    try {
        const params: Record<string, any> = { limit: 100 };
        for (const f of activeFilters.value) {
            params[`filter[${f.field}_${f.operator}]`] = f.value;
        }
        const response = await apiClient.get(`/datasets/${props.datasetId}/records`, { params });
        const data = response.data;
        records.value = data.records || data;
        total.value = data.total || records.value.length;
    } catch (err: any) {
        error.value = err.response?.data?.message || 'Failed to load data';
    } finally {
        loading.value = false;
    }
};

onMounted(() => loadData());
</script>
