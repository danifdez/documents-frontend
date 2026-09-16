<template>
  <div v-if="!offlineStore.isOnline"
    class="relative z-[100] shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-center text-xs font-medium text-amber-800 dark:border-amber-600/20 dark:bg-amber-400/10 dark:text-amber-600">
    <span class="inline-flex items-center gap-2">
      <span class="relative flex h-2 w-2">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-50"></span>
        <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
      </span>
      Offline — backend unreachable. Changes will queue and sync on reconnect.
      <button v-if="!offlineStore.isSyncing" @click="retry"
        class="underline hover:no-underline cursor-pointer">
        Retry now
      </button>
    </span>
  </div>
</template>

<script setup lang="ts">
import { useOfflineStore } from '../store/offlineStore';

const offlineStore = useOfflineStore();

async function retry() {
  await offlineStore.probeBackend();
}
</script>
