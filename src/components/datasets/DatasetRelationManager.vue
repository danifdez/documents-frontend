<template>
    <div class="space-y-4">
        <!-- Existing relations -->
        <div v-if="relations.length > 0" class="space-y-3">
            <div v-for="relation in relations" :key="relation.id"
                class="rounded-xl border border-border bg-surface-elevated overflow-hidden">
                <!-- Relation visual -->
                <div class="px-4 py-3 flex items-center gap-3">
                    <!-- Source dataset -->
                    <div class="flex items-center gap-2 min-w-0">
                        <div class="shrink-0 w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                            <svg class="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                stroke-width="1.75">
                                <ellipse cx="12" cy="5" rx="9" ry="3" />
                                <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
                                <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
                            </svg>
                        </div>
                        <div class="min-w-0">
                            <span class="text-sm font-semibold text-text-primary truncate block">
                                {{ relation.sourceDataset.name }}
                            </span>
                            <span v-if="relation.sourceDataset.id === datasetId"
                                class="text-[10px] text-accent font-medium">This dataset</span>
                        </div>
                    </div>

                    <!-- Arrow + relation type -->
                    <div class="flex flex-col items-center shrink-0 px-2">
                        <span v-if="relation.name"
                            class="text-[10px] text-text-muted italic mb-0.5 max-w-[8rem] truncate">
                            {{ relation.name }}
                        </span>
                        <div class="flex items-center gap-1">
                            <div class="w-8 h-px bg-border"></div>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
                                :class="relation.relationType === 'one-to-many'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-purple-100 text-purple-700'">
                                {{ relationLabel(relation.relationType) }}
                            </span>
                            <svg class="h-4 w-4 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </div>
                        <span class="text-[10px] text-text-muted mt-0.5">
                            {{ relationDescription(relation) }}
                        </span>
                    </div>

                    <!-- Target dataset -->
                    <div class="flex items-center gap-2 min-w-0">
                        <div class="shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <svg class="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                stroke-width="1.75">
                                <ellipse cx="12" cy="5" rx="9" ry="3" />
                                <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
                                <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
                            </svg>
                        </div>
                        <div class="min-w-0">
                            <span class="text-sm font-semibold text-text-primary truncate block">
                                {{ relation.targetDataset.name }}
                            </span>
                            <span v-if="relation.targetDataset.id === datasetId"
                                class="text-[10px] text-accent font-medium">This dataset</span>
                        </div>
                    </div>

                    <!-- Delete -->
                    <button @click="$emit('deleteRelation', relation.id)"
                        class="ml-auto shrink-0 p-1.5 rounded text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete relation">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>

                <!-- Example explanation -->
                <div class="px-4 py-2 bg-surface border-t border-border-light text-[11px] text-text-muted">
                    <template v-if="relation.relationType === 'one-to-many'">
                        Each record in <strong>{{ relation.sourceDataset.name }}</strong> can link to multiple records in
                        <strong>{{ relation.targetDataset.name }}</strong>,
                        but each record in <strong>{{ relation.targetDataset.name }}</strong> links to at most one in
                        <strong>{{ relation.sourceDataset.name }}</strong>.
                    </template>
                    <template v-else>
                        Records in <strong>{{ relation.sourceDataset.name }}</strong> and
                        <strong>{{ relation.targetDataset.name }}</strong>
                        can be linked freely in both directions.
                    </template>
                </div>
            </div>
        </div>

        <!-- Empty state -->
        <div v-else class="text-center py-8">
            <svg class="mx-auto h-10 w-10 text-text-muted/40 mb-3" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <p class="text-sm text-text-muted">No relations defined yet</p>
            <p class="text-xs text-text-muted/70 mt-1">
                Link this dataset to others to connect related records
            </p>
        </div>

        <!-- Add relation form -->
        <div class="rounded-xl border border-border bg-surface-elevated overflow-hidden">
            <div class="px-4 py-2.5 border-b border-border-light bg-surface">
                <p class="text-xs font-semibold text-text-muted uppercase tracking-wider">New Relation</p>
            </div>
            <div class="px-4 py-4 space-y-3">
                <!-- Visual preview -->
                <div class="flex items-center gap-3 text-sm">
                    <div class="px-3 py-1.5 rounded-lg bg-accent/10 text-accent font-medium text-xs">
                        {{ currentDatasetName }}
                    </div>
                    <div class="flex items-center gap-1 text-text-muted">
                        <div class="w-6 h-px bg-border"></div>
                        <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                            :class="newRelation.relationType === 'one-to-many'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'">
                            {{ relationLabel(newRelation.relationType) }}
                        </span>
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </div>
                    <div class="px-3 py-1.5 rounded-lg text-xs font-medium"
                        :class="newRelation.targetDatasetId
                            ? 'bg-emerald-500/10 text-emerald-700'
                            : 'bg-surface-hover text-text-muted'">
                        {{ selectedTargetName || 'Select target...' }}
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-medium text-text-secondary mb-1">Target dataset
                            <HelpTip>The other dataset you want to relate to. Records from both datasets can then be linked together.</HelpTip>
                        </label>
                        <select v-model="newRelation.targetDatasetId"
                            class="block w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                            <option :value="0" disabled>Select dataset...</option>
                            <option v-for="ds in availableDatasets" :key="ds.id" :value="ds.id">{{ ds.name }}</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-text-secondary mb-1">Relation type
                            <HelpTip>One-to-Many: each source record links to many targets (e.g. Author → Books). Many-to-Many: records link freely in both directions (e.g. Students ↔ Courses).</HelpTip>
                        </label>
                        <select v-model="newRelation.relationType"
                            class="block w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                            <option value="one-to-many">One to Many (1:N)</option>
                            <option value="many-to-many">Many to Many (N:M)</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-medium text-text-secondary mb-1">Label (optional)
                        <HelpTip>A descriptive name for this relation, e.g. "authored by", "belongs to", "enrolled in".</HelpTip>
                    </label>
                    <input v-model="newRelation.name" type="text" placeholder='e.g. "authored by", "belongs to"'
                        class="block w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                </div>

                <button @click="handleCreate" :disabled="!newRelation.targetDatasetId"
                    class="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Create Relation
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Dataset, DatasetRelation } from '../../services/datasets/useDatasets';
import HelpTip from '../ui/HelpTip.vue';

