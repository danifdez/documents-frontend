<template>
    <div class="h-full flex flex-col overflow-hidden">
        <div class="px-6 py-5 shrink-0">
            <!-- Header -->
            <PageHeader title="Entities" subtitle="Manage all entities across your projects">
                <template #actions>
                    <button @click="openCreateModal"
                        class="inline-flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-dark text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd"
                                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                                clip-rule="evenodd" />
                        </svg>
                        <span>New Entity</span>
                    </button>
                </template>
            </PageHeader>

            <!-- Search + Filters row -->
            <div class="flex items-center gap-3 mb-3">
                <div class="flex-1 max-w-md">
                    <SearchBar v-model="searchTerm" placeholder="Search by name, alias, or type..." />
                </div>
                <span class="text-xs text-text-muted">{{ filteredEntities.length }} of {{ entities.length }}</span>
            </div>

            <!-- Type filter chips -->
            <div class="flex flex-wrap gap-2">
                <button @click="selectedType = null"
                    class="px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer"
                    :class="selectedType === null
                        ? 'bg-accent text-white shadow-sm'
                        : 'bg-surface-elevated text-text-secondary border border-border hover:border-accent/30'">
                    All <span class="ml-1 opacity-70">{{ entities.length }}</span>
                </button>
                <button v-for="typeInfo in entityTypesWithCounts" :key="typeInfo.name"
                    @click="selectedType = typeInfo.name"
                    class="px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer"
                    :class="selectedType === typeInfo.name
                        ? getTypeChipActiveClass(typeInfo.name)
                        : 'bg-surface-elevated text-text-secondary border border-border hover:border-accent/30'">
                    {{ typeInfo.name }} <span class="ml-1 opacity-70">{{ typeInfo.count }}</span>
                </button>
            </div>

        </div>

        <!-- Content area - fills remaining space -->
        <div class="flex-1 min-h-0 px-6 pb-4 overflow-hidden">
            <!-- Loading -->
            <LoadingSpinner v-if="loading" size="lg" fullHeight />

            <!-- Empty state -->
            <div v-else-if="entities.length === 0" class="flex flex-col items-center justify-center h-full text-center">
                <svg class="h-12 w-12 text-text-muted mb-4" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <h3 class="text-lg font-medium text-text-primary mb-1">No entities yet</h3>
                <p class="text-sm text-text-muted">Entities will appear here once documents are processed</p>
            </div>

            <!-- No results -->
            <div v-else-if="filteredEntities.length === 0" class="flex flex-col items-center justify-center h-full text-center">
                <svg class="h-8 w-8 text-text-muted mb-3" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p class="text-sm text-text-muted">No entities match your search</p>
            </div>

            <!-- Entity list -->
            <div v-else class="bg-surface-elevated rounded-xl border border-border overflow-hidden h-full flex flex-col">
                <!-- Table header -->
                <div
                    class="grid grid-cols-[1.25rem_7rem_1fr_1fr_6.5rem] gap-3 px-4 py-2.5 border-b border-border bg-surface text-[11px] font-semibold text-text-muted uppercase tracking-wider shrink-0">
                    <span></span>
                    <span>Type</span>
                    <span>Name</span>
                    <span>Aliases</span>
                    <span class="text-right">Actions</span>
                </div>

                <!-- Rows -->
                <div class="divide-y divide-border-light flex-1 overflow-y-auto">
                    <div v-for="entity in filteredEntities" :key="entity.id">
                        <!-- View mode -->
                        <div v-if="editingId !== entity.id">
                            <div class="group grid grid-cols-[1.25rem_7rem_1fr_1fr_6.5rem] gap-3 items-center px-4 py-3 hover:bg-surface-hover transition-colors cursor-pointer"
                                @click="toggleExpand(entity)">
                                <!-- Expand chevron -->
                                <svg class="h-3.5 w-3.5 text-text-muted transition-transform duration-200"
                                    :class="{ 'rotate-90': expandedId === entity.id }" fill="none"
                                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                                </svg>

                                <!-- Type badge -->
                                <span
                                    class="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider"
                                    :class="getEntityTypeBadgeClass(entity.entityType?.name)">
                                    {{ entity.entityType?.name || '—' }}
                                </span>

                                <!-- Name + description -->
                                <div class="min-w-0">
                                    <span class="text-sm font-medium text-text-primary truncate block">{{
                                        entity.name }}</span>
                                    <span v-if="entity.description"
                                        class="text-xs text-text-muted truncate block mt-0.5">{{
                                            entity.description }}</span>
                                    <div v-if="entity.translations && Object.keys(entity.translations).length > 0"
                                        class="flex flex-wrap gap-1 mt-1">
                                        <span v-for="(value, locale) in entity.translations" :key="locale"
                                            class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100">
                                            {{ locale }}: {{ value }}
                                        </span>
                                    </div>
                                </div>

                                <!-- Aliases -->
                                <div class="min-w-0">
                                    <div v-if="entity.aliases && entity.aliases.length > 0"
                                        class="flex flex-wrap gap-1">
                                        <span v-for="(alias, i) in entity.aliases.slice(0, 4)" :key="i"
                                            class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-surface text-text-muted border border-border-light">
                                            {{ alias.value }}
                                        </span>
                                        <span v-if="entity.aliases.length > 4"
                                            class="text-[10px] text-text-muted self-center">
                                            +{{ entity.aliases.length - 4 }} more
                                        </span>
                                    </div>
                                    <span v-else class="text-xs text-text-muted">—</span>
                                </div>

                                <!-- Actions -->
                                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end"
                                    @click.stop>
                                    <button @click="startEditing(entity)"
                                        class="p-1.5 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                                        title="Edit">
                                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                                            stroke="currentColor" stroke-width="2">
                                            <path stroke-linecap="round" stroke-linejoin="round"
                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button @click="openMergeModal(entity)"
                                        class="p-1.5 rounded text-text-muted hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                                        title="Merge into another entity">
                                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                                            stroke="currentColor" stroke-width="2">
                                            <path stroke-linecap="round" stroke-linejoin="round"
                                                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                        </svg>
                                    </button>
                                    <button @click="confirmDelete(entity)"
                                        class="p-1.5 rounded text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                        title="Delete">
                                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                                            stroke="currentColor" stroke-width="2">
                                            <path stroke-linecap="round" stroke-linejoin="round"
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <!-- Expanded detail panel -->
                            <div v-if="expandedId === entity.id"
                                class="px-4 pb-4 pt-1 bg-surface-hover/50 border-t border-border-light">
                                <!-- Loading -->
                                <div v-if="loadingDetail" class="flex items-center gap-2 py-4 pl-6">
                                    <LoadingSpinner size="sm" />
                                    <span class="text-xs text-text-muted">Loading details...</span>
                                </div>

                                <div v-else-if="expandedDetail" class="pl-6 space-y-3">
                                    <!-- Resources -->
                                    <div>
                                        <h4 class="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                                            Resources
                                            <span class="font-normal ml-1">({{ expandedDetail.resources?.length || 0 }})</span>
                                        </h4>
                                        <div v-if="expandedDetail.resources && expandedDetail.resources.length > 0"
                                            class="space-y-1">
                                            <button v-for="resource in expandedDetail.resources"
                                                :key="resource.id" @click="navigateToResource(resource.id)"
                                                class="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-elevated border border-transparent hover:border-border transition-all cursor-pointer group/res">
                                                <!-- Document icon -->
                                                <svg class="h-4 w-4 text-text-muted shrink-0" fill="none"
                                                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                                                    <path stroke-linecap="round" stroke-linejoin="round"
                                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <div class="min-w-0 flex-1">
                                                    <span
                                                        class="text-sm text-text-primary group-hover/res:text-accent truncate block">
                                                        {{ resource.name }}
                                                    </span>
                                                    <span v-if="resource.project"
                                                        class="text-[11px] text-text-muted truncate block">
                                                        {{ resource.project.name }}
                                                    </span>
                                                </div>
                                                <svg class="h-3.5 w-3.5 text-text-muted opacity-0 group-hover/res:opacity-100 transition-opacity shrink-0"
                                                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                                    stroke-width="2">
                                                    <path stroke-linecap="round" stroke-linejoin="round"
                                                        d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </div>
                                        <p v-else class="text-xs text-text-muted pl-3 py-1">
                                            Not linked to any resources
                                        </p>
                                    </div>

                                    <!-- Projects -->
                                    <div v-if="expandedDetail.projects && expandedDetail.projects.length > 0">
                                        <h4 class="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                                            Projects
                                            <span class="font-normal ml-1">({{ expandedDetail.projects.length }})</span>
                                        </h4>
                                        <div class="flex flex-wrap gap-1.5">
                                            <button v-for="project in expandedDetail.projects"
                                                :key="project.id" @click="navigateToProject(project.id)"
                                                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-elevated border border-border text-xs text-text-secondary hover:border-accent/30 hover:text-accent transition-all cursor-pointer">
                                                <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24"
                                                    stroke="currentColor" stroke-width="2">
                                                    <path stroke-linecap="round" stroke-linejoin="round"
                                                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                                </svg>
                                                {{ project.name }}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Edit mode -->
                        <div v-else class="p-4 bg-accent-subtle/30 border-l-2 border-accent space-y-3">
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-medium text-text-secondary mb-1">Name</label>
                                    <input v-model="editForm.name" type="text"
                                        class="block w-full rounded-lg bg-surface-elevated border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                        placeholder="Entity name" />
                                </div>
                                <div>
                                    <label class="block text-xs font-medium text-text-secondary mb-1">Type</label>
                                    <select v-model="editForm.entityTypeId"
                                        class="block w-full rounded-lg bg-surface-elevated border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                                        <option v-for="et in entityTypes" :key="et.id" :value="et.id">{{
                                            et.name }}
                                        </option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label
                                    class="block text-xs font-medium text-text-secondary mb-1">Description</label>
                                <textarea v-model="editForm.description" rows="2"
                                    class="block w-full rounded-lg bg-surface-elevated border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                                    placeholder="Optional description"></textarea>
                            </div>
                            <div class="flex justify-end gap-2">
                                <Button @click="cancelEditing" variant="secondary" size="small">Cancel</Button>
                                <Button @click="saveEditing" variant="info" size="small" :disabled="saving">
                                    {{ saving ? 'Saving...' : 'Save' }}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <!-- Create Entity Modal -->
        <Teleport to="body">
            <Transition name="modal">
                <div v-if="showCreateModal"
                    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div
                        class="bg-surface-elevated rounded-xl shadow-2xl shadow-black/10 border border-border max-w-md w-full mx-4 overflow-hidden">
                        <div class="px-6 py-4 border-b border-border-light">
                            <h3 class="text-base font-semibold text-text-primary tracking-tight">New Entity</h3>
                        </div>
                        <div class="px-6 py-5 space-y-4">
                            <div>
                                <label class="block text-xs font-medium text-text-secondary mb-1.5">Name *</label>
                                <input v-model="createForm.name" type="text"
                                    class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                    placeholder="Entity name" />
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-text-secondary mb-1.5">Type *</label>
                                <select v-model="createForm.entityTypeId"
                                    class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                                    <option :value="0" disabled>Select a type...</option>
                                    <option v-for="et in entityTypes" :key="et.id" :value="et.id">{{ et.name }}
                                    </option>
                                </select>
                            </div>
                            <div>
                                <label
                                    class="block text-xs font-medium text-text-secondary mb-1.5">Description</label>
                                <textarea v-model="createForm.description" rows="2"
                                    class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                                    placeholder="Optional description"></textarea>
                            </div>
                        </div>
                        <div class="px-6 py-4 border-t border-border-light flex justify-end gap-2.5">
                            <Button @click="showCreateModal = false" variant="secondary">Cancel</Button>
                            <Button @click="handleCreate" variant="info"
                                :disabled="!createForm.name.trim() || !createForm.entityTypeId || creating">
                                {{ creating ? 'Creating...' : 'Create' }}
                            </Button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- Merge Modal -->
        <Teleport to="body">
            <Transition name="modal">
                <div v-if="showMergeModal"
                    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div
                        class="bg-surface-elevated rounded-xl shadow-2xl shadow-black/10 border border-border max-w-md w-full mx-4 overflow-hidden">
                        <div class="px-6 py-4 border-b border-border-light">
                            <h3 class="text-base font-semibold text-text-primary tracking-tight">
                                Merge: {{ mergeSource?.name }}
                            </h3>
                            <p class="text-xs text-text-muted mt-1">Search for the target entity to merge into</p>
                        </div>
                        <div class="px-6 py-5">
                            <input v-model="mergeSearchTerm" @input="debouncedMergeSearch" type="text"
                                class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent mb-3"
                                placeholder="Type entity name..." />

                            <div v-if="mergeSearching" class="text-center py-4">
                                <div class="inline-flex items-center gap-2 text-sm text-text-muted">
                                    <LoadingSpinner size="sm" />
                                    Searching...
                                </div>
                            </div>

                            <div v-else-if="mergeResults.length > 0"
                                class="max-h-48 overflow-y-auto border border-border rounded-lg">
                                <div
                                    class="px-3 py-1.5 text-[11px] text-text-muted border-b border-border-light font-medium uppercase tracking-wider">
                                    {{ mergeResults.length }} found
                                </div>
                                <button v-for="result in mergeResults" :key="result.id"
                                    @click="mergeTarget = result"
                                    class="w-full text-left px-3 py-2.5 hover:bg-surface-hover transition-colors cursor-pointer border-b border-border-light last:border-b-0 flex items-center gap-2.5"
                                    :class="mergeTarget?.id === result.id ? 'bg-accent-subtle' : ''">
                                    <span
                                        class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider shrink-0"
                                        :class="getEntityTypeBadgeClass(result.entityType?.name)">
                                        {{ result.entityType?.name }}
                                    </span>
                                    <div class="min-w-0">
                                        <div class="text-sm font-medium text-text-primary truncate">{{ result.name }}
                                        </div>
                                        <div v-if="result.aliases && result.aliases.length > 0"
                                            class="text-[11px] text-text-muted truncate">
                                            {{ result.aliases.map(a => a.value).join(', ') }}
                                        </div>
                                    </div>
                                </button>
                            </div>

                            <div v-else-if="mergeSearchTerm && !mergeSearching"
                                class="text-center py-4 text-sm text-text-muted">
                                No entities found
                            </div>
                        </div>
                        <div class="px-6 py-4 border-t border-border-light flex justify-end gap-2.5">
                            <Button @click="closeMergeModal" variant="secondary">Cancel</Button>
                            <Button @click="handleMerge" variant="warning" :disabled="!mergeTarget || merging">
                                {{ merging ? 'Merging...' : 'Merge' }}
                            </Button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- Delete Confirm Modal -->
        <ConfirmModal :is-open="showDeleteModal" title="Delete Entity"
            :message="`Are you sure you want to delete &quot;${entityToDelete?.name}&quot;? This will remove it from all resources and cannot be undone.`"
            confirm-text="Delete" cancel-text="Cancel" confirm-variant="danger" @confirm="handleDelete"
            @cancel="showDeleteModal = false" />

        <!-- Merge Confirm Modal -->
        <ConfirmModal :is-open="showMergeConfirm" title="Confirm Merge"
            :message="`Merge &quot;${mergeSource?.name}&quot; into &quot;${mergeTarget?.name}&quot;? The source entity will become an alias of the target. This cannot be undone.`"
            confirm-text="Merge" cancel-text="Cancel" confirm-variant="warning" @confirm="executeMerge"
            @cancel="showMergeConfirm = false" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import SearchBar from '../components/ui/SearchBar.vue';
