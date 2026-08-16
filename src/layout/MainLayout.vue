<template>
    <div class="flex flex-col h-screen overflow-hidden bg-surface">
        <Topbar />
        <div class="flex-1 min-h-0 flex flex-col overflow-hidden">
            <slot></slot>
        </div>
        <NotesPanel
            v-model="showNotesPanel"
            :quickCreate="quickNoteRequested" />
    </div>
</template>

<script setup lang="ts">
import Topbar from './Topbar.vue';
import NotesPanel from '../components/notes/NotesPanel.vue';
import { useGlobalKeyboard } from '../composables/useGlobalKeyboard';

const { showNotesPanel, quickNoteRequested } = useGlobalKeyboard();
</script>
