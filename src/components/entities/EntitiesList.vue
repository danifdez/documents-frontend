<template>
    <div class="bg-surface-elevated rounded-xl border border-border">
        <div class="px-4 py-3 border-b border-border-light flex items-center justify-between">
            <h3 class="text-sm font-semibold text-text-primary">Entities</h3>
            <span class="text-xs text-text-muted">{{ displayedEntities.length }}/{{ entities.length }}</span>
        </div>

        <div class="px-4 py-3 border-b border-border-light">
            <input v-model="filterTerm" type="text" placeholder="Search entities..."
                class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all" />
        </div>

        <div v-if="entities.length === 0" class="text-center py-10 px-4">
            <svg class="mx-auto h-8 w-8 text-text-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <p class="text-sm text-text-secondary">No entities found</p>
            <p class="text-xs text-text-muted mt-1">Entities are extracted automatically when processing documents</p>
        </div>

        <div v-else class="max-h-[60vh] overflow-y-auto">
            <div v-if="displayedEntities.length === 0" class="text-center py-8 text-sm text-text-muted">
                No entities match your search
            </div>

            <div v-for="entity in displayedEntities" :key="entity.id"
                class="border-b border-border-light last:border-b-0 transition-colors"
                :class="[
                    selectedHighlightEntity?.id === entity.id
                        ? 'bg-accent-subtle'
                        : 'hover:bg-surface-hover'
                ]">
                <!-- Edit Mode -->
                <div v-if="editingEntityId === entity.id" class="p-4 space-y-3">
                    <div>
                        <label class="block text-xs font-medium text-text-secondary mb-1">Name</label>
                        <input v-model="entity.name" type="text"
                            class="block w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                            placeholder="Entity name" />
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-text-secondary mb-1">Description</label>
                        <textarea :value="entity.description || ''" @input="(e) => {
                            entity.description = (e.target as HTMLTextAreaElement).value;
                        }" rows="2"
                            class="block w-full rounded-lg bg-surface border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                            placeholder="Optional description"></textarea>
                    </div>
                    <div class="flex justify-between items-center">
                        <span v-if="isSaving === entity.id" class="text-xs text-text-muted flex items-center gap-1.5">
                            <LoadingSpinner size="xs" />
                            Saving...
                        </span>
                        <span v-else></span>
                        <div class="flex items-center gap-2">
                            <button @click="cancelEditing(entity)"
                                class="text-xs text-red-400 hover:text-red-500 cursor-pointer">
                                Cancel
                            </button>
                            <Button @click="saveAndStopEditing(entity)" size="small" variant="info"
                                :disabled="isSaving === entity.id">
                                Done
                            </Button>
                        </div>
                    </div>
                </div>

                <!-- View Mode (compact) -->
                <div v-else class="group px-4 py-2.5 flex items-center gap-3">
                    <div @click="highlightEntityInContent(entity)" class="flex-1 min-w-0 cursor-pointer flex items-center gap-2.5"
                        :title="`Click to highlight ${displayEntityName(entity)} in the document`">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider shrink-0"
                            :class="getEntityTypeBadgeClass(displayEntityType(entity))">
                            {{ displayEntityType(entity) }}
                        </span>
                        <div class="min-w-0 flex-1">
                            <span class="text-sm font-medium text-text-primary truncate block">{{ displayEntityName(entity) }}</span>
                            <span v-if="entity.aliases && entity.aliases.length > 0" class="text-[11px] text-text-muted truncate block">
                                {{ entity.aliases.map(a => a.value).join(', ') }}
                            </span>
                        </div>
                    </div>

                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" @click.stop>
                        <button @click="startEditing(entity)"
                            class="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-surface transition-colors cursor-pointer"
                            title="Edit">
                            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button @click="showMergeModal(entity)"
                            class="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-surface transition-colors cursor-pointer"
                            title="Merge">
                            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                        </button>
                        <button @click="removeEntity(entity)"
                            class="p-1 rounded text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove">
                            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Merge Modal -->
        <div v-if="showMerge" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div class="bg-surface-elevated rounded-xl border border-border shadow-2xl shadow-black/10 p-6 w-full max-w-md mx-4">
                <h3 class="text-base font-semibold text-text-primary mb-4">
                    Merge: {{ selectedEntity ? displayEntityName(selectedEntity) : '' }}
                </h3>

                <div class="mb-4">
                    <label class="block text-xs font-medium text-text-secondary mb-1.5">Search target entity</label>
                    <input v-model="searchTerm" @input="debouncedSearch" type="text"
                        class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                        placeholder="Type entity name..." />
                </div>

                <div v-if="isSearching" class="text-center py-4">
                    <div class="inline-flex items-center gap-2 text-sm text-text-muted">
                        <LoadingSpinner size="sm" />
                        Searching...
                    </div>
                </div>

                <div v-else-if="searchResults.length > 0" class="max-h-40 overflow-y-auto border border-border rounded-lg mb-4">
                    <div class="px-3 py-1.5 text-[11px] text-text-muted border-b border-border-light font-medium uppercase tracking-wider">{{ searchResults.length }} found</div>
                    <button v-for="result in searchResults" :key="result.id" @click="selectTargetEntity(result)"
                        class="w-full text-left px-3 py-2 hover:bg-surface-hover transition-colors cursor-pointer border-b border-border-light last:border-b-0"
                        :class="selectedTargetEntity?.id === result.id ? 'bg-accent-subtle' : ''">
                        <div class="text-sm font-medium text-text-primary">{{ displayEntityName(result) }}</div>
                        <div class="text-xs text-text-muted">{{ displayEntityType(result) }}</div>
                    </button>
                </div>

                <div v-else-if="searchTerm && !isSearching" class="text-center py-4 text-sm text-text-muted">
                    No entities found
                </div>

                <div class="flex justify-end gap-2">
                    <Button @click="closeMergeModal" variant="secondary">Cancel</Button>
                    <Button @click="performMerge" variant="warning" :disabled="!selectedTargetEntity || isMerging">
                        {{ isMerging ? 'Merging...' : 'Merge' }}
                    </Button>
                </div>
            </div>
        </div>

        <!-- Confirm Modals -->
        <ConfirmModal :is-open="showRemoveEntityModal" title="Remove Entity"
            :message="`Are you sure you want to remove &quot;${displayEntityName(entityToRemove)}&quot; from this resource?`"
            confirm-text="Remove" cancel-text="Cancel" confirm-variant="danger" @confirm="handleRemoveEntityConfirm"
            @cancel="handleRemoveEntityCancel" />

        <ConfirmModal :is-open="showMergeEntityModal" title="Merge Entity"
            :message="`Are you sure you want to merge &quot;${displayEntityName(selectedEntity)}&quot; into &quot;${displayEntityName(selectedTargetEntity)}&quot;? This action cannot be undone.`"
            confirm-text="Merge" cancel-text="Cancel" confirm-variant="warning" @confirm="handleMergeEntityConfirm"
            @cancel="handleMergeEntityCancel" />
    </div>
