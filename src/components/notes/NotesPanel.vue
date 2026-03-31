<template>
  <Teleport to="body">
    <Transition name="notes-panel" appear>
      <div v-if="modelValue" class="notes-overlay" @click="closePanel">
        <div class="notes-container" @click.stop>
          <!-- Header -->
          <div class="notes-header">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-emerald-500 shrink-0" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <h2 class="text-lg font-semibold text-text-primary tracking-tight">Notes</h2>
              <span v-if="contextProject" class="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                {{ contextProject.name }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-text-muted hidden sm:block">Ctrl+Shift+N</span>
              <button @click="closePanel"
                class="p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="notes-body">
            <!-- Left: Note list -->
            <div class="notes-list-pane">
              <!-- Search -->
              <div class="px-3 pb-3 border-b border-border-light">
                <div class="relative">
                  <svg xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input ref="searchInput" v-model="searchTerm" type="text" placeholder="Search notes..."
                    class="w-full pl-8 pr-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                </div>
              </div>

              <!-- New note button -->
              <div class="px-3 py-2 border-b border-border-light">
                <button @click="createNewNote"
                  class="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-accent hover:bg-accent-subtle rounded-lg transition-colors cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clip-rule="evenodd" />
                  </svg>
                  New Note
                  <span class="ml-auto text-[10px] text-text-muted">Ctrl+Alt+N</span>
                </button>
              </div>

              <!-- Note list -->
              <div class="flex-1 overflow-y-auto">
                <div v-if="isLoadingList" class="flex justify-center py-8">
                  <div class="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent"></div>
                </div>

                <div v-else-if="filteredNotes.length === 0" class="text-center py-8 px-4">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mx-auto text-text-muted mb-2" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <p class="text-xs text-text-muted">{{ searchTerm ? 'No matching notes' : 'No notes yet' }}</p>
                </div>

                <div v-else class="flex flex-col">
                  <button v-for="note in filteredNotes" :key="note.id" @click="selectNote(note)"
                    class="flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-hover transition-colors duration-150 cursor-pointer border-b border-border-light"
                    :class="{ 'bg-accent-subtle': selectedNote?.id === note.id }">
                    <div class="w-6 h-6 rounded-md flex items-center justify-center bg-emerald-50 text-emerald-500 shrink-0 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" stroke-width="1.75">
                        <path stroke-linecap="round" stroke-linejoin="round"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm text-text-primary truncate font-medium">{{ note.title || 'Untitled' }}</p>
                      <p class="text-[10px] text-text-muted mt-0.5">{{ formatDate(note.updatedAt) }}</p>
                      <span v-if="note.project"
                        class="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent mt-1">
                        {{ note.project.name }}
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <!-- Right: Editor -->
            <div class="notes-editor-pane">
              <div v-if="selectedNote" class="flex flex-col h-full">
                <!-- Editor header -->
                <div class="shrink-0 px-5 py-3 border-b border-border-light flex items-center gap-3">
                  <input v-model="editTitle" type="text" placeholder="Note title"
                    class="flex-1 bg-transparent text-lg font-semibold text-text-primary placeholder:text-text-muted focus:outline-none tracking-tight min-w-0"
                    @blur="saveTitle" @keydown.enter="saveTitle" />

                  <select v-model="editProjectId" @change="saveProject"
                    class="px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent cursor-pointer shrink-0">
                    <option :value="null">No project</option>
                    <option v-for="project in projectsList" :key="project.id" :value="project.id">
                      {{ project.name }}
                    </option>
                  </select>

                  <span v-if="saving" class="text-[10px] text-text-muted shrink-0">Saving...</span>
                  <span v-else-if="lastSaved" class="text-[10px] text-emerald-500 shrink-0">Saved</span>

                  <button @click="confirmDeleteNote"
                    class="p-1.5 rounded-md text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer shrink-0"
                    title="Delete note">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <!-- Editor -->
                <div class="flex-1 overflow-hidden">
                  <NoteEditor v-if="editorReady" v-model="editContent" />
                </div>
              </div>

              <!-- Empty state -->
              <div v-else class="flex flex-col items-center justify-center h-full text-center px-8">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-text-muted mb-3" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <p class="text-sm text-text-muted mb-1">Select a note to edit</p>
                <p class="text-xs text-text-muted">or create a new one</p>
              </div>
            </div>
          </div>

          <!-- Delete confirmation -->
          <ConfirmModal :isOpen="showDeleteDialog" title="Delete Note"
            message="Are you sure you want to delete this note? This action cannot be undone." confirmText="Delete"
            cancelText="Cancel" confirmVariant="danger" @confirm="handleDeleteNote"
            @cancel="showDeleteDialog = false" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { useNotes } from '../../services/notes/useNotes';
