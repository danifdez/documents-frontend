<template>
    <div class="bg-surface-elevated rounded-xl border border-border">
        <!-- Header with progress -->
        <div class="px-4 py-3 border-b border-border-light">
            <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-semibold text-text-primary">Pending Entities</h3>
                <div class="flex items-center gap-2">
                    <button @click="showAddEntityForm = !showAddEntityForm"
                        class="p-1 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                        title="Add entity">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                    <button @click="confirmAllEntities" :disabled="isConfirming || confirmableEntitiesCount === 0"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-dark text-white text-xs font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                        <div v-if="isConfirming"
                            class="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <svg v-else class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Confirm All
                    </button>
                </div>
            </div>
            <!-- Progress bar -->
            <div v-if="pendingEntities.length > 0" class="flex items-center gap-2">
                <div class="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                    <div class="h-full bg-accent rounded-full transition-all duration-500"
                        :style="{ width: `${confirmedPercent}%` }"></div>
                </div>
                <span class="text-[11px] text-text-muted shrink-0">{{ confirmedCount }}/{{ pendingEntities.length
                    }}</span>
            </div>
        </div>

        <!-- Add Entity Form (collapsible) -->
        <div v-if="showAddEntityForm" class="px-4 py-3 border-b border-border-light bg-surface">
            <div class="space-y-2.5">
                <input v-model="newEntity.name" type="text"
                    class="block w-full rounded-lg bg-surface-elevated border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    placeholder="Entity name..." />
                <div class="flex gap-2">
                    <select v-model="newEntity.entityTypeId"
                        class="flex-1 rounded-lg bg-surface-elevated border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                        <option :value="undefined">Type...</option>
                        <option v-for="type in entityTypes" :key="type.id" :value="type.id">{{ type.name }}</option>
                    </select>
                    <button @click="addNewEntity" :disabled="!newEntity.name.trim()"
                        class="px-3 py-1.5 bg-accent text-white text-xs font-medium rounded-lg disabled:opacity-40 cursor-pointer">
                        Add
                    </button>
                    <button @click="cancelAddEntity"
                        class="px-3 py-1.5 text-text-muted text-xs hover:text-text-secondary cursor-pointer">
                        Cancel
                    </button>
                </div>
            </div>
        </div>

        <!-- Empty state -->
        <div v-if="pendingEntities.length === 0" class="px-4 py-10 text-center">
            <svg class="mx-auto h-8 w-8 text-text-muted mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm text-text-muted">No pending entities to validate</p>
        </div>

        <!-- Entity list -->
        <div v-else class="max-h-[60vh] overflow-y-auto">
            <div v-for="entity in pendingEntities" :key="entity.id"
                class="border-b border-border-light last:border-b-0 transition-colors"
                :class="[
                    entity.isConfirmed ? 'bg-green-50/50' : entity.status === 'merged' ? 'bg-amber-50/30' : 'hover:bg-surface-hover'
                ]">

                <!-- Expanded edit mode -->
                <div v-if="expandedEntityId === entity.id" class="px-4 py-3 bg-surface/50">
                    <!-- Merged info banner -->
                    <div v-if="entity.status === 'merged'"
                        class="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
                        <svg class="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Merged into <span class="font-medium">{{ entity.mergedTargetName || entity.mergedTargetId }}</span>
                    </div>

                    <!-- Compact grid: Name + Translation side by side -->
                    <div class="grid gap-2" :class="showTranslationField ? 'grid-cols-2' : 'grid-cols-1'">
                        <div>
                            <label class="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-0.5">Name (EN)</label>
                            <input v-model="entity.name" type="text" @input="scheduleSave(entity)"
                                class="block w-full rounded-md bg-surface-elevated border border-border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                        </div>
                        <div v-if="showTranslationField">
                            <label class="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-0.5">{{ translationLocale.toUpperCase() }}</label>
                            <input v-model="(entity as PendingEntityWithEdit)._editedTranslation" type="text" @input="scheduleSave(entity, true)"
                                class="block w-full rounded-md bg-surface-elevated border border-border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                        </div>
                    </div>

                    <!-- Type + Scope row -->
                    <div class="grid grid-cols-2 gap-2 mt-2">
                        <div>
                            <label class="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-0.5">Type</label>
                            <select v-if="entity.status !== 'merged'" v-model="entity.entityType" @change="handleEntityTypeChange(entity)"
                                class="w-full rounded-md bg-surface-elevated border border-border px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                                <option :value="null">Select...</option>
                                <option v-for="type in entityTypes" :key="type.id" :value="type">{{ type.name }}</option>
                            </select>
                            <div v-else class="text-xs text-text-secondary px-2 py-1.5 bg-surface-elevated rounded-md border border-border">
                                {{ entity.entityType?.name || '—' }}
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-0.5">Scope</label>
                            <select v-model="entity.scope" @change="scheduleSave(entity)"
                                class="w-full rounded-md bg-surface-elevated border border-border px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                                <option value="global">Global</option>
                                <option value="project">Project</option>
                                <option value="document">Document</option>
                            </select>
                        </div>
                    </div>

                    <!-- Description (full width row) -->
                    <div v-if="entity.status !== 'merged'" class="mt-2">
                        <label class="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-0.5">Description</label>
                        <textarea v-model="entity.description" @input="scheduleSave(entity)" rows="2"
                            class="w-full rounded-md bg-surface-elevated border border-border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                            placeholder="Optional description..."></textarea>
                    </div>

                    <!-- Context (collapsed, small) -->
                    <div v-if="entity.contextSelection" class="mt-2 text-[11px] text-text-muted truncate" :title="entity.contextSelection.text">
                        <span class="font-medium">Context:</span> "{{ entity.contextSelection.text }}"
                    </div>

                    <!-- Footer: save status + actions -->
                    <div class="flex items-center justify-between mt-2.5 pt-2 border-t border-border-light">
                        <span v-if="isSaving === entity.id" class="text-[11px] text-text-muted flex items-center gap-1">
                            <div class="animate-spin rounded-full h-3 w-3 border-2 border-accent border-t-transparent"></div>
                            Saving...
                        </span>
                        <span v-else></span>
                        <div class="flex items-center gap-2">
                            <button @click="cancelEditEntity(entity)"
                                class="text-[11px] text-text-muted hover:text-red-500 cursor-pointer">
                                Cancel
                            </button>
                            <button @click="expandedEntityId = null"
                                class="text-[11px] px-3 py-1 bg-accent text-white rounded-md hover:bg-accent-dark cursor-pointer font-medium">
                                Done
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Compact row (default view) -->
                <div v-else class="group px-4 py-2 flex items-center gap-2">
                    <!-- Confirm checkbox / status -->
                    <button v-if="!entity.isConfirmed && entity.status !== 'merged'"
                        @click.stop="quickConfirmEntity(entity)"
                        class="shrink-0 w-[18px] h-[18px] rounded border-2 border-border hover:border-green-400 hover:bg-green-50 transition-all cursor-pointer flex items-center justify-center"
                        title="Confirm entity">
                    </button>
                    <div v-else-if="entity.isConfirmed"
                        class="shrink-0 w-[18px] h-[18px] rounded bg-green-500 flex items-center justify-center" title="Confirmed">
                        <svg class="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div v-else-if="entity.status === 'merged'"
                        class="shrink-0 w-[18px] h-[18px] rounded bg-amber-400 flex items-center justify-center" title="Merged">
                        <svg class="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </div>

                    <!-- Entity name + type (clickable to edit) -->
                    <div class="flex-1 min-w-0 flex items-center gap-2 cursor-pointer" @click="startEditEntity(entity)">
                        <span class="text-[13px] font-medium truncate"
                            :class="entity.isConfirmed ? 'text-text-muted line-through' : entity.status === 'merged' ? 'text-text-muted' : 'text-text-primary'">
                            {{ getEntityDisplayText(entity) }}
                        </span>
                        <span v-if="entity.entityType"
                            class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 leading-none"
                            :class="getEntityTypeBadgeClass(entity.entityType?.name)">
                            {{ entity.entityType?.name }}
                        </span>
                    </div>

                    <!-- Hover actions -->
                    <div class="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button v-if="entity.status === 'merged'" @click.stop="cancelMerge(entity)"
                            class="p-1 rounded text-amber-500 hover:bg-amber-50 transition-colors cursor-pointer" title="Undo merge">
                            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                        </button>
                        <button v-if="!entity.isConfirmed && entity.status !== 'merged'" @click.stop="openMergeModal(entity)"
                            class="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-surface transition-colors cursor-pointer" title="Merge">
                            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                        </button>
                        <button @click.stop="highlightEntity(entity)"
                            class="p-1 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer" title="Highlight">
                            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </button>
                        <button @click.stop="deleteEntity(entity.id, entity.isConfirmed)"
                            class="p-1 rounded text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                            :title="entity.isConfirmed ? 'Remove' : 'Delete'">
                            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Merge Entity Modal -->
        <MergeEntityModal :is-open="showMergeModal" :source-entity="entityToMerge" :pending-entities="pendingEntities"
            :resource-id="resourceId" @close="closeMergeModal" @merge="handleMerge" />

        <!-- Duplicate Warning Modal -->
        <ConfirmModal :is-open="duplicateWarningModal.isOpen" title="Duplicate Entity Detected"
            :message="`An entity named &quot;${duplicateWarningModal.newName}&quot; already exists. Merge with the existing one?`"
            confirm-text="Merge Entities" cancel-text="Cancel" confirm-variant="primary"
            @confirm="handleMergeFromDuplicate" @cancel="closeDuplicateWarning" />

        <!-- Generic Confirm Modal -->
        <ConfirmModal :is-open="confirmModal.isOpen" :title="confirmModal.title" :message="confirmModal.message"
            :confirm-text="confirmModal.confirmText" :cancel-text="confirmModal.cancelText"
            :confirm-variant="confirmModal.variant" @confirm="confirmModal.onConfirm" @cancel="closeConfirmModal" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import Button from '../ui/Button.vue';
