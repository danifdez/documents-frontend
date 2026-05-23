<template>
    <div class="p-4 max-w-3xl space-y-4">
        <!-- Mode selector -->
        <div class="space-y-2">
            <label class="block text-xs font-semibold text-text-secondary uppercase tracking-wider">Source mode</label>
            <div class="space-y-2">
                <label class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
                    :class="sourceMode === 'manual' ? 'border-accent bg-accent-subtle' : 'border-border hover:bg-surface-hover'">
                    <input type="radio" name="sourceMode" value="manual" v-model="sourceMode" class="mt-0.5" />
                    <div>
                        <div class="text-sm font-medium text-text-primary">Manual</div>
                        <div class="text-xs text-text-muted">Add rows manually or via CSV import. No extraction.</div>
                    </div>
                </label>

                <label class="flex items-start gap-3 p-3 rounded-lg border transition-colors"
                    :class="[
                        sourceMode === 'project_resources' ? 'border-accent bg-accent-subtle' : 'border-border',
                        canUseProjectMode ? 'cursor-pointer hover:bg-surface-hover' : 'opacity-60 cursor-not-allowed'
                    ]"
                    :title="canUseProjectMode ? '' : 'This dataset is not linked to a project. Link it from the Schema tab first.'">
                    <input type="radio" name="sourceMode" value="project_resources" v-model="sourceMode" :disabled="!canUseProjectMode" class="mt-0.5" />
                    <div class="flex-1">
                        <div class="text-sm font-medium text-text-primary">All resources from this project</div>
                        <div class="text-xs text-text-muted">Extract one row per resource. Optionally filter by mime type.</div>
                    </div>
                </label>

                <label class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
                    :class="sourceMode === 'resource_selection' ? 'border-accent bg-accent-subtle' : 'border-border hover:bg-surface-hover'">
                    <input type="radio" name="sourceMode" value="resource_selection" v-model="sourceMode" class="mt-0.5" />
                    <div>
                        <div class="text-sm font-medium text-text-primary">Selected resources</div>
                        <div class="text-xs text-text-muted">Pick specific resources to extract from.</div>
                    </div>
                </label>
            </div>
        </div>

        <!-- Mode-specific config -->
        <div v-if="sourceMode === 'project_resources'" class="space-y-2 pl-2">
            <label class="block text-xs font-medium text-text-secondary">Filter by type (optional)</label>
            <div class="flex flex-wrap gap-2">
                <label v-for="t in mimeFilterChoices" :key="t.value"
                    class="inline-flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs cursor-pointer transition-colors"
                    :class="resourceTypeFilter.includes(t.value) ? 'border-accent bg-accent-subtle text-accent' : 'border-border text-text-secondary hover:bg-surface-hover'">
                    <input type="checkbox" :value="t.value" v-model="resourceTypeFilter" class="h-3 w-3" />
                    {{ t.label }}
                </label>
            </div>
            <p class="text-xs text-text-muted">
                {{ rowEstimate }}
            </p>
        </div>

        <div v-if="sourceMode === 'resource_selection'" class="space-y-2 pl-2">
            <label class="block text-xs font-medium text-text-secondary">Selected resources ({{ resourceIds.length }})</label>
            <div class="flex flex-wrap gap-2">
                <span v-for="id in resourceIds" :key="id"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-subtle text-accent text-xs">
                    {{ resourceTitle(id) }}
                    <button type="button" @click="removeResource(id)" class="hover:text-red-600 cursor-pointer">
                        <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </span>
                <button type="button" @click="showPicker = true"
                    class="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-dashed border-border text-xs text-text-secondary hover:bg-surface-hover cursor-pointer">
                    + Add resources...
                </button>
            </div>
        </div>

        <!-- Warning if extraction has already run -->
        <div v-if="hasRunExtraction && isDirty"
            class="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800">
            Changing sources will affect future extractions. Existing rows remain. Rows linked to resources no longer in the source set will not be re-extracted but will not be deleted either.
        </div>

        <!-- Save -->
        <div class="pt-2">
            <button type="button" @click="save" :disabled="!isDirty || saving"
                class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                {{ saving ? 'Saving...' : 'Save sources' }}
            </button>
        </div>

        <!-- Resource picker modal -->
        <Teleport to="body">
            <Transition name="modal">
                <div v-if="showPicker" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div class="bg-surface-elevated rounded-xl shadow-2xl border border-border max-w-lg w-full mx-4 overflow-hidden flex flex-col" style="max-height: 80vh;">
                        <div class="px-5 py-3 border-b border-border-light">
                            <h3 class="text-sm font-semibold text-text-primary">Select resources</h3>
                        </div>
                        <div class="px-5 py-3 border-b border-border-light">
                            <input v-model="pickerSearch" type="text" placeholder="Search by title..."
                                class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                        </div>
                        <div class="flex-1 overflow-y-auto divide-y divide-border-light">
                            <label v-for="r in filteredPickerResources" :key="r.id"
                                class="flex items-center gap-3 px-5 py-2.5 hover:bg-surface-hover cursor-pointer">
                                <input type="checkbox" :value="r.id" v-model="pickerSelection" />
                                <div class="flex-1 min-w-0">
                                    <div class="text-sm text-text-primary truncate">{{ r.title || r.name || `Resource ${r.id}` }}</div>
                                    <div class="text-[10px] text-text-muted truncate">{{ r.mimeType || 'unknown type' }}</div>
                                </div>
                            </label>
                            <div v-if="filteredPickerResources.length === 0" class="px-5 py-6 text-center text-xs text-text-muted">
                                No resources match.
                            </div>
                        </div>
                        <div class="px-5 py-3 border-t border-border-light flex justify-end gap-2">
                            <button type="button" @click="showPicker = false"
                                class="px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-surface-hover cursor-pointer">
                                Cancel
                            </button>
                            <button type="button" @click="addPickedResources"
                                class="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent-dark cursor-pointer">
                                Add selected
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useDatasets, type Dataset, type DatasetSourceMode } from '../../services/datasets/useDatasets';
import { useResourceList } from '../../services/resources/useResourceList';

