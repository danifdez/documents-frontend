<template>
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <!-- Header -->
            <div class="px-6 py-4 border-b border-gray-200">
                <h3 class="text-lg font-semibold text-gray-900">Merge Entity as Alias</h3>
                <p class="text-sm text-gray-600 mt-1">
                    Convert "<span class="font-medium">{{ sourceEntity?.name }}</span>" into an alias of another entity
                </p>
            </div>

            <!-- Body -->
            <div class="px-6 py-4 overflow-y-auto flex-1">
                <!-- Target Entity Selection -->
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Target Entity</label>
                    <input v-model="searchTerm" type="text" placeholder="Search for entity..."
                        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm mb-2"
                        @input="onSearchChange" />

                    <!-- Entity list -->
                    <div class="border rounded-md max-h-60 overflow-y-auto">
                        <!-- Pending entities section -->
                        <div v-if="filteredPendingEntities.length > 0" class="border-b">
                            <div class="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700">
                                Pending Entities (this document)
                            </div>
                            <div v-for="entity in filteredPendingEntities" :key="'pending-' + entity.id"
                                @click="selectTargetEntity('pending', entity)" :class="[
                                    'px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors',
                                    selectedTarget?.type === 'pending' && selectedTarget.id === entity.id
                                        ? 'bg-blue-100'
                                        : ''
                                ]">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <div class="text-sm font-medium">{{ entity.name }}</div>
                                        <div class="text-xs text-gray-600">{{ entity.entityType?.name }} · {{
                                            entity.scope }}</div>
                                    </div>
                                    <div v-if="selectedTarget?.type === 'pending' && selectedTarget.id === entity.id"
                                        class="text-blue-600">
                                        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd"
                                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                clip-rule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Confirmed entities section -->
                        <div v-if="filteredConfirmedEntities.length > 0">
                            <div class="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700">
                                Confirmed Entities (global)
                            </div>
                            <div v-for="entity in filteredConfirmedEntities" :key="'confirmed-' + entity.id"
                                @click="selectTargetEntity('confirmed', entity)" :class="[
                                    'px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors',
                                    selectedTarget?.type === 'confirmed' && selectedTarget.id === entity.id
                                        ? 'bg-blue-100'
                                        : ''
                                ]">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <div class="text-sm font-medium">{{ entity.name }}</div>
                                        <div class="text-xs text-gray-600">{{ entity.entityType?.name }}</div>
                                    </div>
                                    <div v-if="selectedTarget?.type === 'confirmed' && selectedTarget.id === entity.id"
                                        class="text-blue-600">
                                        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd"
                                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                clip-rule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- No results -->
                        <div v-if="filteredPendingEntities.length === 0 && filteredConfirmedEntities.length === 0"
                            class="px-3 py-4 text-center text-sm text-gray-500">
                            No entities found
                        </div>
                    </div>
                </div>

                <!-- Alias Scope Selection -->
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Alias Scope</label>
                    <select v-model="aliasScope"
                        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm">
                        <option value="global">Global - Available in all projects</option>
                        <option value="project">Project - Available only in this project</option>
                        <option value="document">Document - Available only in this document</option>
                    </select>
                    <p class="text-xs text-gray-500 mt-1">
                        This determines where the alias will be recognized
                    </p>
                </div>

                <!-- Info box -->
                <div class="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div class="flex items-start">
                        <svg class="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor"
                            viewBox="0 0 20 20">
                            <path fill-rule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clip-rule="evenodd" />
                        </svg>
                        <div class="text-xs text-blue-800">
                            <p class="font-medium mb-1">What happens when you merge?</p>
                            <ul class="list-disc list-inside space-y-1">
                                <li>The source entity "{{ sourceEntity?.name }}" will be removed from pending entities
                                </li>
                                <li>It will be added as an alias to the target entity</li>
                                <li>All future occurrences will reference the target entity</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <Button @click="close" variant="secondary" :disabled="isProcessing">
                    Cancel
                </Button>
                <Button @click="confirmMerge" variant="primary" :disabled="!selectedTarget || isProcessing">
                    <svg v-if="isProcessing" class="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg"
                        fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4">
                        </circle>
                        <path class="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                        </path>
                    </svg>
                    {{ isProcessing ? 'Merging...' : 'Merge' }}
                </Button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Button from '../ui/Button.vue';
import apiClient from '../../services/api';
import type { PendingEntity, EntityScope } from '../../services/entities/usePendingEntities';

interface ConfirmedEntity {
    id: number;
    name: string;
    entityType?: {
        id: number;
        name: string;
    };
}

interface Props {
    isOpen: boolean;
    sourceEntity: PendingEntity | null;
    pendingEntities: PendingEntity[];
    resourceId: string;
}

interface Emits {
    (e: 'close'): void;
    (e: 'merge', payload: { targetType: 'pending' | 'confirmed', targetId: number, aliasScope: EntityScope }): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const searchTerm = ref('');
const selectedTarget = ref<{ type: 'pending' | 'confirmed', id: number } | null>(null);
const aliasScope = ref<EntityScope>('global');
const isProcessing = ref(false);
const confirmedEntities = ref<ConfirmedEntity[]>([]);

// Filter pending entities (exclude source entity)
const filteredPendingEntities = computed(() => {
    const term = searchTerm.value.toLowerCase();
    return props.pendingEntities
        .filter(e => e.id !== props.sourceEntity?.id)
        .filter(e => !term || e.name.toLowerCase().includes(term) || e.entityType?.name.toLowerCase().includes(term));
});

// Filter confirmed entities
const filteredConfirmedEntities = computed(() => {
    const term = searchTerm.value.toLowerCase();
    return confirmedEntities.value
        .filter(e => !term || e.name.toLowerCase().includes(term) || e.entityType?.name.toLowerCase().includes(term));
});

// Load confirmed entities when modal opens
watch(() => props.isOpen, async (isOpen) => {
    if (isOpen) {
        selectedTarget.value = null;
        searchTerm.value = '';
        aliasScope.value = 'global';
        await loadConfirmedEntities();
    }
});

const loadConfirmedEntities = async () => {
    try {
        if (searchTerm.value.trim()) {
            const response = await apiClient.get(`/entities/search?term=${encodeURIComponent(searchTerm.value)}`);
            confirmedEntities.value = response.data;
        } else {
            // Don't load all entities by default, wait for search
            confirmedEntities.value = [];
        }
    } catch (error) {
        console.error('Failed to load confirmed entities:', error);
    }
};

const onSearchChange = () => {
    // Debounce search
    if (searchTerm.value.trim().length >= 2) {
        loadConfirmedEntities();
    } else {
        confirmedEntities.value = [];
    }
};

const selectTargetEntity = (type: 'pending' | 'confirmed', entity: PendingEntity | ConfirmedEntity) => {
    selectedTarget.value = { type, id: entity.id };
};

const confirmMerge = () => {
    if (!selectedTarget.value) return;

    isProcessing.value = true;
    emit('merge', {
        targetType: selectedTarget.value.type,
        targetId: selectedTarget.value.id,
        aliasScope: aliasScope.value
    });
};

const close = () => {
    if (!isProcessing.value) {
        emit('close');
    }
};
</script>