import { useProjectList } from '../../services/projects/useProjectList';
import { useProjectStore } from '../../store/projectStore';
import NoteEditor from './NoteEditor.vue';
import ConfirmModal from '../ui/ConfirmModal.vue';
import type { Note } from '../../types/Note';

const props = defineProps<{
  modelValue: boolean;
  initialNoteId?: number | null;
  quickCreate?: number;
}>();

const emit = defineEmits(['update:modelValue', 'note:changed']);

const projectStore = useProjectStore();
const { notes, isLoading: isLoadingList, loadNotes, loadNotesByProject, loadNote, createNote, updateNote, deleteNote } = useNotes();
const { projects: projectsList, loadProjects: loadProjectsList } = useProjectList();
const searchInput = ref<HTMLInputElement>();
const searchTerm = ref('');
const selectedNote = ref<Note | null>(null);
const editTitle = ref('');
const editContent = ref<string | null>(null);
const editProjectId = ref<number | null>(null);
const editorReady = ref(false);
const saving = ref(false);
const lastSaved = ref(false);
const showDeleteDialog = ref(false);
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

const contextProject = computed(() => projectStore.currentProject || null);

const norm = (str: string) => str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';

const filteredNotes = computed(() => {
  const term = norm(searchTerm.value).trim();
  let list = [...(notes.value || [])];
  if (term) {
    list = list.filter(n =>
      norm(n.title).includes(term) ||
      (n.content && norm(n.content.replace(/<[^>]*>/g, '')).includes(term))
    );
  }
  return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
});

// Load notes when panel opens
watch(() => props.modelValue, async (visible) => {
  if (visible) {
    searchTerm.value = '';
    await loadProjectsList();
    if (contextProject.value) {
      await loadNotesByProject(contextProject.value.id);
    } else {
      await loadNotes();
    }
    nextTick(() => {
      searchInput.value?.focus();
    });

    // If initialNoteId provided, select that note
    if (props.initialNoteId) {
      const found = notes.value.find(n => n.id === props.initialNoteId);
      if (found) {
        selectNote(found);
      }
    }
  } else {
    // Clean up on close
    selectedNote.value = null;
    editTitle.value = '';
    editContent.value = null;
    editProjectId.value = null;
    editorReady.value = false;
    if (saveTimeout) clearTimeout(saveTimeout);
  }
});

// Handle quick create
watch(() => props.quickCreate, async (val, oldVal) => {
  if (val && val !== oldVal && props.modelValue) {
    await createNewNote();
  }
});

// Auto-save content
watch(editContent, (val) => {
  if (!editorReady.value || !selectedNote.value) return;
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    if (!selectedNote.value) return;
    saving.value = true;
    try {
      await updateNote(selectedNote.value.id, { content: val });
      lastSaved.value = true;
      selectedNote.value.updatedAt = new Date().toISOString();
      emit('note:changed');
    } finally {
      saving.value = false;
    }
  }, 800);
});

onBeforeUnmount(() => {
  if (saveTimeout) clearTimeout(saveTimeout);
});

