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
            <NoteEditor v-if="loaded" v-model="entryContent" />
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
import NoteEditor from '../components/notes/NoteEditor.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';

const route = useRoute();
const router = useRouter();
const { loadEntry, updateEntry, deleteEntry } = useKnowledgeBase();

const entryTitle = ref('');
const entryContent = ref<string | null>(null);
const entrySummary = ref('');
const entryTags = ref<string[]>([]);
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
        }
        loaded.value = true;
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
