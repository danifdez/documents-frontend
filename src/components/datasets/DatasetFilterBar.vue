<template>
    <div class="space-y-2">
        <div v-for="(filter, index) in filters" :key="index"
            class="flex items-center gap-2">
            <select v-model="filter.field"
                class="rounded-lg bg-surface-elevated border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent w-36">
                <option value="">Field...</option>
                <option v-for="field in schema" :key="field.key" :value="field.key">{{ field.name }}</option>
            </select>

            <select v-model="filter.operator"
                class="rounded-lg bg-surface-elevated border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent w-28">
                <option value="eq">=</option>
                <option value="contains">contains</option>
                <option v-if="getFieldType(filter.field) === 'number'" value="gt">&gt;</option>
                <option v-if="getFieldType(filter.field) === 'number'" value="gte">&gt;=</option>
                <option v-if="getFieldType(filter.field) === 'number'" value="lt">&lt;</option>
                <option v-if="getFieldType(filter.field) === 'number'" value="lte">&lt;=</option>
            </select>

            <input v-model="filter.value" type="text" placeholder="Value..."
                class="flex-1 rounded-lg bg-surface-elevated border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                @keydown.enter="$emit('apply')" />

            <button @click="removeFilter(index)"
                class="p-1.5 rounded text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <div class="flex items-center gap-2">
            <button @click="addFilter"
                class="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-accent hover:text-accent-dark hover:bg-accent-subtle rounded-lg transition-colors cursor-pointer">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add filter
            </button>
            <button v-if="filters.length > 0" @click="$emit('apply')"
                class="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors cursor-pointer">
                Apply
            </button>
            <button v-if="filters.length > 0" @click="clearFilters"
                class="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-text-muted hover:text-text-secondary rounded-lg transition-colors cursor-pointer">
                Clear all
            </button>
        </div>

        <!-- Search -->
        <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input v-model="searchTerm" type="text" placeholder="Search across text fields..."
                class="block w-full pl-10 pr-4 py-2 rounded-lg bg-surface-elevated border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                @keydown.enter="$emit('search', searchTerm)" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { DatasetField } from '../../services/datasets/useDatasets';

const props = defineProps<{
    schema: DatasetField[];
}>();

export interface FilterItem {
    field: string;
    operator: string;
    value: string;
}

const filters = defineModel<FilterItem[]>('filters', { required: true });
const searchTerm = defineModel<string>('searchTerm', { default: '' });

defineEmits<{
    apply: [];
    search: [term: string];
}>();

const addFilter = () => {
    filters.value.push({ field: '', operator: 'eq', value: '' });
};

const removeFilter = (index: number) => {
    filters.value.splice(index, 1);
};

const clearFilters = () => {
    filters.value = [];
};

const getFieldType = (fieldKey: string): string => {
    const field = props.schema.find(f => f.key === fieldKey);
    return field?.type || 'text';
};
</script>
