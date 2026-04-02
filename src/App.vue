<template>
  <div v-if="!workspaceStore.initialized" />

  <!-- First launch: choose local or remote -->
  <div v-else-if="!workspaceStore.hasWorkspaces" class="fixed inset-0 flex items-center justify-center bg-surface">
    <div v-if="!showRemoteForm" class="flex flex-col items-center gap-6 max-w-md px-6">
      <h1 class="text-2xl font-bold text-text-primary">Documents</h1>
      <p class="text-sm text-text-muted text-center">Choose how you want to use the application</p>

      <div class="flex flex-col gap-3 w-full">
        <button @click="handleSetupLocal"
          :disabled="localSetupInProgress"
          class="w-full p-4 rounded-xl border border-border bg-surface-elevated hover:bg-surface-hover transition-colors cursor-pointer text-left disabled:opacity-50 disabled:cursor-wait">
          <div class="font-medium text-text-primary mb-1">Standalone</div>
          <div class="text-xs text-text-muted">Run everything locally on this machine. Services will be downloaded on first use (~350 MB).</div>
        </button>

        <button @click="showRemoteForm = true"
          class="w-full p-4 rounded-xl border border-border bg-surface-elevated hover:bg-surface-hover transition-colors cursor-pointer text-left">
          <div class="font-medium text-text-primary mb-1">Connect to server</div>
          <div class="text-xs text-text-muted">Connect to an existing Documents server on your network.</div>
        </button>
      </div>

      <!-- Loading state for local setup -->
      <div v-if="localSetupInProgress" class="text-sm text-text-secondary">
        Starting local server...
      </div>
      <div v-if="workspaceStore.localServerError" class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 w-full">
        {{ workspaceStore.localServerError }}
      </div>
    </div>

    <!-- Remote workspace form -->
    <WorkspaceModal v-else
      @save="handleFirstRemoteWorkspace"
      @close="showRemoteForm = false"
      :closable="true" />
  </div>

  <div v-else-if="isLoginRoute">
    <router-view />
  </div>
  <MainLayout v-else>
    <div :class="['flex-1 flex flex-col min-h-0 overflow-hidden', isBrowserPage ? '' : 'px-5 pt-4']">
      <router-view class="flex-1 min-h-0 overflow-hidden" />
    </div>
    <GlobalSearchModal :show="showGlobalSearch" @close="showGlobalSearch = false" />
    <SelectionLookup />
    <TaskPanel v-model="showTaskPanel" />
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
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
const isBrowserPage = computed(() => route.name === 'BrowserPage' || route.name === 'BrowserToolbar');
const showRemoteForm = ref(false);
const localSetupInProgress = ref(false);

// Sync network status to offline store and auto-sync on reconnect
watch(isOnline, (online, wasOnline) => {
  offlineStore.isOnline = online;
  if (online && !wasOnline && offlineStore.offlineEnabled && offlineStore.pendingChangeCount > 0) {
    offlineStore.syncOnReconnect();
  }
});

async function handleSetupLocal() {
  localSetupInProgress.value = true;
  // Check if services are installed; if not, install them first
  const installed = await window.electronAPI.standaloneIsReady();
  if (!installed) {
    // Download services before starting
    const result = await window.electronAPI.standaloneDownloadAll();
    if (!result.success) {
      workspaceStore.localServerError = result.error || 'Failed to install services';
      localSetupInProgress.value = false;
      return;
    }
  }
  await workspaceStore.setupLocal();
  localSetupInProgress.value = false;
  if (!workspaceStore.localServerError) {
    setupSocket();
  }
}

async function handleFirstRemoteWorkspace(data: { name: string; url: string }) {
  const ws = await workspaceStore.addWorkspace(data.name, data.url);
  await workspaceStore.switchWorkspace(ws.id);
  showRemoteForm.value = false;
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

  // Listen for navigation requests from browser window
  window.electronAPI?.onNavigateToRoute?.((route) => {
    router.push(route);
  });

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
