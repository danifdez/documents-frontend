<template>
  <section>
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" stroke-width="1.75">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Recent Notes
      </h2>
      <div class="flex items-center gap-2">
        <button @click="$emit('create')"
          class="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent-subtle rounded-md transition-colors cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
          New
        </button>
        <router-link to="/notes"
          class="text-xs text-accent hover:text-accent-dark font-medium transition-colors">
          View all
        </router-link>
      </div>
    </div>

    <LoadingSpinner v-if="isLoading" size="lg" fullHeight />

    <div v-else-if="displayNotes.length > 0"
      class="bg-surface-elevated rounded-xl border border-border overflow-hidden">
      <div class="flex flex-col divide-y divide-border-light">
        <router-link v-for="note in displayNotes" :key="note.id" :to="`/notes/${note.id}`"
          class="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover transition-colors duration-150 group">
          <div class="w-7 h-7 rounded-md flex items-center justify-center bg-emerald-50 text-emerald-500 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm text-text-primary truncate">{{ note.title }}</p>
            <p class="text-[10px] text-text-muted">{{ formatDate(note.updatedAt) }}</p>
          </div>
          <span v-if="showProject && note.project"
            class="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent shrink-0">
            {{ note.project.name }}
          </span>
        </router-link>
      </div>
    </div>

    <div v-else class="text-center py-8 rounded-xl border border-dashed border-border">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mx-auto text-text-muted mb-2" fill="none"
        viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      <p class="text-xs text-text-muted">No notes yet</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Note } from '../../types/Note';
import LoadingSpinner from '../ui/LoadingSpinner.vue';

const props = withDefaults(defineProps<{
  notes: Note[];
  isLoading: boolean;
  limit?: number;
  showProject?: boolean;
}>(), {
  limit: 5,
  showProject: true,
});

defineEmits<{
  create: [];
}>();

const displayNotes = computed(() => props.notes.slice(0, props.limit));

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
</script>
