<template>
    <div>
        <div v-if="isLoading" class="flex justify-center py-8">
            <LoadingSpinner size="md" />
        </div>

        <div v-else-if="notes.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <NoteCard v-for="note in notes" :key="note.id" :note="note" />
        </div>

        <div v-else class="text-center py-8 rounded-xl border border-dashed border-border">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mx-auto text-text-muted mb-2" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <p class="text-xs text-text-muted">No notes yet.</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Note } from '../../types/Note';
import LoadingSpinner from '../ui/LoadingSpinner.vue';
import NoteCard from './NoteCard.vue';

defineProps<{
    notes: Note[];
    isLoading: boolean;
}>();
</script>
