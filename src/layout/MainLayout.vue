<template>
    <div class="flex flex-col h-screen overflow-hidden bg-surface">
        <Topbar v-if="!isBrowserToolbar" />
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
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useGlobalKeyboard } from '../composables/useGlobalKeyboard';

const route = useRoute();
const isBrowserToolbar = computed(() => route.name === 'BrowserToolbar' || route.name === 'BrowserPage');

const { showNotesPanel, quickNoteRequested } = useGlobalKeyboard();
</script>
