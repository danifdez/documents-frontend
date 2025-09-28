<template>
    <div class="bg-white p-4 shadow rounded-lg">
        <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-medium text-gray-900">Entities</h3>
            <span class="text-sm text-gray-500">{{ entities.length }} entities found</span>
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

        <div v-else class="space-y-3">
            <div v-for="entity in entities" :key="entity.id" @click="highlightEntityInContent(entity)"
                class="flex items-center justify-between p-3 border rounded-md transition-colors cursor-pointer" :class="[
                    selectedHighlightEntity?.id === entity.id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                ]" :title="`Click to highlight ${entity.name} in the document`">
                <div class="flex-1">
                    <div class="flex items-center space-x-3">
                        <div class="flex-1">
                            <h4 class="font-medium text-gray-900">{{ entity.name }}</h4>
                            <div class="flex items-center space-x-2 mt-1">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                    :class="getEntityTypeBadgeClass(entity.entityType.name)">
                                    {{ entity.entityType.name }}
                                </span>
                            </div>
                            <div v-if="entity.aliases && entity.aliases.length > 0" class="mt-2">
                                <p class="text-xs text-gray-500">
                                    Aliases: {{ entity.aliases.join(', ') }}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex items-center space-x-2" @click.stop>
                    <button @click="showMergeModal(entity)"
                        class="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        title="Merge with another entity">
                        <svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Merge
                    </button>
                    <button @click="removeEntity(entity)"
                        class="inline-flex items-center px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        title="Remove entity from resource">
                        <svg class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove
                    </button>
                </div>
            </div>
        </div>

        <!-- Merge Modal -->
        <div v-if="showMerge" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <h3 class="text-lg font-medium text-gray-900 mb-4">
                    Merge Entity: {{ selectedEntity?.name }}
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
                    <button v-for="result in searchResults" :key="result.id" @click="selectTargetEntity(result)"
                        class="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0 focus:outline-none focus:bg-gray-50">
                        <div class="font-medium">{{ result.name }}</div>
                        <div class="text-sm text-gray-500">{{ result.entityType.name }}</div>
                    </button>
                </div>

                <div v-else-if="searchTerm && !isSearching" class="text-center py-4 text-gray-500">
                    No entities found
                </div>

                <div class="flex justify-end space-x-3">
                    <button @click="closeMergeModal"
                        class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500">
                        Cancel
                    </button>
                    <button @click="performMerge" :disabled="!selectedTargetEntity || isMerging"
                        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                        <span v-if="isMerging">Merging...</span>
                        <span v-else>Merge</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, defineEmits } from 'vue';
import { useEntities, type Entity } from '../../services/entities/useEntities';
import { useNotification } from '../../composables/useNotification';

interface Props {
    resourceId: string;
    entities: Entity[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
    'entity:removed': [entityId: number];
    'entity:merged': [sourceEntityId: number, targetEntity: Entity];
    'entity:highlight': [entityName: string, aliases: string[]];
}>();

const selectedHighlightEntity = ref<Entity | null>(null);

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
    if (!confirm(`Are you sure you want to remove "${entity.name}" from this resource?`)) {
        return;
    }

    try {
        await removeEntityFromResource(props.resourceId, entity.id);
        emit('entity:removed', entity.id);
        notification.success(`Entity "${entity.name}" removed from resource`);
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

    if (!confirm(`Are you sure you want to merge "${selectedEntity.value.name}" into "${selectedTargetEntity.value.name}"? This action cannot be undone.`)) {
        return;
    }

    isMerging.value = true;
    try {
        const mergedEntity = await mergeEntities(selectedEntity.value.id, selectedTargetEntity.value.id);
        emit('entity:merged', selectedEntity.value.id, mergedEntity);
        notification.success(`Entity "${selectedEntity.value.name}" merged into "${mergedEntity.name}"`);
        closeMergeModal();
    } catch (error) {
        notification.error('Failed to merge entities');
    } finally {
        isMerging.value = false;
    }
};

const highlightEntityInContent = (entity: Entity) => {
    selectedHighlightEntity.value = entity;
    emit('entity:highlight', entity.name, entity.aliases || []);
};
</script>