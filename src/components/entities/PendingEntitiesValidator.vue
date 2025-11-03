<template>
    <div class="bg-white p-4 shadow rounded-lg">
        <div class="mb-4 flex items-center justify-between">
            <div>
                <h3 class="text-lg font-medium text-gray-900">Pending Entities Validation</h3>
                <p class="text-sm text-gray-500 mt-1">Review and confirm the extracted entities from this document</p>
            </div>
            <div class="flex items-center space-x-2">
                <Button @click="showAddEntityForm = !showAddEntityForm" variant="secondary">
                    <svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Entity
                </Button>
                <Button @click="confirmAllEntities" :disabled="isConfirming || pendingEntities.length === 0"
                    variant="primary">
                    <svg v-if="isConfirming" class="animate-spin h-4 w-4 mr-2 inline-block"
                        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">
                        </circle>
                        <path class="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                        </path>
                    </svg>
                    {{ isConfirming ? 'Confirming...' : 'Confirm All Entities' }}
                </Button>
            </div>
        </div>

        <!-- Add Entity Form -->
        <div v-if="showAddEntityForm" class="mb-4 p-4 border border-gray-300 rounded-md bg-gray-50">
            <h4 class="text-md font-medium text-gray-800 mb-3">Add New Entity</h4>
            <div class="space-y-3">
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Entity Name *</label>
                    <input v-model="newEntity.name" type="text"
                        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        placeholder="Entity name" />
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Entity Type</label>
                    <select v-model="newEntity.entityTypeId"
                        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm">
                        <option :value="undefined">Select type...</option>
                        <option v-for="type in entityTypes" :key="type.id" :value="type.id">
                            {{ type.name }}
                        </option>
                    </select>
                </div>
                <div class="flex space-x-2">
                    <Button @click="addNewEntity" :disabled="!newEntity.name.trim()" variant="primary">
                        Add
                    </Button>
                    <Button @click="cancelAddEntity" variant="secondary">
                        Cancel
                    </Button>
                </div>
            </div>
        </div>

        <div v-if="pendingEntities.length === 0" class="text-center py-8">
            <div class="text-gray-400">
                <svg class="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="text-gray-500">No pending entities to validate</p>
            </div>
        </div>

        <div v-else class="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            <div v-for="entity in pendingEntities" :key="entity.id" :class="[
                'border rounded-md p-4 transition-colors',
                entity.isConfirmed
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 hover:bg-gray-50'
            ]">
                <!-- If entity is confirmed show compact view -->
                <template v-if="entity.isConfirmed">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                            <div class="text-sm font-medium">{{ getEntityDisplayText(entity) }}</div>
                            <div class="text-xs text-gray-600 px-2 py-1 bg-white rounded border">{{
                                entity.entityType?.name || '—' }}</div>
                            <div class="text-xs text-gray-600 px-2 py-1 bg-white rounded border">{{ entity.scope }}
                            </div>
                        </div>
                        <div class="ml-4 flex items-center space-x-2">
                            <Button @click="deleteEntity(entity.id, entity.isConfirmed)" size="small"
                                :variant="entity.isConfirmed ? 'danger' : 'secondary'">
                                Remove
                            </Button>
                            <Button @click.stop.prevent="highlightEntity(entity)" size="small" variant="secondary">
                                Highlight
                            </Button>
                        </div>
                    </div>
                </template>

                <!-- Editable form for pending (not confirmed) entities -->
                <template v-else>
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <!-- Merged info -->
                            <div v-if="entity.status === 'merged'"
                                class="mb-3 p-2 bg-yellow-50 border-l-4 border-yellow-300 text-sm text-yellow-800 rounded">
                                Merged as alias of <span class="font-medium">{{ entity.mergedTargetName ||
                                    entity.mergedTargetId }}</span>
                                <span v-if="entity.mergedAt" class="text-xs text-gray-500"> — {{ new
                                    Date(entity.mergedAt).toLocaleString() }}</span>
                            </div>

                            <!-- Entity Name -->
                            <div class="mb-3">
                                <label class="block text-xs font-medium text-gray-700 mb-1">Entity Name</label>
                                <!-- If current display mode is translated, allow editing the translation for the target locale -->
                                <template v-if="props.displayMode === 'translated'">
                                    <input v-model="entity._editedTranslation" type="text"
                                        @input="scheduleSave(entity, true)"
                                        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                        :placeholder="`Translation (${props.targetLanguage})`" />
                                </template>
                                <template v-else>
                                    <input v-model="entity.name" type="text" @input="scheduleSave(entity)"
                                        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                        placeholder="Entity name" />
                                </template>
                            </div>

                            <!-- Entity Type -->
                            <div class="mb-3">
                                <label class="block text-xs font-medium text-gray-700 mb-1">Entity Type</label>
                                <!-- If merged, show read-only type (same as target). Otherwise allow selection -->
                                <div v-if="entity.status === 'merged'"
                                    class="text-sm text-gray-700 px-3 py-2 bg-gray-50 rounded border">
                                    {{ entity.entityType?.name || '—' }}
                                </div>
                                <select v-else v-model="entity.entityType" @change="handleEntityTypeChange(entity)"
                                    class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm">
                                    <option :value="null">Select type...</option>
                                    <option v-for="type in entityTypes" :key="type.id" :value="type">
                                        {{ type.name }}
                                    </option>
                                </select>
                            </div>

                            <!-- Entity Scope -->
                            <div class="mb-3">
                                <label class="block text-xs font-medium text-gray-700 mb-1">Entity Scope</label>
                                <select v-model="entity.scope" @change="scheduleSave(entity)"
                                    class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm">
                                    <option value="global">Global - Applies to all projects</option>
                                    <option value="project">Project - Applies only to this project</option>
                                    <option value="document">Document - Applies only to this document</option>
                                </select>
                            </div>

                            <!-- Context Selection (if available) -->
                            <div v-if="entity.contextSelection"
                                class="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                                <span class="font-medium">Context:</span> "{{ entity.contextSelection.text }}"
                                <span v-if="entity.contextSelection.source" class="ml-2 text-gray-500">
                                    (from {{ entity.contextSelection.source }})
                                </span>
                            </div>
                        </div>

                        <!-- Actions for editable entity (auto-save enabled) -->
                        <div class="ml-4 flex flex-col space-y-2">
                            <div class="h-8 flex items-center">
                                <svg v-if="isSaving === entity.id" class="animate-spin h-3 w-3 text-gray-600"
                                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                        stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                    </path>
                                </svg>
                            </div>
                            <Button v-if="entity.status !== 'merged'" @click="openMergeModal(entity)" size="small"
                                variant="secondary">
                                Merge
                            </Button>
                            <Button v-else @click="cancelMerge(entity)" size="small" variant="warning">
                                Cancel Merge
                            </Button>

                            <Button @click="deleteEntity(entity.id, entity.isConfirmed)" size="small"
                                :variant="entity.isConfirmed ? 'danger' : 'secondary'">
                                {{ entity.isConfirmed ? 'Remove' : 'Delete' }}
                            </Button>
                            <Button @click.stop.prevent="highlightEntity(entity)" size="small" variant="secondary">
                                Highlight
                            </Button>
                        </div>
                    </div>
                </template>
            </div>
        </div>

        <!-- Merge Entity Modal -->
        <MergeEntityModal :is-open="showMergeModal" :source-entity="entityToMerge" :pending-entities="pendingEntities"
            :resource-id="resourceId" @close="closeMergeModal" @merge="handleMerge" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import Button from '../ui/Button.vue';
