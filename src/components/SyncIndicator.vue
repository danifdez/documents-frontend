<template>
  <div v-if="!offlineStore.backendReachable || offlineStore.pendingChangeCount > 0 || offlineStore.isSyncing" class="relative" ref="popoverRef">
    <button @click="showPopover = !showPopover"
      class="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-text-muted hover:bg-surface-hover transition-colors cursor-pointer"
      :class="{ 'justify-center': collapsed }">
      <!-- Status dot -->
      <span class="relative flex h-2.5 w-2.5 shrink-0">
        <span v-if="offlineStore.isSyncing" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2.5 w-2.5"
          :class="statusColor"></span>
      </span>
      <span v-if="!collapsed" class="text-xs font-medium">
        {{ statusText }}
      </span>
    </button>

    <!-- Popover -->
    <div v-if="showPopover && !collapsed"
      class="absolute left-0 bottom-full mb-2 w-52 bg-surface border border-border rounded-lg shadow-lg z-50 p-3">
      <div class="text-xs text-text-secondary mb-2">
        <div class="flex justify-between mb-1">
          <span>Status</span>
          <span class="font-medium" :class="offlineStore.isOnline ? 'text-green-600' : 'text-red-500'">
            {{ offlineStore.isOnline ? 'Online' : 'Offline' }}
          </span>
        </div>
        <div class="flex justify-between">
          <span>Pending changes</span>
          <span class="font-medium">{{ offlineStore.pendingChangeCount }}</span>
        </div>
      </div>
      <button v-if="offlineStore.isOnline && offlineStore.pendingChangeCount > 0"
        @click="syncNow" :disabled="offlineStore.isSyncing"
        class="w-full py-1.5 rounded-md bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors cursor-pointer disabled:opacity-50">
        {{ offlineStore.isSyncing ? 'Syncing...' : 'Sync Now' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useOfflineStore } from '../store/offlineStore';

defineProps<{ collapsed: boolean }>();

const offlineStore = useOfflineStore();
const showPopover = ref(false);
const popoverRef = ref<HTMLElement | null>(null);

const statusColor = computed(() => {
  if (!offlineStore.isOnline) return 'bg-red-500';
  if (offlineStore.isSyncing || offlineStore.pendingChangeCount > 0) return 'bg-yellow-500';
  return 'bg-green-500';
});

const statusText = computed(() => {
  if (!offlineStore.isOnline) return `Offline${offlineStore.pendingChangeCount ? ` (${offlineStore.pendingChangeCount})` : ''}`;
  if (offlineStore.isSyncing) return 'Syncing...';
  if (offlineStore.pendingChangeCount > 0) return `${offlineStore.pendingChangeCount} pending`;
  return 'Synced';
});

async function syncNow() {
  await offlineStore.syncOnReconnect();
}

function handleClickOutside(e: MouseEvent) {
  if (popoverRef.value && !popoverRef.value.contains(e.target as Node)) {
    showPopover.value = false;
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));
</script>