import LoadingSpinner from '../components/ui/LoadingSpinner.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import { useEntities, type Entity, type EntityDetail } from '../services/entities/useEntities';
import { useEntityTypes, type EntityType } from '../services/entity-types/useEntityTypes';
import { useNotification } from '../composables/useNotification';
import Button from '../components/ui/Button.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';

const router = useRouter();
const { getAllEntities, updateEntity, deleteEntity, createEntity, mergeEntities, searchEntities, getEntityById } = useEntities();
const { fetchEntityTypes } = useEntityTypes();
const notification = useNotification();

// State
const entities = ref<Entity[]>([]);
const entityTypes = ref<EntityType[]>([]);
const loading = ref(true);
const searchTerm = ref('');
const selectedType = ref<string | null>(null);

// Entity types with counts
const entityTypesWithCounts = computed(() => {
    const counts: Record<string, number> = {};
    for (const entity of entities.value) {
        const typeName = entity.entityType?.name || 'Unknown';
        counts[typeName] = (counts[typeName] || 0) + 1;
    }
    return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
});

// Filtered entities
const filteredEntities = computed(() => {
    let result = entities.value;

    if (selectedType.value) {
        result = result.filter(e => e.entityType?.name === selectedType.value);
    }

    const q = searchTerm.value.trim().toLowerCase();
    if (q) {
        result = result.filter(entity => {
            if ((entity.name || '').toLowerCase().includes(q)) return true;
            if (entity.entityType?.name?.toLowerCase().includes(q)) return true;
            if (entity.description?.toLowerCase().includes(q)) return true;
            if (entity.aliases) {
                for (const a of entity.aliases) {
                    if ((a.value || '').toLowerCase().includes(q)) return true;
                }
            }
            if (entity.translations) {
                for (const v of Object.values(entity.translations)) {
                    if ((v || '').toLowerCase().includes(q)) return true;
                }
            }
            return false;
        });
    }

    return result;
});

