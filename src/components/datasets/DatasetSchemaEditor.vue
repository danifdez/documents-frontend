<template>
    <div class="space-y-3">
        <div v-for="(field, index) in fields" :key="index"
            class="p-3 rounded-lg bg-surface border border-border-light space-y-2">
            <div class="flex items-start gap-2">
                <div class="flex-1 grid grid-cols-[1fr_8rem_4rem] gap-2 items-center">
                    <input v-model="field.name" type="text" placeholder="Field name"
                        @input="generateKey(field)"
                        class="block w-full rounded-lg bg-surface-elevated border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                    <select v-model="field.type"
                        class="block w-full rounded-lg bg-surface-elevated border border-border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="date">Date</option>
                        <option value="datetime">Datetime</option>
                        <option value="time">Time</option>
                        <option value="select">Select</option>
                    </select>
                    <label class="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
                        <input type="checkbox" v-model="field.required"
                            class="rounded border-border text-accent focus:ring-accent/20" />
                        Req.
                    </label>
                </div>
                <button @click="removeField(index)"
                    class="p-1.5 rounded text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer shrink-0 mt-0.5"
                    title="Remove field">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Select options editor -->
            <div v-if="field.type === 'select'" class="ml-1">
                <label class="block text-xs font-medium text-text-muted mb-1">Options for "{{ field.name || 'Unnamed'
                    }}" (comma-separated)</label>
                <input :value="(field.options || []).join(', ')"
                    @input="updateOptions(field, ($event.target as HTMLInputElement).value)" type="text"
                    placeholder="Option 1, Option 2, Option 3"
                    class="block w-full rounded-lg bg-surface-elevated border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
            </div>

            <!-- Linked dataset config -->
            <div v-if="field.type === 'number' && datasets.length > 0" class="ml-1">
                <label class="flex items-center gap-2 text-xs text-text-secondary cursor-pointer"
                    @click="toggleLink(field)">
                    <svg class="h-3.5 w-3.5" :class="field.linkedDatasetId ? 'text-accent' : 'text-text-muted'"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    {{ field.linkedDatasetId ? 'Linked to dataset' : 'Link to another dataset (FK)' }}
                </label>
                <div v-if="field.linkedDatasetId" class="grid grid-cols-3 gap-2 mt-1.5">
                    <select v-model="field.linkedDatasetId"
                        class="rounded-lg bg-surface-elevated border border-border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                        <option :value="undefined">No link</option>
                        <option v-for="ds in datasets" :key="ds.id" :value="ds.id">{{ ds.name }}</option>
                    </select>
                    <select v-model="field.linkedLookupField"
                        title="Field in the target dataset to match against (leave empty to match by record ID)"
                        class="rounded-lg bg-surface-elevated border border-border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                        <option value="">Match by record ID</option>
                        <option v-for="f in getLinkedFields(field.linkedDatasetId)" :key="f.key" :value="f.key">
                            Match by {{ f.name }}
                        </option>
                    </select>
                    <select v-model="field.linkedDisplayField"
                        title="Field to display in the table instead of the raw value"
                        class="rounded-lg bg-surface-elevated border border-border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                        <option value="">Show first text field</option>
                        <option v-for="f in getLinkedFields(field.linkedDatasetId)" :key="f.key" :value="f.key">
                            Show {{ f.name }}
                        </option>
                    </select>
                </div>
            </div>
        </div>

        <button @click="addField"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent hover:text-accent-dark hover:bg-accent-subtle rounded-lg transition-colors cursor-pointer">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add field
        </button>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { DatasetField, Dataset } from '../../services/datasets/useDatasets';
import apiClient from '../../services/api';

const fields = defineModel<DatasetField[]>({ required: true });

const datasets = ref<Dataset[]>([]);

onMounted(async () => {
    try {
        const response = await apiClient.get('/datasets');
        datasets.value = response.data;
    } catch { /* ignore */ }
});

const addField = () => {
    fields.value.push({ key: '', name: '', type: 'text', required: false });
};

const removeField = (index: number) => {
    fields.value.splice(index, 1);
};

const generateKey = (field: DatasetField) => {
    field.key = field.name
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
};

const updateOptions = (field: DatasetField, value: string) => {
    field.options = value.split(',').map(o => o.trim()).filter(o => o.length > 0);
};

const toggleLink = (field: DatasetField) => {
    if (field.linkedDatasetId) {
        field.linkedDatasetId = undefined;
        field.linkedDisplayField = undefined;
    } else {
        field.linkedDatasetId = datasets.value[0]?.id;
        field.linkedDisplayField = '';
    }
};

const getLinkedFields = (datasetId: number | undefined): DatasetField[] => {
    if (!datasetId) return [];
    const ds = datasets.value.find(d => d.id === datasetId);
    return ds?.schema || [];
};
</script>
