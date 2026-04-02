<template>
    <div class="h-full flex flex-col overflow-hidden">
        <!-- Header -->
        <div class="shrink-0 px-6 py-4 border-b border-border bg-surface-elevated">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    <button @click="router.push('/knowledge-base')"
                        class="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <input v-model="entryTitle" type="text" placeholder="Título de la entrada"
                        class="flex-1 bg-transparent text-lg font-semibold text-text-primary placeholder:text-text-muted focus:outline-none tracking-tight"
                        @blur="saveTitle" @keydown.enter="saveTitle" />
                </div>

                <div class="flex items-center gap-2 ml-4 shrink-0">
                    <span v-if="saving" class="text-xs text-text-muted">Guardando...</span>
                    <span v-else-if="lastSaved" class="text-xs text-text-muted">Guardado</span>

                    <button @click="showDeleteDialog = true"
                        class="p-1.5 rounded-md text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Eliminar entrada">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Summary and tags row -->
            <div class="mt-3 flex flex-col gap-2">
                <input v-model="entrySummary" type="text" placeholder="Resumen breve (opcional)"
                    class="w-full bg-transparent text-sm text-text-secondary placeholder:text-text-muted focus:outline-none"
                    @blur="saveSummary" @keydown.enter="saveSummary" />

                <!-- Definition toggle + Entity link -->
                <div class="flex items-center gap-4 mb-1">
                    <label class="inline-flex items-center gap-2 cursor-pointer select-none">
                        <button @click="toggleDefinition" type="button"
                            class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 cursor-pointer"
                            :class="entryIsDefinition ? 'bg-accent' : 'bg-gray-300'">
                            <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 shadow-sm"
                                :class="entryIsDefinition ? 'translate-x-[18px]' : 'translate-x-[3px]'" />
                        </button>
                        <span class="text-xs text-text-secondary">Definición</span>
                    </label>

                    <!-- Linked entity -->
                    <div class="flex items-center gap-1.5">
                        <template v-if="linkedEntity">
                            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                {{ linkedEntity.name }}
                                <span class="text-[10px] opacity-60">{{ linkedEntity.entityType?.name }}</span>
                                <button @click="unlinkEntity" class="hover:text-red-500 transition-colors cursor-pointer leading-none">&times;</button>
                            </span>
                        </template>
                        <template v-else>
                            <div class="relative">
                                <button @click="showEntityMenu = !showEntityMenu"
                                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-text-muted hover:text-accent border border-dashed border-border hover:border-accent transition-colors cursor-pointer">
                                    <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    Vincular entidad
                                </button>

                                <!-- Entity search dropdown -->
                                <div v-if="showEntityMenu"
                                    class="absolute left-0 top-full mt-1 z-50 bg-surface-elevated border border-border rounded-lg shadow-xl w-72 overflow-hidden">
                                    <div class="p-2 border-b border-border">
                                        <input v-model="entitySearchQuery" ref="entitySearchRef" type="text" placeholder="Buscar entidad..."
                                            class="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded focus:outline-none focus:border-accent"
                                            @input="debouncedSearchEntities" />
                                    </div>
                                    <div class="max-h-48 overflow-y-auto">
                                        <div v-if="entitySearchLoading" class="flex justify-center py-3">
                                            <div class="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent"></div>
                                        </div>
                                        <template v-else>
                                            <div v-for="ent in entitySearchResults" :key="ent.id" @click="linkEntity(ent)"
                                                class="px-3 py-2 text-xs cursor-pointer hover:bg-surface-hover transition-colors">
                                                <span class="font-medium text-text-primary">{{ ent.name }}</span>
                                                <span class="ml-1.5 text-[10px] text-text-muted">{{ ent.entityType?.name }}</span>
                                            </div>
                                            <div v-if="!entitySearchLoading && entitySearchResults.length === 0 && entitySearchQuery.length > 0"
                                                class="px-3 py-3 text-center text-xs text-text-muted">
                                                Sin resultados
                                            </div>
                                        </template>
                                    </div>
                                    <!-- Create new entity -->
                                    <div class="border-t border-border p-2">
                                        <div v-if="!showCreateEntityForm">
                                            <button @click="showCreateEntityForm = true"
                                                class="w-full text-left px-2 py-1.5 text-xs text-accent hover:bg-accent-subtle rounded transition-colors cursor-pointer">
                                                + Crear nueva entidad
                                            </button>
                                        </div>
                                        <div v-else class="space-y-2">
                                            <select v-model="newEntityTypeId"
                                                class="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded focus:outline-none focus:border-accent">
                                                <option :value="0" disabled>Tipo de entidad...</option>
                                                <option v-for="et in entityTypes" :key="et.id" :value="et.id">{{ et.name }}</option>
                                            </select>
                                            <div class="flex gap-1.5">
                                                <button @click="createAndLinkEntity" :disabled="!newEntityTypeId"
                                                    class="flex-1 px-2 py-1 text-xs font-medium text-white bg-accent rounded hover:bg-accent/90 disabled:opacity-40 cursor-pointer transition-colors">
                                                    Crear
                                                </button>
                                                <button @click="showCreateEntityForm = false"
                                                    class="px-2 py-1 text-xs text-text-muted hover:text-text-primary cursor-pointer transition-colors">
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Tags -->
                <div class="flex flex-wrap items-center gap-1.5">
                    <span v-for="(tag, i) in entryTags" :key="tag"
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-subtle text-accent-dark">
                        {{ tag }}
                        <button @click="removeTag(i)"
                            class="hover:text-red-500 transition-colors cursor-pointer leading-none">&times;</button>
                    </span>
                    <input v-if="addingTag" v-model="newTagInput" ref="tagInputRef" type="text"
                        placeholder="Nueva etiqueta" @keydown.enter="commitTag" @keydown.escape="cancelTag"
                        @blur="commitTag"
                        class="px-2 py-0.5 rounded-full text-xs bg-surface border border-border focus:outline-none focus:border-accent w-32" />
                    <button v-else @click="startAddTag"
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-text-muted hover:text-accent border border-dashed border-border hover:border-accent transition-colors cursor-pointer">
                        <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd"
                                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                                clip-rule="evenodd" />
                        </svg>
                        Etiqueta
                    </button>
                </div>
            </div>
        </div>

        <!-- Editor -->
        <div class="flex-1 overflow-hidden">
            <KnowledgeEditor v-if="loaded" v-model="entryContent" />
        </div>

        <!-- Delete confirm dialog -->
        <ConfirmModal :isOpen="showDeleteDialog" title="Eliminar entrada"
            message="¿Estás seguro de que quieres eliminar esta entrada? Esta acción no se puede deshacer."
            confirmText="Eliminar" cancelText="Cancelar" confirmVariant="danger" @confirm="handleDelete"
            @cancel="showDeleteDialog = false" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useKnowledgeBase } from '../services/knowledge/useKnowledgeBase';