// Expand state (to show where the entity appears)
const expandedId = ref<number | null>(null);
const expandedDetail = ref<EntityDetail | null>(null);
const loadingDetail = ref(false);

const toggleExpand = async (entity: Entity) => {
    if (expandedId.value === entity.id) {
        expandedId.value = null;
        expandedDetail.value = null;
        return;
    }
    expandedId.value = entity.id;
    expandedDetail.value = null;
    loadingDetail.value = true;
    try {
        expandedDetail.value = await getEntityById(entity.id);
    } catch {
        notification.error('Failed to load entity details');
        expandedId.value = null;
    } finally {
        loadingDetail.value = false;
    }
};

const navigateToResource = (resourceId: number) => {
    router.push(`/resource/${resourceId}`);
};

const navigateToProject = (projectId: number) => {
    router.push(`/project/${projectId}`);
};

// Edit state
const editingId = ref<number | null>(null);
const editForm = ref({ name: '', description: '', entityTypeId: 0 });
const saving = ref(false);

const startEditing = (entity: Entity) => {
    editingId.value = entity.id;
    editForm.value = {
        name: entity.name,
        description: entity.description || '',
        entityTypeId: entity.entityType?.id || 0,
    };
};

const cancelEditing = () => {
    editingId.value = null;
};

const saveEditing = async () => {
    if (!editingId.value || !editForm.value.name.trim()) return;
    saving.value = true;
    try {
        const data: { name?: string; description?: string; entityTypeId?: number } = {
            name: editForm.value.name.trim(),
        };
        if (editForm.value.description.trim()) {
            data.description = editForm.value.description.trim();
        }
        if (editForm.value.entityTypeId) {
            data.entityTypeId = editForm.value.entityTypeId;
        }
        await updateEntity(editingId.value, data);
        const idx = entities.value.findIndex(e => e.id === editingId.value);
        if (idx !== -1) {
            entities.value[idx].name = data.name!;
            entities.value[idx].description = data.description || null;
            if (data.entityTypeId) {
                const et = entityTypes.value.find(t => t.id === data.entityTypeId);
                if (et) entities.value[idx].entityType = { id: et.id, name: et.name, description: et.description };
            }
        }
        editingId.value = null;
        notification.success('Entity updated');
    } catch {
        notification.error('Failed to update entity');
    } finally {
        saving.value = false;
    }
};

