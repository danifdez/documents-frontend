<template>
    <div class="flex h-screen overflow-hidden bg-surface">
        <Sidebar v-if="!isBrowserToolbar" />
        <div class="flex-1 min-h-0 flex flex-col overflow-hidden">
            <slot></slot>
        </div>
        <NotesPanel v-if="featureStore.isEnabled('notes')"
            v-model="showNotesPanel"
            :quickCreate="quickNoteRequested" />
    </div>
</template>

<script setup lang="ts">
import Sidebar from './Sidebar.vue';
import NotesPanel from '../components/notes/NotesPanel.vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useGlobalKeyboard } from '../composables/useGlobalKeyboard';
import { useFeatureStore } from '../store/featureStore';

const route = useRoute();
const featureStore = useFeatureStore();
const isBrowserToolbar = computed(() => route.name === 'BrowserToolbar' || route.name === 'BrowserPage');

const { showNotesPanel, quickNoteRequested } = useGlobalKeyboard();
</script>