import MergeEntityModal from './MergeEntityModal.vue';
import { usePendingEntities, type PendingEntity, type EntityAlias, type EntityScope } from '../../services/entities/usePendingEntities';
import apiClient from '../../services/api';

export interface EntityType {
    id: number;
    name: string;
    description?: string;
}
// Local augmented type used in the UI to hold an edited translation field
type PendingEntityWithEdit = PendingEntity & { _editedTranslation?: string };

interface Props {
    resourceId: string;
    displayMode?: 'extracted' | 'translated' | 'summary' | 'raw';
    resourceLanguage?: string;
    targetLanguage?: string;
}

const props = withDefaults(defineProps<Props>(), {
    displayMode: 'extracted',
    resourceLanguage: 'en',
    targetLanguage: 'es'
});

const emit = defineEmits<{
    'entities:confirmed': [];
    'entity:highlight': [PendingEntity];
}>();

const highlightEntity = (entity: PendingEntity) => {
    emit('entity:highlight', entity);
};

const pendingEntities = ref<PendingEntityWithEdit[]>([]);

/**
 * Get the display text for an entity based on current display mode.
 * Since entities are ALWAYS extracted from working_content (English),
 * entity.name is always in English and translations contain other languages.
 */
const getEntityDisplayText = (entity: PendingEntity): string => {
    if (props.displayMode === 'translated' && entity.translations) {
        // In translated view: use translation to target language
        return entity.translations[props.targetLanguage] || entity.name;
    } else {
        // In extracted (original) view: use translation to source language
        if (props.resourceLanguage === 'en') {
            return entity.name;
        } else if (entity.translations && entity.translations[props.resourceLanguage]) {
            return entity.translations[props.resourceLanguage];
        }
        return entity.name;
    }
};

// (pendingEntities declared above with edit helper)
const entityTypes = ref<EntityType[]>([]);
const isSaving = ref<number | null>(null);
const isConfirming = ref(false);
const showAddEntityForm = ref(false);
const newEntity = ref({
    name: '',
    entityTypeId: undefined as number | undefined,
    scope: 'document' as 'document'
});

