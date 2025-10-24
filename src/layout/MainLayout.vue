<template>
    <div class="flex h-screen overflow-hidden">
        <Sidebar v-if="!isBrowserToolbar" />
        <div class="flex-1 min-h-0 flex flex-col overflow-hidden">
            <slot></slot>
        </div>
    </div>
</template>

<script setup lang="ts">
import Sidebar from './Sidebar.vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const isBrowserToolbar = computed(() => route.name === 'BrowserToolbar');
</script>