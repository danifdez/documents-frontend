<template>
    <div class="flex h-full flex-col overflow-hidden bg-surface">
        <Topbar />
        <main class="flex min-h-0 flex-1 flex-col overflow-hidden">
            <slot></slot>
        </main>
        <NotesPanel v-model="showNotesPanel" :initialNoteId="noteToOpen" :quickCreate="quickNoteRequested" />
    </div>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import Topbar from './Topbar.vue';
import NotesPanel from '../components/notes/NotesPanel.vue';
import { useGlobalKeyboard } from '../composables/useGlobalKeyboard';

const { showNotesPanel, quickNoteRequested, noteToOpen } = useGlobalKeyboard();

// `noteToOpen` is an opening request, not persistent panel state: clear it when
// the panel closes so the next open starts on the list instead of a stale note.
watch(showNotesPanel, (open) => {
  if (!open) noteToOpen.value = null;
});
</script>