// Delete state
const showDeleteModal = ref(false);
const entityToDelete = ref<Entity | null>(null);

const confirmDelete = (entity: Entity) => {
    entityToDelete.value = entity;
    showDeleteModal.value = true;
};

const handleDelete = async () => {
    showDeleteModal.value = false;
    if (!entityToDelete.value) return;
    try {
        await deleteEntity(entityToDelete.value.id);
        entities.value = entities.value.filter(e => e.id !== entityToDelete.value!.id);
        notification.success(`"${entityToDelete.value.name}" deleted`);
    } catch {
        notification.error('Failed to delete entity');
    } finally {
        entityToDelete.value = null;
    }
};

// Merge state
const showMergeModal = ref(false);
const showMergeConfirm = ref(false);
const mergeSource = ref<Entity | null>(null);
const mergeTarget = ref<Entity | null>(null);
const mergeSearchTerm = ref('');
const mergeResults = ref<Entity[]>([]);
const mergeSearching = ref(false);
const merging = ref(false);
let mergeSearchTimeout: ReturnType<typeof setTimeout> | null = null;

const openMergeModal = (entity: Entity) => {
    mergeSource.value = entity;
    mergeTarget.value = null;
    mergeSearchTerm.value = '';
    mergeResults.value = [];
    showMergeModal.value = true;
};