import MergeEntityModal from './MergeEntityModal.vue';
import ConfirmModal from '../ui/ConfirmModal.vue';
import { usePendingEntities, type PendingEntity, type EntityAlias, type EntityScope } from '../../services/entities/usePendingEntities';
import { useEntities } from '../../services/entities/useEntities';
import apiClient from '../../services/api';

export interface EntityType {
    id: number;
    name: string;
    description?: string;
}
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

// --- State ---
const pendingEntities = ref<PendingEntityWithEdit[]>([]);
const entityTypes = ref<EntityType[]>([]);
const isSaving = ref<number | null>(null);
const isConfirming = ref(false);
const showAddEntityForm = ref(false);
const expandedEntityId = ref<number | null>(null);
const newEntity = ref({ name: '', description: '', entityTypeId: undefined as number | undefined, scope: 'document' as 'document' });

const showMergeModal = ref(false);
const entityToMerge = ref<PendingEntity | null>(null);
const originalEntityNames = new Map<number, string>();
const editSnapshot = ref<Record<string, any> | null>(null);

const duplicateWarningModal = ref({
    isOpen: false,
    currentEntity: null as PendingEntity | null,
    duplicateEntity: null as PendingEntity | null,
    newName: ''
});

const confirmModal = ref({
    isOpen: false, title: '', message: '', confirmText: 'Confirm', cancelText: 'Cancel',
    variant: 'primary' as 'primary' | 'danger', onConfirm: () => { }
});