async function selectNote(note: Note) {
  // Save current note if pending
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
    if (selectedNote.value && editContent.value !== null) {
      try {
        await updateNote(selectedNote.value.id, { content: editContent.value });
      } catch { /* silent */ }
    }
  }

  editorReady.value = false;

  try {
    const data = await loadNote(note.id);
    if (data) {
      selectedNote.value = data;
      editTitle.value = data.title || '';
      editContent.value = data.content;
      editProjectId.value = data.project?.id || null;
      lastSaved.value = false;
      await nextTick();
      editorReady.value = true;
    }
  } catch {
    selectedNote.value = null;
  }
}

async function createNewNote() {
  const data: any = { title: 'Untitled Note' };
  if (contextProject.value) {
    data.project = { id: contextProject.value.id };
  }
  try {
    const newNote = await createNote(data);
    // Reload list
    if (contextProject.value) {
      await loadNotesByProject(contextProject.value.id);
    } else {
      await loadNotes();
    }
    emit('note:changed');
    // Select the new note
    if (newNote) {
      await selectNote(newNote);
      // Focus title for immediate editing
      await nextTick();
      const titleInput = document.querySelector('.notes-editor-pane input[type="text"]') as HTMLInputElement;
      if (titleInput) {
        titleInput.focus();
        titleInput.select();
      }
    }
  } catch (err) {
    console.error('Error creating note:', err);
  }
}

async function saveTitle() {
  if (!selectedNote.value) return;
  saving.value = true;
  try {
    await updateNote(selectedNote.value.id, { title: editTitle.value });
    selectedNote.value.title = editTitle.value;
    lastSaved.value = true;
    emit('note:changed');
  } finally {
    saving.value = false;
  }
}

async function saveProject() {
  if (!selectedNote.value) return;
  saving.value = true;
  try {
    const data: any = editProjectId.value
      ? { project: { id: editProjectId.value } }
      : { project: null };
    await updateNote(selectedNote.value.id, data);
    const proj = projectsList.value.find(p => p.id === editProjectId.value);
    selectedNote.value.project = proj ? { id: proj.id, name: proj.name } : null;
    lastSaved.value = true;
    emit('note:changed');
  } finally {
    saving.value = false;
  }
}

function confirmDeleteNote() {
  showDeleteDialog.value = true;
}

async function handleDeleteNote() {
  showDeleteDialog.value = false;
  if (!selectedNote.value) return;
  try {
    await deleteNote(selectedNote.value.id);
    selectedNote.value = null;
    editorReady.value = false;
    if (contextProject.value) {
      await loadNotesByProject(contextProject.value.id);
    } else {
      await loadNotes();
    }
    emit('note:changed');
  } catch (err) {
    console.error('Error deleting note:', err);
  }
}

function closePanel() {
  emit('update:modelValue', false);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Public method to open with a specific note
function openWithNote(noteId: number) {
  const found = notes.value.find(n => n.id === noteId);
  if (found) {
    selectNote(found);
  }
}

defineExpose({ openWithNote, createNewNote });
</script>

<style scoped>
.notes-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.notes-container {
  background-color: var(--color-surface-elevated);
  border-radius: 1rem;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.03),
    0 24px 48px -12px rgba(0, 0, 0, 0.15);
  width: 92%;
  max-width: 1200px;
  height: 82vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.notes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border-light);
}

.notes-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.notes-list-pane {
  width: 320px;
  min-width: 280px;
  border-right: 1px solid var(--color-border-light);
  display: flex;
  flex-direction: column;
  padding-top: 0.75rem;
}

.notes-editor-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* Transitions */
.notes-panel-enter-active {
  transition: opacity 0.25s ease;
}

.notes-panel-leave-active {
  transition: opacity 0.2s ease;
}

.notes-panel-enter-from,
.notes-panel-leave-to {
  opacity: 0;
}

.notes-panel-enter-active .notes-container {
  animation: notes-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.notes-panel-leave-active .notes-container {
  animation: notes-out 0.15s ease-in forwards;
}

@keyframes notes-in {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes notes-out {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }

  to {
    opacity: 0;
    transform: scale(0.97) translateY(4px);
  }
}
</style>