const closeMergeModal = () => {
    showMergeModal.value = false;
    mergeSource.value = null;
    mergeTarget.value = null;
    mergeSearchTerm.value = '';
    mergeResults.value = [];
    if (mergeSearchTimeout) clearTimeout(mergeSearchTimeout);
};

const debouncedMergeSearch = () => {
    if (mergeSearchTimeout) clearTimeout(mergeSearchTimeout);
    mergeSearchTimeout = setTimeout(async () => {
        if (mergeSearchTerm.value.trim().length < 1) {
            mergeResults.value = [];
            return;
        }
        mergeSearching.value = true;
        try {
            const results = await searchEntities(mergeSearchTerm.value);
            mergeResults.value = results.filter(e => e.id !== mergeSource.value?.id);
        } catch {
            notification.error('Search failed');
        } finally {
            mergeSearching.value = false;
        }
    }, 300);
};

const handleMerge = () => {
    if (!mergeSource.value || !mergeTarget.value) return;
    showMergeConfirm.value = true;
};

const executeMerge = async () => {
    showMergeConfirm.value = false;
    if (!mergeSource.value || !mergeTarget.value) return;
    merging.value = true;
    try {
        const merged = await mergeEntities(mergeSource.value.id, mergeTarget.value.id);
        entities.value = entities.value.filter(e => e.id !== mergeSource.value!.id);
        const idx = entities.value.findIndex(e => e.id === mergeTarget.value!.id);
        if (idx !== -1) {
            entities.value[idx] = merged;
        }
        notification.success(`"${mergeSource.value.name}" merged into "${mergeTarget.value.name}"`);
        closeMergeModal();
    } catch {
        notification.error('Failed to merge entities');
    } finally {
        merging.value = false;
    }
};