// --- Computed ---
const confirmedCount = computed(() => pendingEntities.value.filter(e => e.isConfirmed).length);
const confirmableEntitiesCount = computed(() => pendingEntities.value.filter(e => e.status !== 'merged' && !e.isConfirmed).length);
const confirmedPercent = computed(() => pendingEntities.value.length ? (confirmedCount.value / pendingEntities.value.length) * 100 : 0);
const translationLocale = computed(() => props.displayMode === 'translated' ? props.targetLanguage : props.resourceLanguage);
const showTranslationField = computed(() =>
    (props.displayMode === 'translated' && props.targetLanguage !== 'en') ||
    (props.displayMode === 'extracted' && props.resourceLanguage !== 'en')
);

// --- Services ---
const { fetchPendingEntitiesByResourceId, updatePendingEntity, deletePendingEntity, confirmEntities, createPendingEntity } = usePendingEntities();
const { updateEntity } = useEntities();

// --- Helpers ---
const highlightEntity = (entity: PendingEntity) => emit('entity:highlight', entity);

const getEntityDisplayText = (entity: PendingEntity): string => {
    if (props.displayMode === 'translated' && entity.translations) {
        return entity.translations[props.targetLanguage] || entity.name;
    }
    if (props.resourceLanguage !== 'en' && entity.translations?.[props.resourceLanguage]) {
        return entity.translations[props.resourceLanguage];
    }
    return entity.name;
};

