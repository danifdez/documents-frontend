<template>
  <div v-if="!offlineStore.isOnline"
    class="fixed top-0 left-0 right-0 z-[100] bg-amber-500/90 text-white text-xs font-medium text-center py-1.5 px-3 shadow-md backdrop-blur">
    <span class="inline-flex items-center gap-2">
      <span class="relative flex h-2 w-2">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
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
