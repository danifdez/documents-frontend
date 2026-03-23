<template>
  <button v-if="offlineStore.offlineEnabled" @click="toggle" :disabled="isDownloading"
    :title="isOffline ? 'Remove from offline' : 'Make available offline'"
    class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer border"
    :class="isOffline
      ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400'
      : 'border-border bg-surface text-text-secondary hover:bg-surface-hover'">
    <!-- Downloading spinner -->
    <svg v-if="isDownloading" class="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    <!-- Offline check -->
    <svg v-else-if="isOffline" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
    </svg>
    <!-- Download icon -->
    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
    </svg>
    <span>{{ isDownloading ? 'Saving...' : isOffline ? 'Offline' : 'Save offline' }}</span>
  </button>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useOfflineStore } from '../store/offlineStore';
import { downloadForOffline, removeFromOffline } from '../services/offline/offlineService';

const props = defineProps<{
  type: 'resource' | 'thread' | 'project';
  id: number;
}>();

const offlineStore = useOfflineStore();
const isDownloading = ref(false);
const isOffline = computed(() => offlineStore.isItemOffline(props.type, props.id));

async function toggle() {
  if (isOffline.value) {
    await removeFromOffline(props.type, props.id);
  } else {
    isDownloading.value = true;
    try {
      await downloadForOffline(props.type, props.id);
    } finally {
      isDownloading.value = false;
    }
  }
}
</script>