const getEntityTypeBadgeClass = (typeName: string | undefined) => {
    const map: Record<string, string> = {
        'PERSON': 'bg-blue-100 text-blue-800',
        'ORGANIZATION': 'bg-green-100 text-green-800',
        'LOCATION': 'bg-yellow-100 text-yellow-800',
        'GPE': 'bg-yellow-100 text-yellow-800',
        'NORP': 'bg-purple-100 text-purple-800',
        'EVENT': 'bg-pink-100 text-pink-800',
        'LAW': 'bg-indigo-100 text-indigo-800',
        'WORK_OF_ART': 'bg-rose-100 text-rose-800',
    };
    return map[typeName || ''] || 'bg-surface-hover text-text-primary';
};

const openConfirmModal = (config: { title: string; message: string; confirmText?: string; cancelText?: string; variant?: 'primary' | 'danger'; onConfirm: () => void; }) => {
    confirmModal.value = { isOpen: true, title: config.title, message: config.message, confirmText: config.confirmText || 'Confirm', cancelText: config.cancelText || 'Cancel', variant: config.variant || 'primary', onConfirm: config.onConfirm };
};
const closeConfirmModal = () => { confirmModal.value.isOpen = false; };

// --- Data loading ---
const fetchEntityTypes = async (): Promise<EntityType[]> => {
    try { return (await apiClient.get('/entity-types')).data; } catch { return []; }
};

const loadData = async () => {
    try {
        const [entities, types] = await Promise.all([fetchPendingEntitiesByResourceId(props.resourceId), fetchEntityTypes()]);
        const lang = translationLocale.value;
        pendingEntities.value = entities.map((e: PendingEntity) => ({
            ...e, scope: e.scope || 'document', aliases: e.aliases || [],
            _editedTranslation: (e.translations && e.translations[lang]) || ''
        }));
        pendingEntities.value.forEach(e => originalEntityNames.set(e.id, e.name));
        await Promise.all(pendingEntities.value.map(e => e.status === 'merged' ? resolveMergedInfo(e) : Promise.resolve()));
        entityTypes.value = types;
    } catch (error) { console.error('Failed to load pending entities:', error); }
};

onMounted(loadData);

watch(() => [props.displayMode, props.targetLanguage, props.resourceLanguage], () => {
    const lang = translationLocale.value;
    pendingEntities.value.forEach(e => { e._editedTranslation = (e.translations && e.translations[lang]) || ''; });
});

// --- Resolve merged info ---
const fetchConfirmedEntity = async (id: number) => { try { return (await apiClient.get(`/entities/${id}`)).data; } catch { return null; } };
const fetchPendingEntityById = async (id: number) => { try { return (await apiClient.get(`/pending-entities/${id}`)).data; } catch { return null; } };

const resolveMergedInfo = async (entity: PendingEntity) => {
    if (!entity || entity.status !== 'merged' || !entity.mergedTargetId) return;
    try {
        const fetched = entity.mergedTargetType === 'pending'
            ? (pendingEntities.value.find(p => p.id === entity.mergedTargetId) || await fetchPendingEntityById(entity.mergedTargetId))
            : await fetchConfirmedEntity(entity.mergedTargetId);
        if (fetched) {
            entity.mergedTargetName = fetched.name;
            if (fetched.entityType) entity.entityType = fetched.entityType;
        }
    } catch { }
};

// --- Auto-save ---
const saveTimers = new Map<string, number>();
const DEBOUNCE_MS = 800;

const scheduleSave = (entity: PendingEntity, isTranslation = false) => {
    if (!entity?.id) return;
    const key = `${entity.id}:${isTranslation ? 't' : 'n'}`;
    const existing = saveTimers.get(key);
    if (existing) clearTimeout(existing);
    const t = setTimeout(async () => {
        saveTimers.delete(key);
        try { await saveEntity(entity, isTranslation); } catch { }
    }, DEBOUNCE_MS) as unknown as number;
    saveTimers.set(key, t);
};

const handleEntityTypeChange = (entity: PendingEntity) => scheduleSave(entity);

const checkForDuplicates = async (entity: PendingEntity, newName: string): Promise<PendingEntity | null> => {
    const dup = pendingEntities.value.find(e => e.id !== entity.id && e.name.toLowerCase() === newName.toLowerCase() && e.status !== 'merged');
    if (dup) return dup;
    try {
        const resp = await apiClient.get('/entities/search/exact', { params: { name: newName } });
        if (resp.data) return { ...resp.data, isConfirmed: true };
    } catch { }
    return null;
};

