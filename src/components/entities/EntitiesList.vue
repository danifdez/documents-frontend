<template>
    <div class="bg-white p-4 shadow rounded-lg">
        <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900">Entities</h3>
            <span class="text-sm text-gray-500">{{ displayedEntities.length }} of {{ entities.length }} entities
                found</span>
        </div>

        <div class="mb-3">
            <input v-model="filterTerm" type="text" placeholder="Search entities by name or alias..."
                class="block w-full rounded-md border border-gray-200 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>

        <div v-if="entities.length === 0" class="text-center py-8">
            <div class="text-gray-400">
                <svg class="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <p class="text-gray-500">No entities found in this resource</p>
                <p class="text-sm text-gray-400">Entities are automatically extracted when you process documents</p>
            </div>
        </div>

        <!-- Make the list itself scrollable so the sidebar can fit in viewport -->
        <div v-else class="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            <div v-if="displayedEntities.length === 0" class="text-center py-8 text-gray-500">
                No entities match your search
            </div>
            <div v-for="entity in displayedEntities" :key="entity.id" @click="highlightEntityInContent(entity)"
                class="flex items-center justify-between p-3 border rounded-md transition-colors cursor-pointer" :class="[
                    selectedHighlightEntity?.id === entity.id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                ]" :title="`Click to highlight ${displayEntityName(entity)} in the document`">
                <div class="flex-1">
                    <div class="flex items-center space-x-3">
                        <div class="flex-1">
                            <h4 class="font-medium text-gray-900">{{ displayEntityName(entity) }}</h4>
                            <div class="flex items-center space-x-2 mt-1">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                    :class="getEntityTypeBadgeClass(displayEntityType(entity))">
                                    {{ displayEntityType(entity) }}
                                </span>
                            </div>
                            <div v-if="entity.aliases && entity.aliases.length > 0" class="mt-2">
                                <p class="text-xs text-gray-500">
                                    Aliases: {{ formatAliases(entity.aliases) }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex items-center space-x-2" @click.stop>
                    <Button @click="showMergeModal(entity)" title="Merge with another entity">
                        <svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                    </Button>
                    <Button @click="removeEntity(entity)" title="Remove entity from resource">
                        <svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </Button>
                </div>
            </div>
        </div>

        <!-- Merge Modal -->
        <div v-if="showMerge" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <h3 class="text-lg font-medium text-gray-900 mb-4">
                    Merge Entity: {{ selectedEntity ? displayEntityName(selectedEntity) : '' }}
                </h3>

                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        Search for target entity:
                    </label>
                    <input v-model="searchTerm" @input="debouncedSearch" type="text"
                        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Type entity name..." />
                </div>

                <div v-if="isSearching" class="text-center py-4">
                    <div class="inline-flex items-center">
                        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg"
                            fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">
                            </circle>
                            <path class="opacity-75" fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                            </path>
                        </svg>
                        Searching...
                    </div>
                </div>

                <div v-else-if="searchResults.length > 0" class="max-h-40 overflow-y-auto border rounded-md mb-4">
                    <div class="p-2 text-xs text-gray-500 border-b">Found {{ searchResults.length }} entities</div>
                    <Button v-for="result in searchResults" :key="result.id" @click="selectTargetEntity(result)">
                        <div class="font-medium">{{ displayEntityName(result) }}</div>
                        <div class="text-sm text-gray-500">{{ displayEntityType(result) }}</div>
                    </Button>
                </div>

                <div v-else-if="searchTerm && !isSearching" class="text-center py-4 text-gray-500">
                    No entities found
                </div>

                <div class="flex justify-end space-x-3">
                    <Button @click="closeMergeModal">
                        Cancel
                    </Button>
                    <Button @click="performMerge" :disabled="!selectedTargetEntity || isMerging">
                        <span v-if="isMerging">Merging...</span>
                        <span v-else>Merge</span>
                    </Button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, defineEmits, computed } from 'vue';
import { useEntities, type Entity, type EntityAlias, type EntityTranslation } from '../../services/entities/useEntities';
import { useNotification } from '../../composables/useNotification';
import Button from '../ui/Button.vue';

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

const { removeEntityFromResource, mergeEntities, searchEntities, getAllEntities, isLoading } = useEntities();
const notification = useNotification();

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
        'MISC': 'bg-gray-100 text-gray-800',
    };

    return typeColorMap[typeName] || 'bg-purple-100 text-purple-800';
};

const removeEntity = async (entity: Entity) => {
    if (!confirm(`Are you sure you want to remove "${displayEntityName(entity)}" from this resource?`)) {
        return;
    }

    try {
        await removeEntityFromResource(props.resourceId, entity.id);
        emit('entity:removed', entity.id);
        notification.success(`Entity "${displayEntityName(entity)}" removed from resource`);
    } catch (error) {
        notification.error('Failed to remove entity from resource');
    }
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

    if (!confirm(`Are you sure you want to merge "${displayEntityName(selectedEntity.value)}" into "${displayEntityName(selectedTargetEntity.value)}"? This action cannot be undone.`)) {
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

const highlightEntityInContent = (entity: Entity) => {
    selectedHighlightEntity.value = entity;
    emit('entity:highlight', entity);
};
</script>