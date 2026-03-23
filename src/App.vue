<template>
  <div v-if="!workspaceStore.initialized" />
  <WorkspaceModal v-else-if="!workspaceStore.hasWorkspaces"
    @save="handleFirstWorkspace"
    :closable="false" />
  <div v-else-if="isLoginRoute">
    <router-view />
  </div>
  <MainLayout v-else>
    <div class="flex-1 flex flex-col min-h-0 overflow-hidden px-5 pt-4">
      <router-view class="flex-1 min-h-0 overflow-hidden" />
    </div>
    <GlobalSearchModal :show="showGlobalSearch" @close="showGlobalSearch = false" />
    <SelectionLookup />
    <TaskPanel v-model="showTaskPanel" />
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import MainLayout from './layout/MainLayout.vue';
import GlobalSearchModal from './components/GlobalSearchModal.vue';
import SelectionLookup from './components/knowledge/SelectionLookup.vue';
import TaskPanel from './components/user-tasks/TaskPanel.vue';
import WorkspaceModal from './components/WorkspaceModal.vue';
import { useGlobalKeyboard } from './composables/useGlobalKeyboard';
import { useTaskPanel } from './composables/useTaskPanel';
import { getSocket } from './services/notifications/notification';
import { useRouter, useRoute } from 'vue-router';
import { useNotification } from './composables/useNotification';
import { useTheme } from './composables/useTheme';
import { useWorkspaceStore } from './store/workspaceStore';
import { useOfflineStore } from './store/offlineStore';
import { useNetworkStatus } from './composables/useNetworkStatus';

const notification = useNotification();
const router = useRouter();
const route = useRoute();
const { showGlobalSearch } = useGlobalKeyboard();
const { showTaskPanel } = useTaskPanel();
const { initTheme } = useTheme();
const workspaceStore = useWorkspaceStore();
const offlineStore = useOfflineStore();
const { isOnline } = useNetworkStatus();

const isLoginRoute = computed(() => route.name === 'Login');

// Sync network status to offline store and auto-sync on reconnect
watch(isOnline, (online, wasOnline) => {
  offlineStore.isOnline = online;
  if (online && !wasOnline && offlineStore.offlineEnabled && offlineStore.pendingChangeCount > 0) {
    offlineStore.syncOnReconnect();
  }
});

async function handleFirstWorkspace(data: { name: string; url: string }) {
  const ws = await workspaceStore.addWorkspace(data.name, data.url);
  await workspaceStore.switchWorkspace(ws.id);
  setupSocket();
}

function setupSocket() {
  const socket = getSocket();
  socket.connect();
  socket.on('connect', () => {
    console.log('Connected to server');
  });
  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });

  socket.on('notification', (data) => {
    notification.info('Resource extracted', {
      link: {
        text: 'View resource',
        url: `/resource/${data.resourceId}`,
        onClick: () => {
          router.push(`/resource/${data.resourceId}`);
        }
      }
    });
  });
}

onMounted(async () => {
  initTheme();

  // Initialize workspace before anything else
  await workspaceStore.loadWorkspaces();

  if (workspaceStore.hasWorkspaces) {
    // Initialize offline support
    await offlineStore.checkOfflineEnabled();
    await offlineStore.loadOfflineState();
    offlineStore.isOnline = isOnline.value;

    // Start background sync (every 5 min while online)
    if (offlineStore.offlineEnabled) {
      offlineStore.startBackgroundSync();
    }

    setupSocket();
  }
});
</script>