// Merge modal state
const showMergeModal = ref(false);
const entityToMerge = ref<PendingEntity | null>(null);

const { fetchPendingEntitiesByResourceId, updatePendingEntity, deletePendingEntity, confirmEntities, createPendingEntity } = usePendingEntities();

const fetchEntityTypes = async (): Promise<EntityType[]> => {
    try {
        const response = await apiClient.get('/entity-types');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch entity types:', error);
        return [];
    }
};

onMounted(async () => {
    await loadData();
});

// Watch for display mode or target language changes to refresh edited translation fields
watch(() => [props.displayMode, props.targetLanguage], () => {
    if (props.displayMode === 'translated') {
        pendingEntities.value.forEach((e) => {
            (e as any)._editedTranslation = (e.translations && e.translations[props.targetLanguage]) || '';
        });
    }
});

const loadData = async () => {
    try {
        const [entities, types] = await Promise.all([
            fetchPendingEntitiesByResourceId(props.resourceId),
            fetchEntityTypes()
        ]);
        pendingEntities.value = entities.map((e: any) => ({
            ...e,
            scope: e.scope || 'document',
            aliases: e.aliases || [],
            // helper for translation editing in UI
            _editedTranslation: (e.translations && e.translations[props.targetLanguage]) || ''
        }));
        // Resolve merged target names/types for any already-merged items
        await Promise.all(pendingEntities.value.map((e) => e.status === 'merged' ? resolveMergedInfo(e) : Promise.resolve()));
        entityTypes.value = types;
    } catch (error) {
        console.error('Failed to load pending entities:', error);
    }
};

// Helpers to resolve target info for merged entities
const fetchConfirmedEntity = async (id: number) => {
    try {
        const resp = await apiClient.get(`/entities/${id}`);
        return resp.data;
    } catch (err) {
        console.error('Failed to fetch confirmed entity', err);
        return null;
    }
};

const fetchPendingEntityById = async (id: number) => {
    try {
        const resp = await apiClient.get(`/pending-entities/${id}`);
        return resp.data;
    } catch (err) {
        console.error('Failed to fetch pending entity', err);
        return null;
    }
};

const resolveMergedInfo = async (entity: PendingEntity) => {
    try {
        if (!entity || entity.status !== 'merged' || !entity.mergedTargetId) return;

        if (entity.mergedTargetType === 'pending') {
            // Look up in loaded pendingEntities first
            const target = pendingEntities.value.find(p => p.id === entity.mergedTargetId);
            if (target) {
                entity.mergedTargetName = target.name;
                // Ensure the source entity type matches the target
                if (target.entityType) entity.entityType = target.entityType;
                return;
            }

            const fetched = await fetchPendingEntityById(entity.mergedTargetId);
            if (fetched) {
                entity.mergedTargetName = fetched.name;
                if (fetched.entityType) entity.entityType = fetched.entityType;
            }
        } else if (entity.mergedTargetType === 'confirmed') {
            const fetched = await fetchConfirmedEntity(entity.mergedTargetId!);
            if (fetched) {
                entity.mergedTargetName = fetched.name;
                if (fetched.entityType) entity.entityType = fetched.entityType;
            }
        }
    } catch (err) {
        console.error('resolveMergedInfo failed', err);
    }
};

const handleEntityTypeChange = (entity: PendingEntity) => {
    // Type change handled reactively
    scheduleSave(entity);
};

// Auto-save scheduling: debounce per-entity to avoid flooding the API.
const saveTimers = new Map<string, number>();
const DEBOUNCE_MS = 800;

const scheduleSave = (entity: PendingEntity, isTranslation = false) => {
    if (!entity || !entity.id) return;
    // clear existing timer
    const key = `${entity.id}:${isTranslation ? 't' : 'n'}`;
    const existing = saveTimers.get(key);
    if (existing) {
        clearTimeout(existing);
    }
    const t = setTimeout(async () => {
        saveTimers.delete(key);
        // call saveEntity but don't block UI
        try {
            await saveEntity(entity, isTranslation);
        } catch (err) {
            console.error('Auto-save failed for entity', entity.id, err);
        }
    }, DEBOUNCE_MS) as unknown as number;
    // store timer under composite key
    saveTimers.set(key, t);
};

const saveEntity = async (entity: PendingEntity, isTranslation = false) => {
    isSaving.value = entity.id;
    try {
        if (isTranslation) {
            // Prepare translations object for target language
            const locale = props.targetLanguage || 'en';
            const translations = entity.translations ? { ...entity.translations } : {};
            translations[locale] = (entity as any)._editedTranslation || '';

            await updatePendingEntity(entity.id, {
                translations
            } as any);
            // Update local copy
            (entity as any).translations = translations;
        } else {
            await updatePendingEntity(entity.id, {
                name: entity.name,
                entityTypeId: entity.entityType?.id,
                scope: entity.scope,
                aliases: entity.aliases?.filter(a => a.value.trim() !== '')
            });
        }
    } catch (error) {
        console.error('Failed to save entity:', error);
    } finally {
        isSaving.value = null;
    }
};