const saveEntity = async (entity: PendingEntity, isTranslation = false) => {
    isSaving.value = entity.id;
    try {
        if (entity.isConfirmed) {
            await updateEntity(entity.id, { name: entity.name, description: entity.description || undefined });
        } else if (isTranslation) {
            const locale = translationLocale.value;
            const translations = entity.translations ? { ...entity.translations } : {};
            translations[locale] = (entity as PendingEntityWithEdit)._editedTranslation || '';
            await updatePendingEntity(entity.id, { translations } as any);
            entity.translations = translations;
        } else {
            const originalName = originalEntityNames.get(entity.id);
            let nameChanged = false;
            if (originalName && originalName !== entity.name) {
                nameChanged = true;
                const duplicate = await checkForDuplicates(entity, entity.name);
                if (duplicate) {
                    duplicateWarningModal.value = { isOpen: true, currentEntity: entity, duplicateEntity: duplicate, newName: entity.name };
                    isSaving.value = null;
                    return;
                }
                originalEntityNames.set(entity.id, entity.name);
            }
            await updatePendingEntity(entity.id, {
                name: entity.name, description: entity.description || undefined,
                entityTypeId: entity.entityType?.id, scope: entity.scope,
                aliases: entity.aliases?.filter(a => a.value.trim() !== '')
            });
            if (nameChanged) {
                try {
                    await apiClient.post(`/pending-entities/${entity.id}/retranslate`, {
                        newName: entity.name, currentLanguage: 'en',
                        resourceLanguage: props.resourceLanguage, targetLanguage: props.targetLanguage
                    });
                    const updatedEntities = await fetchPendingEntitiesByResourceId(props.resourceId);
                    const updated = updatedEntities.find(e => e.id === entity.id);
                    if (updated) {
                        entity.translations = updated.translations;
                        (entity as PendingEntityWithEdit)._editedTranslation = updated.translations?.[props.targetLanguage] || '';
                    }
                } catch { }
            }
        }
    } catch { } finally { isSaving.value = null; }
};

// --- Edit with cancel support ---
const startEditEntity = (entity: PendingEntityWithEdit) => {
    // Save a snapshot of the current state before editing
    editSnapshot.value = {
        id: entity.id,
        name: entity.name,
        description: entity.description,
        entityType: entity.entityType ? { ...entity.entityType } : null,
        scope: entity.scope,
        translations: entity.translations ? { ...entity.translations } : null,
        _editedTranslation: (entity as PendingEntityWithEdit)._editedTranslation || ''
    };
    expandedEntityId.value = entity.id;
};

const cancelEditEntity = async (entity: PendingEntityWithEdit) => {
    // Cancel any pending auto-save timers for this entity
    for (const [key, timer] of saveTimers.entries()) {
        if (key.startsWith(`${entity.id}:`)) {
            clearTimeout(timer);
            saveTimers.delete(key);
        }
    }

    // Restore from snapshot
    if (editSnapshot.value && editSnapshot.value.id === entity.id) {
        entity.name = editSnapshot.value.name;
        entity.description = editSnapshot.value.description;
        entity.entityType = editSnapshot.value.entityType;
        entity.scope = editSnapshot.value.scope;
        entity.translations = editSnapshot.value.translations;
        (entity as PendingEntityWithEdit)._editedTranslation = editSnapshot.value._editedTranslation;

        // Revert on the server too (re-save original values)
        try {
            if (entity.isConfirmed) {
                await updateEntity(entity.id, { name: entity.name, description: entity.description || undefined });
            } else {
                await updatePendingEntity(entity.id, {
                    name: entity.name, description: entity.description || undefined,
                    entityTypeId: entity.entityType?.id, scope: entity.scope,
                    aliases: entity.aliases?.filter(a => a.value.trim() !== '')
                });
            }
        } catch { }
    }

    editSnapshot.value = null;
    expandedEntityId.value = null;
};

// --- Actions ---
const quickConfirmEntity = async (entity: PendingEntity) => {
    try {
        const response = await apiClient.post(`/pending-entities/${entity.id}/confirm`);
        if (response.data.success) {
            pendingEntities.value = pendingEntities.value.filter(e => e.id !== entity.id);
            emit('entities:confirmed');
        }
    } catch (error) { console.error('Failed to confirm entity:', error); }
};