interface PickerResource {
    id: number;
    name?: string;
    title?: string;
    mimeType?: string;
}

const props = defineProps<{ dataset: Dataset }>();
const emit = defineEmits<{ (e: 'save'): void }>();

const { updateDataset } = useDatasets();
const { loadResourcesByProject } = useResourceList();

const sourceMode = ref<DatasetSourceMode>(props.dataset.sourceMode);
const resourceTypeFilter = ref<string[]>(props.dataset.sourceConfig?.resourceTypeFilter ?? []);
const resourceIds = ref<number[]>(props.dataset.sourceConfig?.resourceIds ?? []);
const saving = ref(false);

const projectResources = ref<PickerResource[]>([]);
const showPicker = ref(false);
const pickerSearch = ref('');
const pickerSelection = ref<number[]>([]);

const canUseProjectMode = computed(() => !!props.dataset.project?.id);

const mimeFilterChoices = [
    { value: 'application/pdf', label: 'PDF' },
    { value: 'audio/', label: 'Audio' },
    { value: 'text/', label: 'Text / Markdown' },
];

const filteredPickerResources = computed(() => {
    const q = pickerSearch.value.trim().toLowerCase();
    const list = projectResources.value;
    if (!q) return list;
    return list.filter((r) => (r.title || r.name || '').toLowerCase().includes(q));
});

const resourceTitle = (id: number): string => {
    const r = projectResources.value.find((x) => x.id === id);
    return r?.title || r?.name || `Resource ${id}`;
};

const matchesMime = (mime: string | undefined, filters: string[]): boolean => {
    if (!filters.length) return true;
    if (!mime) return false;
    return filters.some((f) => f.endsWith('/') ? mime.startsWith(f) : mime === f);
};

const rowEstimate = computed(() => {
    if (!canUseProjectMode.value) return '';
    const filtered = projectResources.value.filter((r) => matchesMime(r.mimeType, resourceTypeFilter.value));
    return `This will create ${filtered.length} row${filtered.length === 1 ? '' : 's'} when extraction runs.`;
});

const initial = {
    sourceMode: props.dataset.sourceMode,
    sourceConfig: JSON.stringify(props.dataset.sourceConfig || {}),
};

const isDirty = computed(() => {
    if (sourceMode.value !== initial.sourceMode) return true;
    const current = sourceMode.value === 'manual'
        ? {}
        : sourceMode.value === 'project_resources'
            ? { resourceTypeFilter: resourceTypeFilter.value }
            : { resourceIds: resourceIds.value };
    return JSON.stringify(current) !== initial.sourceConfig;
});

const hasRunExtraction = computed(() => !!props.dataset.extractionConfig?.lastRunAt);

const save = async () => {
    saving.value = true;
    try {
        const sourceConfig = sourceMode.value === 'manual'
            ? {}
            : sourceMode.value === 'project_resources'
                ? { resourceTypeFilter: resourceTypeFilter.value }
                : { resourceIds: resourceIds.value };
        await updateDataset(props.dataset.id, {
            sourceMode: sourceMode.value,
            sourceConfig,
        });
        emit('save');
    } finally {
        saving.value = false;
    }
};

const removeResource = (id: number) => {
    resourceIds.value = resourceIds.value.filter((x) => x !== id);
};

const addPickedResources = () => {
    const merged = new Set([...resourceIds.value, ...pickerSelection.value]);
    resourceIds.value = [...merged];
    pickerSelection.value = [];
    showPicker.value = false;
};

watch(() => props.dataset, (next) => {
    sourceMode.value = next.sourceMode;
    resourceTypeFilter.value = next.sourceConfig?.resourceTypeFilter ?? [];
    resourceIds.value = next.sourceConfig?.resourceIds ?? [];
    initial.sourceMode = next.sourceMode;
    initial.sourceConfig = JSON.stringify(next.sourceConfig || {});
}, { deep: true });

onMounted(async () => {
    const projectId = props.dataset.project?.id;
    if (!projectId) return;
    try {
        projectResources.value = await loadResourcesByProject(String(projectId));
    } catch {
        projectResources.value = [];
    }
});
</script>