</template>

<script setup lang="ts">
import { ref, defineEmits, computed } from 'vue';
import LoadingSpinner from '../ui/LoadingSpinner.vue';
import { useEntities, type Entity, type EntityAlias, type EntityTranslation } from '../../services/entities/useEntities';
import { useNotification } from '../../composables/useNotification';
import Button from '../ui/Button.vue';
import ConfirmModal from '../ui/ConfirmModal.vue';

interface Props {
    resourceId: string;
    entities: Entity[];
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
    'entity:removed': [entityId: number];
    'entity:merged': [sourceEntityId: number, targetEntity: Entity];
    'entity:highlight': [entity: Entity];
}>();

const formatAliases = (aliases: EntityAlias[]): string => {
    return aliases.map(alias => `${alias.value} (${alias.locale})`).join(', ');
};

/**
 * Get the display text for an entity based on current display mode.
 * Since entities are ALWAYS extracted from working_content (English),
 * entity.name is always in English and translations contain other languages.
 */
const displayEntityName = (entity: Entity | null): string => {
    if (!entity) return '';
    try {
        if (props.displayMode === 'translated') {
            const translations = entity.translations as Record<string, string> | undefined;
            if (translations && translations[props.targetLanguage]) {
                return translations[props.targetLanguage];
            }
        } else {
            if (props.resourceLanguage === 'en') {
                return entity.name;
            } else {
                const translations = entity.translations as Record<string, string> | undefined;
                if (translations && translations[props.resourceLanguage]) {
                    return translations[props.resourceLanguage];
                }
            }
        }

        return entity.name;
    } catch (e) {
        return entity.name;
    }
};

