<template>
    <div class="h-full flex flex-col overflow-hidden">
        <!-- Header -->
        <div class="shrink-0 px-6 py-4 border-b border-border bg-surface-elevated">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    <button @click="router.push('/notes')"
                        class="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <input v-model="noteTitle" type="text" placeholder="Note title"
                        class="flex-1 bg-transparent text-lg font-semibold text-text-primary placeholder:text-text-muted focus:outline-none tracking-tight"
                        @blur="saveTitle" @keydown.enter="saveTitle" />
                </div>

                <div class="flex items-center gap-2 ml-4 shrink-0">
                    <!-- Project selector -->
                    <select v-model="selectedProjectId" @change="saveProject"
                        class="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent cursor-pointer">
                        <option :value="null">No project</option>
                        <option v-for="project in projects" :key="project.id" :value="project.id">
                            {{ project.name }}
                        </option>
                    </select>

                    <span v-if="saving" class="text-xs text-text-muted">Saving...</span>
                    <span v-else-if="lastSaved" class="text-xs text-text-muted">Saved</span>

                    <button @click="confirmDelete"
                        class="p-1.5 rounded-md text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete note">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>

        <!-- Editor -->
        <div class="flex-1 overflow-hidden">
            <NoteEditor v-if="loaded" v-model="noteContent" />
        </div>

        <ConfirmModal :isOpen="showDeleteDialog" title="Delete Note"
            message="Are you sure you want to delete this note? This action cannot be undone." confirmText="Delete"
            cancelText="Cancel" confirmVariant="danger" @confirm="handleDelete"
            @cancel="showDeleteDialog = false" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useNotes } from '../services/notes/useNotes';
import { useProjectList } from '../services/projects/useProjectList';
import NoteEditor from '../components/notes/NoteEditor.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';

const route = useRoute();
const router = useRouter();
const { loadNote, updateNote, deleteNote } = useNotes();
const { projects, loadProjects } = useProjectList();

const noteTitle = ref('');
const noteContent = ref<string | null>(null);
const selectedProjectId = ref<number | null>(null);
const loaded = ref(false);
const saving = ref(false);
const lastSaved = ref(false);
const showDeleteDialog = ref(false);
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

onMounted(async () => {
    const id = route.params.id;
    if (!id || id === 'new') {
        loaded.value = true;
        return;
    }

    await loadProjects();

    try {
        const data = await loadNote(id as string);
        if (data) {
            noteTitle.value = data.title || '';
            noteContent.value = data.content;
            selectedProjectId.value = data.project?.id || null;
        }
        loaded.value = true;
    } catch {
        router.push('/notes');
    }
});

const saveTitle = async () => {
    const id = route.params.id;
    if (!id || id === 'new') return;
    saving.value = true;
    try {
        await updateNote(id as string, { title: noteTitle.value });
        lastSaved.value = true;
    } finally {
        saving.value = false;
    }
};

const saveProject = async () => {
    const id = route.params.id;
    if (!id || id === 'new') return;
    saving.value = true;
    try {
        const data: Record<string, any> = selectedProjectId.value
            ? { project: { id: selectedProjectId.value } }
            : { project: null };
        await updateNote(id as string, data);
        lastSaved.value = true;
    } finally {
        saving.value = false;
    }
};

// Auto-save content on change with debounce
watch(noteContent, (val) => {
    if (!loaded.value) return;
    const id = route.params.id;
    if (!id || id === 'new') return;

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        saving.value = true;
        try {
            await updateNote(id as string, { content: val });
            lastSaved.value = true;
        } finally {
            saving.value = false;
        }
    }, 800);
});

const confirmDelete = () => {
    showDeleteDialog.value = true;
};

const handleDelete = async () => {
    const id = route.params.id;
    showDeleteDialog.value = false;
    if (!id) return;
    try {
        await deleteNote(id as string);
        router.push('/notes');
    } catch (err) {
        console.error('Error deleting note:', err);
    }
};
</script>