import { useEntities, type Entity } from '../services/entities/useEntities';
import { useEntityTypes, type EntityType } from '../services/entity-types/useEntityTypes';
import KnowledgeEditor from '../components/knowledge/KnowledgeEditor.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';

const route = useRoute();
const router = useRouter();
const { loadEntry, updateEntry, deleteEntry } = useKnowledgeBase();
const { searchEntities, createEntity } = useEntities();
const { fetchEntityTypes } = useEntityTypes();

const entryTitle = ref('');
const entryContent = ref<string | null>(null);
const entrySummary = ref('');
const entryTags = ref<string[]>([]);
const entryIsDefinition = ref(false);
const linkedEntity = ref<{ id: number; name: string; entityType?: { id: number; name: string } } | null>(null);
const showEntityMenu = ref(false);
const entitySearchQuery = ref('');
const entitySearchRef = ref<HTMLInputElement | null>(null);
const entitySearchResults = ref<Entity[]>([]);
const entitySearchLoading = ref(false);
const entityTypes = ref<EntityType[]>([]);
const showCreateEntityForm = ref(false);
const newEntityTypeId = ref(0);
let entitySearchTimeout: ReturnType<typeof setTimeout> | null = null;
const loaded = ref(false);
const saving = ref(false);
const lastSaved = ref(false);
const showDeleteDialog = ref(false);
const addingTag = ref(false);
const newTagInput = ref('');
const tagInputRef = ref<HTMLInputElement | null>(null);
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

