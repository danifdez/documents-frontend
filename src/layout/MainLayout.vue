<template>
    <div class="flex h-full flex-col overflow-hidden bg-surface">
        <Topbar />
        <main class="flex min-h-0 flex-1 flex-col overflow-hidden">
            <slot></slot>
        </main>
        <NotesPanel v-model="showNotesPanel" :quickCreate="quickNoteRequested" />
    </div>
</template>

<script setup lang="ts">
import Topbar from './Topbar.vue';
import NotesPanel from '../components/notes/NotesPanel.vue';
import { useGlobalKeyboard } from '../composables/useGlobalKeyboard';

const { showNotesPanel, quickNoteRequested } = useGlobalKeyboard();
</script>