const confirmAllEntities = async () => {
    isConfirming.value = true;
    try {
        const result = await confirmEntities(props.resourceId);
        emit('entities:confirmed');
        await loadData();
    } catch { } finally { isConfirming.value = false; }
};

const deleteEntity = async (id: number, isConfirmed?: boolean) => {
    openConfirmModal({
        title: isConfirmed ? 'Remove Entity' : 'Delete Entity',
        message: isConfirmed ? 'Remove this entity association from this document?' : 'Delete this pending entity?',
        confirmText: isConfirmed ? 'Remove' : 'Delete', variant: 'danger',
        onConfirm: async () => {
            try {
                await deletePendingEntity(id);
                pendingEntities.value = pendingEntities.value.filter(e => e.id !== id);
                if (expandedEntityId.value === id) expandedEntityId.value = null;
            } catch { }
        }
    });
};

const addNewEntity = async () => {
    try {
        const entity = await createPendingEntity({
            resourceId: parseInt(props.resourceId), name: newEntity.value.name,
            entityTypeId: newEntity.value.entityTypeId, scope: newEntity.value.scope
        });
        pendingEntities.value.push({ ...entity, scope: entity.scope || 'document', aliases: entity.aliases || [] });
        cancelAddEntity();
    } catch { }
};

const cancelAddEntity = () => {
    showAddEntityForm.value = false;
    newEntity.value = { name: '', description: '', entityTypeId: undefined, scope: 'document' };
};

// --- Merge ---
const openMergeModal = (entity: PendingEntity) => { entityToMerge.value = entity; showMergeModal.value = true; };

const closeMergeModal = () => {
    showMergeModal.value = false; entityToMerge.value = null;
    if (duplicateWarningModal.value.currentEntity) {
        duplicateWarningModal.value.currentEntity = null;
        duplicateWarningModal.value.duplicateEntity = null;
        duplicateWarningModal.value.newName = '';
    }
};

const handleMerge = async (payload: { targetType: 'pending' | 'confirmed', targetId: number, aliasScope: EntityScope }) => {
    try {
        if (!entityToMerge.value) return;
        const resp = await apiClient.post(`/pending-entities/${entityToMerge.value.id}/merge`, payload);
        const updatedPending = resp.data?.pending;
        if (updatedPending) {
            const idx = pendingEntities.value.findIndex(e => e.id === updatedPending.id);
            if (idx !== -1) {
                pendingEntities.value[idx] = { ...pendingEntities.value[idx], ...updatedPending } as any;
                await resolveMergedInfo(pendingEntities.value[idx]);
            }
        }
        closeMergeModal();
    } catch { }
};

const cancelMerge = async (entity: PendingEntity) => {
    openConfirmModal({
        title: 'Cancel Merge', message: 'Cancel merge and restore as pending entity?',
        confirmText: 'Yes, Cancel Merge', variant: 'danger',
        onConfirm: async () => {
            try {
                const resp = await apiClient.post(`/pending-entities/${entity.id}/cancel-merge`);
                if (resp.data?.success) {
                    const refreshed = await apiClient.get(`/pending-entities/${entity.id}`);
                    const idx = pendingEntities.value.findIndex(e => e.id === refreshed.data.id);
                    if (idx !== -1) {
                        pendingEntities.value[idx] = { ...pendingEntities.value[idx], ...refreshed.data };
                        await resolveMergedInfo(pendingEntities.value[idx]);
                    }
                }
            } catch { }
        }
    });
};

// --- Duplicate warning ---
const closeDuplicateWarning = () => {
    if (duplicateWarningModal.value.currentEntity) {
        const original = originalEntityNames.get(duplicateWarningModal.value.currentEntity.id);
        if (original) duplicateWarningModal.value.currentEntity.name = original;
    }
    duplicateWarningModal.value = { isOpen: false, currentEntity: null, duplicateEntity: null, newName: '' };
};

const handleMergeFromDuplicate = () => {
    if (duplicateWarningModal.value.currentEntity && duplicateWarningModal.value.duplicateEntity) {
        entityToMerge.value = duplicateWarningModal.value.currentEntity;
        showMergeModal.value = true;
        duplicateWarningModal.value.isOpen = false;
    }
};
</script>