const displayEntityType = (entity: Entity | null): string => {
    if (!entity) return '';
    // entity may have an entityType relation or a flat 'type' property
    return (entity.entityType && (entity.entityType.name as string)) || ((entity as any).type as string) || '';
};

const getAliasValues = (aliases: EntityAlias[] | null): string[] => {
    return aliases ? aliases.map(alias => alias.value) : [];
};

const selectedHighlightEntity = ref<Entity | null>(null);

// Confirm Modal state
const showRemoveEntityModal = ref(false);
const entityToRemove = ref<Entity | null>(null);
const showMergeEntityModal = ref(false);

// Search/filter state
const filterTerm = ref('');

const displayedEntities = computed(() => {
    const q = filterTerm.value.trim().toLowerCase();
    if (!q) return props.entities || [];

    return (props.entities || []).filter((entity: Entity) => {
        // name
        const name = (entity.name || '').toString().toLowerCase();
        if (name.includes(q)) return true;

        // translations
        try {
            const translations = entity.translations as Record<string, string> | undefined;
            if (translations) {
                for (const v of Object.values(translations)) {
                    if ((v || '').toLowerCase().includes(q)) return true;
                }
            }
        } catch (e) {
            // ignore
        }

        // aliases
        if (entity.aliases && entity.aliases.length > 0) {
            for (const a of entity.aliases) {
                if ((a.value || '').toLowerCase().includes(q)) return true;
            }
        }

        // entity type
        const typeName = displayEntityType(entity).toLowerCase();
        if (typeName.includes(q)) return true;

        return false;
    });
});

const { removeEntityFromResource, mergeEntities, searchEntities, getAllEntities, isLoading, updateEntity } = useEntities();
const notification = useNotification();

const editingEntityId = ref<number | null>(null);
const editSnapshot = ref<{ name: string; description: string | undefined } | null>(null);
const isSaving = ref<number | null>(null);
const showMerge = ref(false);
const selectedEntity = ref<Entity | null>(null);
const selectedTargetEntity = ref<Entity | null>(null);
const searchTerm = ref('');
const searchResults = ref<Entity[]>([]);
const isSearching = ref(false);
const isMerging = ref(false);

// Debounced search for performance
let searchTimeout: NodeJS.Timeout | null = null;

const debouncedSearch = () => {
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    searchTimeout = setTimeout(async () => {
        if (searchTerm.value.trim().length < 1) {
            searchResults.value = [];
            return;
        }

        isSearching.value = true;
        try {
            // First try the search endpoint
            const searchedEntities = await searchEntities(searchTerm.value);
            let entitiesToFilter = searchedEntities;

            // Filter out the current entity and entities already on this resource
            searchResults.value = entitiesToFilter.filter(entity =>
                entity.id !== selectedEntity.value?.id
            );
        } catch (error) {
            console.error('Search error in component:', error);
            notification.error('Failed to search entities');
        } finally {
            isSearching.value = false;
        }
    }, 300);
};

const getEntityTypeBadgeClass = (typeName: string) => {
    const typeColorMap: Record<string, string> = {
        'PERSON': 'bg-blue-100 text-blue-800',
        'ORGANIZATION': 'bg-green-100 text-green-800',
        'LOCATION': 'bg-yellow-100 text-yellow-800',
        'MISC': 'bg-surface-hover text-text-primary',
    };

    return typeColorMap[typeName] || 'bg-purple-100 text-purple-800';
};

// Auto-save functionality for entity editing
const saveTimers = new Map<number, NodeJS.Timeout>();
const DEBOUNCE_MS = 800;

