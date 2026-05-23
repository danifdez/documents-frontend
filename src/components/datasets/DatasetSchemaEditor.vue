<template>
    <div class="space-y-3">
        <div class="flex items-center gap-2 flex-wrap">
            <button @click="addField"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent hover:text-accent-dark hover:bg-accent-subtle rounded-lg transition-colors cursor-pointer">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add field
            </button>
            <button v-if="extractionEnabled" @click="suggestColumns" :disabled="suggesting || !canSuggest"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border text-text-secondary rounded-lg hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                :title="canSuggest ? '' : 'Pick at least one source resource first.'">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {{ suggesting ? 'Reading sources... (≈30s)' : 'Suggest columns from sources' }}
            </button>
        </div>

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

            <!-- Description (used by tabular extraction) -->
            <div class="ml-1">
                <label class="block text-xs font-medium text-text-muted mb-1">Description (plain text)</label>
                <textarea v-model="field.description" rows="2"
                    placeholder="What to extract from each source. Example: 'Total number of participants in the study, excluding dropouts'."
                    class="block w-full rounded-lg bg-surface-elevated border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-y"></textarea>
                <p v-if="extractionEnabled && !(field.description && field.description.trim())"
                    class="mt-1 text-xs text-amber-600">
                    Without a description, this column will be skipped during extraction.
                </p>
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
            <div v-if="datasets.length > 0" class="ml-1">
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

        <SuggestedColumnsModal :is-open="showSuggestions" :suggestions="suggestions" :existing-keys="existingKeys"
            @close="showSuggestions = false" @add="addSuggested" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { DatasetField, Dataset, DatasetSourceMode } from '../../services/datasets/useDatasets';
import { useDatasets } from '../../services/datasets/useDatasets';
import apiClient from '../../services/api';
import SuggestedColumnsModal from './SuggestedColumnsModal.vue';

const fields = defineModel<DatasetField[]>({ required: true });
const props = defineProps<{
    sourceMode?: DatasetSourceMode;
    sourceConfig?: Record<string, any>;
    projectId?: number | null;
}>();

const datasets = ref<Dataset[]>([]);
const { proposeColumns, getProposeColumnsResult } = useDatasets();

const extractionEnabled = computed(() => (props.sourceMode ?? 'manual') !== 'manual');
const existingKeys = computed(() => new Set(fields.value.map((f) => f.key)));
const canSuggest = computed(() => {
    if (props.sourceMode === 'resource_selection') {
        const ids = (props.sourceConfig?.resourceIds ?? []) as number[];
        return ids.length > 0;
    }
    if (props.sourceMode === 'project_resources') {
        return !!props.projectId;
    }
    return false;
});

const suggesting = ref(false);
const showSuggestions = ref(false);
const suggestions = ref<DatasetField[]>([]);

const suggestColumns = async () => {
    if (!canSuggest.value) return;
    suggesting.value = true;
    suggestions.value = [];
    try {
        let resourceIds: number[] = [];
        if (props.sourceMode === 'resource_selection') {
            resourceIds = (props.sourceConfig?.resourceIds ?? []) as number[];
        } else if (props.sourceMode === 'project_resources' && props.projectId) {
            const resp = await apiClient.get(`/resources/project/${props.projectId}`);
            const all: any[] = Array.isArray(resp.data) ? resp.data : [];
            const filters: string[] = props.sourceConfig?.resourceTypeFilter ?? [];
            const matched = filters.length > 0
                ? all.filter((r) => filters.some((f) => f.endsWith('/') ? (r.mimeType || '').startsWith(f) : r.mimeType === f))
                : all;
            resourceIds = matched.slice(0, 3).map((r) => r.id);
        }
        if (!resourceIds.length) {
            suggesting.value = false;
            return;
        }
        const { jobId } = await proposeColumns(resourceIds, props.projectId ?? undefined);
        if (!jobId) {
            suggesting.value = false;
            return;
        }
        const deadline = Date.now() + 60_000;
        // Poll until completion or timeout
        // eslint-disable-next-line no-constant-condition
        while (true) {
            await new Promise((r) => setTimeout(r, 2000));
            const { status, result } = await getProposeColumnsResult(jobId);
            if (status === 'completed' || status === 'processed') {
                const cols = (result?.columns ?? []) as DatasetField[];
                suggestions.value = cols;
                showSuggestions.value = true;
                break;
            }
            if (status === 'failed') break;
            if (Date.now() > deadline) break;
        }
    } finally {
        suggesting.value = false;
    }
};

const addSuggested = (selected: DatasetField[]) => {
    const existing = new Set(fields.value.map((f) => f.key));
    for (const col of selected) {
        if (col.key && !existing.has(col.key)) {
            fields.value.push({ ...col });
            existing.add(col.key);
        }
    }
    showSuggestions.value = false;
};

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
    // Only auto-generate key for new fields (no existing key)
    if (!field.key) {
        field.key = field.name
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '');
    }
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
        field.linkedLookupField = '';
        field.linkedDisplayField = '';
    }
};

const getLinkedFields = (datasetId: number | undefined): DatasetField[] => {
    if (!datasetId) return [];
    const ds = datasets.value.find(d => d.id === datasetId);
    return ds?.schema || [];
};
</script>