// Create state
const showCreateModal = ref(false);
const creating = ref(false);
const createForm = ref({ name: '', entityTypeId: 0, description: '' });

const openCreateModal = () => {
    createForm.value = { name: '', entityTypeId: 0, description: '' };
    showCreateModal.value = true;
};

const handleCreate = async () => {
    if (!createForm.value.name.trim() || !createForm.value.entityTypeId) return;
    creating.value = true;
    try {
        const data: { name: string; entityTypeId: number; description?: string } = {
            name: createForm.value.name.trim(),
            entityTypeId: createForm.value.entityTypeId,
        };
        if (createForm.value.description.trim()) {
            data.description = createForm.value.description.trim();
        }
        const created = await createEntity(data);
        entities.value.push(created);
        entities.value.sort((a, b) => a.name.localeCompare(b.name));
        showCreateModal.value = false;
        notification.success(`"${created.name}" created`);
    } catch {
        notification.error('Failed to create entity');
    } finally {
        creating.value = false;
    }
};

// Badge colors
const getEntityTypeBadgeClass = (typeName: string | undefined) => {
    const map: Record<string, string> = {
        'PERSON': 'bg-blue-100 text-blue-800',
        'ORGANIZATION': 'bg-green-100 text-green-800',
        'LOCATION': 'bg-yellow-100 text-yellow-800',
        'GEOPOLITICAL': 'bg-orange-100 text-orange-800',
        'NATIONALITY': 'bg-teal-100 text-teal-800',
        'EVENT': 'bg-pink-100 text-pink-800',
        'FACILITY': 'bg-cyan-100 text-cyan-800',
        'PRODUCT': 'bg-lime-100 text-lime-800',
        'WORK_OF_ART': 'bg-rose-100 text-rose-800',
        'LANGUAGE': 'bg-violet-100 text-violet-800',
        'LAW': 'bg-amber-100 text-amber-800',
    };
    return map[typeName || ''] || 'bg-surface-hover text-text-primary';
};

const getTypeChipActiveClass = (typeName: string) => {
    const map: Record<string, string> = {
        'PERSON': 'bg-blue-500 text-white shadow-sm',
        'ORGANIZATION': 'bg-green-500 text-white shadow-sm',
        'LOCATION': 'bg-yellow-500 text-white shadow-sm',
        'GEOPOLITICAL': 'bg-orange-500 text-white shadow-sm',
        'NATIONALITY': 'bg-teal-500 text-white shadow-sm',
        'EVENT': 'bg-pink-500 text-white shadow-sm',
        'FACILITY': 'bg-cyan-500 text-white shadow-sm',
        'PRODUCT': 'bg-lime-500 text-white shadow-sm',
        'WORK_OF_ART': 'bg-rose-500 text-white shadow-sm',
        'LANGUAGE': 'bg-violet-500 text-white shadow-sm',
        'LAW': 'bg-amber-500 text-white shadow-sm',
    };
    return map[typeName] || 'bg-gray-500 text-white shadow-sm';
};

// Load data
onMounted(async () => {
    try {
        const [allEntities, allTypes] = await Promise.all([
            getAllEntities(),
            fetchEntityTypes(),
        ]);
        entities.value = allEntities;
        entityTypes.value = allTypes;
    } catch {
        notification.error('Failed to load entities');
    } finally {
        loading.value = false;
    }
});
</script>

<style scoped>
.modal-enter-active {
    transition: opacity 0.2s ease;
}

.modal-leave-active {
    transition: opacity 0.15s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}
</style>