const props = defineProps<{
    datasetId: number;
    relations: DatasetRelation[];
    availableDatasets: Dataset[];
}>();

const emit = defineEmits<{
    createRelation: [data: { sourceDatasetId: number; targetDatasetId: number; relationType: string; name?: string }];
    deleteRelation: [relationId: number];
}>();

const newRelation = ref({
    targetDatasetId: 0,
    relationType: 'one-to-many',
    name: '',
});

const currentDatasetName = computed(() => {
    if (props.relations.length > 0) {
        const r = props.relations[0];
        return r.sourceDataset.id === props.datasetId ? r.sourceDataset.name : r.targetDataset.name;
    }
    return 'This dataset';
});

const selectedTargetName = computed(() => {
    if (!newRelation.value.targetDatasetId) return '';
    return props.availableDatasets.find(ds => ds.id === newRelation.value.targetDatasetId)?.name || '';
});

const relationLabel = (type: string): string => {
    return type === 'one-to-many' ? '1 : N' : 'N : M';
};

const relationDescription = (relation: DatasetRelation): string => {
    if (relation.relationType === 'one-to-many') {
        return `1 ${relation.sourceDataset.name} → N ${relation.targetDataset.name}`;
    }
    return `${relation.sourceDataset.name} ↔ ${relation.targetDataset.name}`;
};

const handleCreate = () => {
    if (!newRelation.value.targetDatasetId) return;
    emit('createRelation', {
        sourceDatasetId: props.datasetId,
        targetDatasetId: newRelation.value.targetDatasetId,
        relationType: newRelation.value.relationType,
        name: newRelation.value.name || undefined,
    });
    newRelation.value = { targetDatasetId: 0, relationType: 'one-to-many', name: '' };
};
</script>
