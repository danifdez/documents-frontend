<template>
  <SectionPanel title="Recent Notes" color="emerald"
    :loading="isLoading" :empty="displayNotes.length === 0"
    empty-icon="note" empty-text="No notes yet">
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
        stroke="currentColor" stroke-width="1.75">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </template>

    <template #actions>
      <button @click="$emit('create')"
        class="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent-subtle rounded-md transition-colors cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
        New
      </button>
      <button @click="$emit('create')" class="link-action">View all</button>
    </template>

    <ListRow v-for="note in displayNotes" :key="note.id" button @click="$emit('open', note.id)">
      <IconChip color="emerald">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" stroke-width="1.75">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </IconChip>
      <div class="min-w-0 flex-1">
        <p class="text-sm text-text-primary truncate">{{ note.title }}</p>
        <p class="text-[11px] text-text-muted">{{ formatDate(note.updatedAt) }}</p>
      </div>
      <Badge v-if="showProject && note.project" variant="accent">{{ note.project.name }}</Badge>
    </ListRow>
  </SectionPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Note } from '../../types/Note';
import SectionPanel from '../ui/SectionPanel.vue';
import ListRow from '../ui/ListRow.vue';
import IconChip from '../ui/IconChip.vue';
import Badge from '../ui/Badge.vue';

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
  open: [noteId: number];
}>();

const displayNotes = computed(() => props.notes.slice(0, props.limit));

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
</script>
