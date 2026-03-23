<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="modelValue"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div class="bg-surface-elevated rounded-xl shadow-2xl shadow-black/10 border border-border max-w-lg w-full mx-4 overflow-hidden">
                    <div class="px-6 py-4 border-b border-border-light">
                        <h3 class="text-base font-semibold text-text-primary tracking-tight">Insert Dataset View</h3>
                        <p class="text-xs text-text-muted mt-0.5">Embed a live data table in your document</p>
                    </div>

                    <div class="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
                        <!-- Dataset selector -->
                        <div>
                            <label class="block text-xs font-medium text-text-secondary mb-1.5">Dataset *</label>
                            <select v-model="selectedDatasetId"
                                class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                                <option :value="0" disabled>Select a dataset...</option>
                                <option v-for="ds in datasets" :key="ds.id" :value="ds.id">{{ ds.name }}</option>
                            </select>
                        </div>

                        <!-- Fields selector -->
                        <div v-if="selectedSchema.length > 0">
                            <label class="block text-xs font-medium text-text-secondary mb-1.5">Fields to display</label>
                            <div class="space-y-1">
                                <label v-for="field in selectedSchema" :key="field.key"
                                    class="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:bg-surface-hover rounded px-2 py-1 transition-colors">
                                    <input type="checkbox" :value="field.key" v-model="selectedFields"
                                        class="rounded border-border text-accent focus:ring-accent/20" />
                                    {{ field.name }}
                                    <span class="text-[10px] text-text-muted">({{ field.type }})</span>
                                </label>
                            </div>
                            <button @click="toggleAllFields"
                                class="mt-1 text-xs text-accent hover:text-accent-dark cursor-pointer">
                                {{ selectedFields.length === selectedSchema.length ? 'Deselect all' : 'Select all' }}
                            </button>
                        </div>

                        <!-- Filters -->
                        <div v-if="selectedSchema.length > 0">
                            <label class="block text-xs font-medium text-text-secondary mb-1.5">Filters (optional)</label>
                            <div class="space-y-2">
                                <div v-for="(filter, index) in filters" :key="index"
                                    class="flex items-center gap-2">
                                    <select v-model="filter.field"
                                        class="flex-1 rounded-lg bg-surface border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                                        <option value="">Field...</option>
                                        <option v-for="f in selectedSchema" :key="f.key" :value="f.key">{{ f.name }}</option>
                                    </select>
                                    <select v-model="filter.operator"
                                        class="w-20 rounded-lg bg-surface border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                                        <option value="eq">=</option>
                                        <option value="contains">~</option>
                                        <option value="gt">&gt;</option>
                                        <option value="gte">&gt;=</option>
                                        <option value="lt">&lt;</option>
                                        <option value="lte">&lt;=</option>
                                    </select>
                                    <input v-model="filter.value" type="text" placeholder="Value"
                                        class="flex-1 rounded-lg bg-surface border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                                    <button @click="filters.splice(index, 1)"
                                        class="p-1 rounded text-text-muted hover:text-red-500 cursor-pointer">
                                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <button @click="filters.push({ field: '', operator: 'eq', value: '' })"
                                class="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:text-accent-dark cursor-pointer">
                                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                Add filter
                            </button>
                        </div>
                    </div>

                    <div class="px-6 py-4 border-t border-border-light flex justify-end gap-2.5">
                        <Button @click="close" variant="secondary">Cancel</Button>
                        <Button @click="handleInsert" variant="info"
                            :disabled="!selectedDatasetId || selectedFields.length === 0">
                            Insert
                        </Button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import apiClient from '../../services/api';
import Button from '../ui/Button.vue';

const modelValue = defineModel<boolean>({ required: true });

const emit = defineEmits<{
    insert: [config: {
        datasetId: number;
        datasetName: string;
        fields: string[];
        filters: { field: string; operator: string; value: string }[];
    }];
}>();

interface DatasetInfo {
    id: number;
    name: string;
    schema: { key: string; name: string; type: string }[];
}

const datasets = ref<DatasetInfo[]>([]);
const selectedDatasetId = ref(0);
const selectedFields = ref<string[]>([]);
const filters = ref<{ field: string; operator: string; value: string }[]>([]);

const selectedSchema = computed(() => {
    const ds = datasets.value.find(d => d.id === selectedDatasetId.value);
    return ds?.schema || [];
});

watch(modelValue, async (open) => {
    if (open) {
        selectedDatasetId.value = 0;
        selectedFields.value = [];
        filters.value = [];
        try {
            const response = await apiClient.get('/datasets');
            datasets.value = response.data;
        } catch { /* ignore */ }
    }
});

watch(selectedDatasetId, () => {
    // Auto-select all fields when dataset changes
    selectedFields.value = selectedSchema.value.map(f => f.key);
});

const toggleAllFields = () => {
    if (selectedFields.value.length === selectedSchema.value.length) {
        selectedFields.value = [];
    } else {
        selectedFields.value = selectedSchema.value.map(f => f.key);
    }
};

const close = () => {
    modelValue.value = false;
};

const handleInsert = () => {
    const ds = datasets.value.find(d => d.id === selectedDatasetId.value);
    if (!ds) return;

    const validFilters = filters.value.filter(f => f.field && f.value);

    emit('insert', {
        datasetId: ds.id,
        datasetName: ds.name,
        fields: selectedFields.value,
        filters: validFilters,
    });

    close();
};
</script>

<style scoped>
.modal-enter-active { transition: opacity 0.2s ease; }
.modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