const scheduleSave = (entity: Entity) => {
    if (!entity || !entity.id) return;

    // Clear existing timer
    const existing = saveTimers.get(entity.id);
    if (existing) {
        clearTimeout(existing);
    }

    const timer = setTimeout(async () => {
        saveTimers.delete(entity.id);
        try {
            await saveEntity(entity);
        } catch (err) {
            console.error('Auto-save failed for entity', entity.id, err);
            notification.error('Failed to save entity changes');
        }
    }, DEBOUNCE_MS);

    saveTimers.set(entity.id, timer);
};

const saveEntity = async (entity: Entity) => {
    isSaving.value = entity.id;
    try {
        const updateData: { name: string; description?: string } = {
            name: entity.name,
        };

        // Only include description if it has a value
        if (entity.description !== null && entity.description !== undefined && entity.description.trim() !== '') {
            updateData.description = entity.description;
        }

        await updateEntity(entity.id, updateData);
        notification.success('Entity updated successfully');
    } catch (error) {
        console.error('Failed to save entity:', error);
        throw error;
    } finally {
        isSaving.value = null;
    }
};

const startEditing = (entity: Entity) => {
    editSnapshot.value = { name: entity.name, description: entity.description };
    editingEntityId.value = entity.id;
};

const stopEditing = () => {
    editSnapshot.value = null;
    editingEntityId.value = null;
};

const cancelEditing = (entity: Entity) => {
    if (editSnapshot.value) {
        entity.name = editSnapshot.value.name;
        entity.description = editSnapshot.value.description;
    }
    editSnapshot.value = null;
    editingEntityId.value = null;
};

const saveAndStopEditing = async (entity: Entity) => {
    try {
        await saveEntity(entity);
        editSnapshot.value = null;
        editingEntityId.value = null;
    } catch (error) {
        // Error already handled in saveEntity
    }
};

const removeEntity = async (entity: Entity) => {
    entityToRemove.value = entity;
    showRemoveEntityModal.value = true;
};

const handleRemoveEntityConfirm = async () => {
    const entity = entityToRemove.value;
    showRemoveEntityModal.value = false;

    if (!entity) return;

    try {
        await removeEntityFromResource(props.resourceId, entity.id);
        emit('entity:removed', entity.id);
        notification.success(`Entity "${displayEntityName(entity)}" removed from resource`);
    } catch (error) {
        notification.error('Failed to remove entity from resource');
    } finally {
        entityToRemove.value = null;
    }
};

const handleRemoveEntityCancel = () => {
    showRemoveEntityModal.value = false;
    entityToRemove.value = null;
};

const showMergeModal = async (entity: Entity) => {
    selectedEntity.value = entity;
    selectedTargetEntity.value = null;
    searchTerm.value = '';
    searchResults.value = [];
    showMerge.value = true;
};

const closeMergeModal = () => {
    showMerge.value = false;
    selectedEntity.value = null;
    selectedTargetEntity.value = null;
    searchTerm.value = '';
    searchResults.value = [];
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
};

const selectTargetEntity = (entity: Entity) => {
    selectedTargetEntity.value = entity;
};

const performMerge = async () => {
    if (!selectedEntity.value || !selectedTargetEntity.value) {
        return;
    }

    showMergeEntityModal.value = true;
};

const handleMergeEntityConfirm = async () => {
    showMergeEntityModal.value = false;

    if (!selectedEntity.value || !selectedTargetEntity.value) {
        return;
    }

    isMerging.value = true;
    try {
        const mergedEntity = await mergeEntities(selectedEntity.value.id, selectedTargetEntity.value.id);
        emit('entity:merged', selectedEntity.value.id, mergedEntity);
        notification.success(`Entity "${displayEntityName(selectedEntity.value)}" merged into "${displayEntityName(mergedEntity)}"`);
        closeMergeModal();
    } catch (error) {
        notification.error('Failed to merge entities');
    } finally {
        isMerging.value = false;
    }
};

const handleMergeEntityCancel = () => {
    showMergeEntityModal.value = false;
};

const highlightEntityInContent = (entity: Entity) => {
    selectedHighlightEntity.value = entity;
    emit('entity:highlight', entity);
};
</script>