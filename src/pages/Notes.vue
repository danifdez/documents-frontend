<template>
    <div class="h-full flex flex-col overflow-hidden">
        <div class="px-6 py-5 shrink-0">
            <PageHeader title="Notes" subtitle="Quick notes and ideas">
                <template #actions>
                    <button @click="createNewNote" class="btn-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd"
                                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                                clip-rule="evenodd" />
                        </svg>
                        <span>New Note</span>
                    </button>
                </template>
            </PageHeader>

            <div class="flex items-center gap-3">
                <div class="flex-1 max-w-md">
                    <SearchBar v-model="searchQuery" placeholder="Search notes..." />
                </div>
                <span v-if="allNotes.length > 0" class="text-xs text-text-muted">{{ filteredItems.length }} notes</span>
            </div>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
            <LoadingSpinner v-if="isLoading" size="lg" fullHeight />

            <EmptyState v-else-if="allNotes.length === 0" icon="note"
                title="No notes yet" description="Create a note to start capturing your ideas" />

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                <NoteCard v-for="note in filteredItems" :key="note.id" :note="note" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useNotes } from '../services/notes/useNotes';
import { usePageFilter } from '../composables/usePageFilter';
import NoteCard from '../components/notes/NoteCard.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import SearchBar from '../components/ui/SearchBar.vue';
import LoadingSpinner from '../components/ui/LoadingSpinner.vue';
import EmptyState from '../components/ui/EmptyState.vue';

const router = useRouter();
const { notes: allNotes, isLoading, loadNotes, createNote } = useNotes();
const { searchQuery, filteredItems } = usePageFilter(allNotes, ['title', 'content']);

const createNewNote = async () => {
    try {
        const note = await createNote({ title: 'Untitled Note' });
        router.push(`/notes/${note.id}`);
    } catch (err) {
        console.error('Error creating note:', err);
    }
};

onMounted(() => {
    loadNotes();
});
</script>