const deleteEntity = async (id: number, isConfirmed?: boolean) => {
    const message = isConfirmed
        ? 'This will remove the entity association from this document only. The entity will remain in other documents. Continue?'
        : 'Are you sure you want to delete this pending entity?';

    if (!confirm(message)) return;

    try {
        await deletePendingEntity(id);
        pendingEntities.value = pendingEntities.value.filter(e => e.id !== id);
    } catch (error) {
        console.error('Failed to delete entity:', error);
    }
};

const confirmAllEntities = async () => {
    if (!confirm(`Confirm all ${pendingEntities.value.length} entities? This will move them to the entities table.`)) {
        return;
    }

    isConfirming.value = true;
    try {
        const result = await confirmEntities(props.resourceId);
        if (result.errors && result.errors.length > 0) {
            console.error('Some entities failed to confirm:', result.errors);
            alert(`Confirmed ${result.confirmed} entities. ${result.errors.length} errors occurred. Check console for details.`);
        } else {
            alert(`Successfully confirmed ${result.confirmed} entities!`);
        }
        emit('entities:confirmed');
        await loadData();
    } catch (error) {
        console.error('Failed to confirm entities:', error);
        alert('Failed to confirm entities. Please try again.');
    } finally {
        isConfirming.value = false;
    }
};

const addNewEntity = async () => {
    try {
        const entity = await createPendingEntity({
            resourceId: parseInt(props.resourceId),
            name: newEntity.value.name,
            entityTypeId: newEntity.value.entityTypeId,
            scope: newEntity.value.scope
        });

        // Add to local list
        pendingEntities.value.push({
            ...entity,
            scope: entity.scope || 'document',
            aliases: entity.aliases || []
        });

        // Reset form
        cancelAddEntity();
    } catch (error) {
        console.error('Failed to add entity:', error);
        alert('Failed to add entity. Please try again.');
    }
};

const cancelAddEntity = () => {
    showAddEntityForm.value = false;
    newEntity.value = {
        name: '',
        entityTypeId: undefined,
        scope: 'document'
    };
};

// Merge entity functions
const openMergeModal = (entity: PendingEntity) => {
    entityToMerge.value = entity;
    showMergeModal.value = true;
};

const closeMergeModal = () => {
    showMergeModal.value = false;
    entityToMerge.value = null;
};

const handleMerge = async (payload: { targetType: 'pending' | 'confirmed', targetId: number, aliasScope: EntityScope }) => {
    try {
        if (!entityToMerge.value) return;

        // Call API to merge entity
        const resp = await apiClient.post(`/pending-entities/${entityToMerge.value.id}/merge`, {
            targetType: payload.targetType,
            targetId: payload.targetId,
            aliasScope: payload.aliasScope
        });

        // Update local pending entity with returned pending object
        const updatedPending = resp.data?.pending;
        if (updatedPending) {
            const idx = pendingEntities.value.findIndex(e => e.id === updatedPending.id);
            if (idx !== -1) {
                pendingEntities.value[idx] = { ...pendingEntities.value[idx], ...updatedPending } as any;
                // Populate merged target name/type info
                await resolveMergedInfo(pendingEntities.value[idx]);
            }
        }

        // Close modal
        closeMergeModal();

        alert('Entity merged successfully!');
    } catch (error) {
        console.error('Failed to merge entity:', error);
        alert('Failed to merge entity. Please try again.');
    }
};

const cancelMerge = async (entity: PendingEntity) => {
    if (!confirm('Cancel merge? This will remove the alias from the target entity and restore this pending entity.')) return;
    try {
        const resp = await apiClient.post(`/pending-entities/${entity.id}/cancel-merge`);
        if (resp.data && resp.data.success) {
            // Reload the single pending entity to get fresh state
            const refreshed = await apiClient.get(`/pending-entities/${entity.id}`);
            const updated = refreshed.data;
            const idx = pendingEntities.value.findIndex(e => e.id === updated.id);
            if (idx !== -1) {
                pendingEntities.value[idx] = { ...pendingEntities.value[idx], ...updated };
                await resolveMergedInfo(pendingEntities.value[idx]);
            }
            alert('Merge cancelled');
        } else {
            alert('Failed to cancel merge: ' + (resp.data?.message || 'unknown'));
        }
    } catch (error) {
        console.error('Failed to cancel merge:', error);
        alert('Failed to cancel merge.');
    }
};
</script>