onMounted(async () => {
    const id = route.params.id;
    try {
        const data = await loadEntry(id as string);
        if (data) {
            entryTitle.value = data.title || '';
            entryContent.value = data.content;
            entrySummary.value = data.summary || '';
            entryTags.value = data.tags || [];
            entryIsDefinition.value = data.isDefinition ?? false;
            linkedEntity.value = data.entity ?? null;
        }
        loaded.value = true;
        fetchEntityTypes().then(types => { entityTypes.value = types; }).catch(() => {});
    } catch {
        router.push('/knowledge-base');
    }
});

const saveField = async (fields: Record<string, any>) => {
    const id = route.params.id;
    if (!id) return;
    saving.value = true;
    try {
        await updateEntry(id as string, fields);
        lastSaved.value = true;
    } finally {
        saving.value = false;
    }
};

const saveTitle = () => saveField({ title: entryTitle.value });
const saveSummary = () => saveField({ summary: entrySummary.value });

const toggleDefinition = () => {
    entryIsDefinition.value = !entryIsDefinition.value;
    saveField({ isDefinition: entryIsDefinition.value });
};

const debouncedSearchEntities = () => {
    if (entitySearchTimeout) clearTimeout(entitySearchTimeout);
    entitySearchTimeout = setTimeout(async () => {
        const q = entitySearchQuery.value.trim();
        if (q.length < 2) { entitySearchResults.value = []; return; }
        entitySearchLoading.value = true;
        try {
            entitySearchResults.value = await searchEntities(q);
        } finally {
            entitySearchLoading.value = false;
        }
    }, 300);
};

const linkEntity = async (ent: Entity) => {
    linkedEntity.value = { id: ent.id, name: ent.name, entityType: ent.entityType };
    showEntityMenu.value = false;
    entitySearchQuery.value = '';
    entitySearchResults.value = [];
    await saveField({ entityId: ent.id });
};

const unlinkEntity = async () => {
    linkedEntity.value = null;
    await saveField({ entityId: null });
};

const createAndLinkEntity = async () => {
    if (!newEntityTypeId.value) return;
    try {
        const created = await createEntity({
            name: entryTitle.value || 'Sin nombre',
            entityTypeId: newEntityTypeId.value,
            description: entrySummary.value || undefined,
        });
        linkedEntity.value = { id: created.id, name: created.name, entityType: created.entityType };
        showEntityMenu.value = false;
        showCreateEntityForm.value = false;
        newEntityTypeId.value = 0;
        await saveField({ entityId: created.id });
    } catch (err) {
        console.error('Error creating entity:', err);
    }
};

watch(entryContent, (val) => {
    if (!loaded.value) return;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveField({ content: val }), 800);
});

watch(entryTags, (val) => {
    if (!loaded.value) return;
    saveField({ tags: val });
}, { deep: true });

const startAddTag = async () => {
    addingTag.value = true;
    await nextTick();
    tagInputRef.value?.focus();
};

const commitTag = () => {
    const tag = newTagInput.value.trim();
    if (tag && !entryTags.value.includes(tag)) {
        entryTags.value.push(tag);
    }
    newTagInput.value = '';
    addingTag.value = false;
};

const cancelTag = () => {
    newTagInput.value = '';
    addingTag.value = false;
};

const removeTag = (index: number) => {
    entryTags.value.splice(index, 1);
};

const handleDelete = async () => {
    const id = route.params.id;
    showDeleteDialog.value = false;
    if (!id) return;
    try {
        await deleteEntry(id as string);
        router.push('/knowledge-base');
    } catch (err) {
        console.error('Error deleting entry:', err);
    }
};
</script>
