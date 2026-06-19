<template>
  <div v-if="!workspaceStore.initialized" />

  <!-- First launch: choose local or remote -->
  <div v-else-if="!workspaceStore.hasWorkspaces" class="fixed inset-0 flex items-center justify-center bg-surface">
    <!-- Standalone setup wizard -->
    <StandaloneSetup v-if="showStandaloneSetup"
      @done="onStandaloneDone"
      @use-server="showStandaloneSetup = false; showRemoteForm = true"
      @back="showStandaloneSetup = false" />

    <div v-else-if="!showRemoteForm" class="flex flex-col items-center gap-6 max-w-md px-6">
      <h1 class="text-2xl font-bold text-text-primary">Documents</h1>
      <p class="text-sm text-text-muted text-center">Choose how you want to use the application</p>

      <div class="flex flex-col gap-3 w-full">
        <button @click="showStandaloneSetup = true"
          class="w-full p-4 rounded-2xl border border-border bg-surface-elevated hover:bg-surface-hover transition-colors cursor-pointer text-left">
          <div class="font-medium text-text-primary mb-1">Standalone</div>
          <div class="text-xs text-text-muted">Run everything locally on this machine. We'll check your hardware and let you pick what to install.</div>
        </button>

        <button @click="showRemoteForm = true"
          class="w-full p-4 rounded-2xl border border-border bg-surface-elevated hover:bg-surface-hover transition-colors cursor-pointer text-left">
          <div class="font-medium text-text-primary mb-1">Connect to server</div>
          <div class="text-xs text-text-muted">Connect to an existing Documents server on your network.</div>
        </button>
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
    <AssistantModal v-if="featureStore.isEnabled('assistants')" v-model="showAssistant" />
  </MainLayout>

  <OfflineBanner v-if="workspaceStore.hasWorkspaces" />
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import MainLayout from './layout/MainLayout.vue';
import GlobalSearchModal from './components/GlobalSearchModal.vue';
import SelectionLookup from './components/knowledge/SelectionLookup.vue';
import TaskPanel from './components/user-tasks/TaskPanel.vue';
import WorkspaceModal from './components/WorkspaceModal.vue';
import StandaloneSetup from './components/StandaloneSetup.vue';
import OfflineBanner from './components/OfflineBanner.vue';
import AssistantModal from './components/assistant/AssistantModal.vue';
import { useGlobalKeyboard } from './composables/useGlobalKeyboard';
import { useTaskPanel } from './composables/useTaskPanel';
import { getSocket, connectSocket } from './services/notifications/notification';
import { bindCalendarAlarms } from './services/calendar/useCalendarAlarms';
import { bindTaskReminders } from './services/user-tasks/useTaskReminders';
import { useRouter, useRoute } from 'vue-router';
import { useNotification } from './composables/useNotification';
import { useTheme } from './composables/useTheme';
import { useWorkspaceStore } from './store/workspaceStore';
import { useOfflineStore } from './store/offlineStore';
import { useFeatureStore } from './store/featureStore';

const notification = useNotification();
const router = useRouter();
const route = useRoute();
const { showGlobalSearch, showAssistant } = useGlobalKeyboard();
const { showTaskPanel } = useTaskPanel();
const { initTheme } = useTheme();
const workspaceStore = useWorkspaceStore();
const offlineStore = useOfflineStore();
const featureStore = useFeatureStore();

const isLoginRoute = computed(() => route.name === 'Login');
const isBrowserPage = computed(() => route.name === 'BrowserPage' || route.name === 'BrowserToolbar');
const showRemoteForm = ref(false);
const showStandaloneSetup = ref(false);

function onStandaloneDone() {
  showStandaloneSetup.value = false;
  setupSocket();
}

async function handleFirstRemoteWorkspace(data: { name: string; url: string }) {
  const ws = await workspaceStore.addWorkspace(data.name, data.url);
  await workspaceStore.switchWorkspace(ws.id);
  showRemoteForm.value = false;
  setupSocket();
}

function setupSocket() {
  connectSocket();
  const socket = getSocket();
  socket.on('notification', (data) => {
    if (data.resourceId) {
      notification.info(data.message || 'Resource extracted', {
        link: {
          text: 'View resource',
          url: `/resource/${data.resourceId}`,
          onClick: () => {
            router.push(`/resource/${data.resourceId}`);
          }
        }
      });
    }
  });
  bindCalendarAlarms();
  bindTaskReminders();
}

onMounted(async () => {
  initTheme();

  // Listen for navigation requests from browser window
  window.electronAPI?.onNavigateToRoute?.((route) => {
    router.push(route);
  });

  window.calendarAlarms?.onNavigateToEvent?.((eventId: number) => {
    router.push({ path: '/calendar', query: { eventId: String(eventId) } });
  });
  window.calendarAlarms?.onNavigateMissedPanel?.(() => {
    router.push({ path: '/calendar/missed' });
  });

  window.taskReminders?.onNavigateToTask?.(() => {
    showTaskPanel.value = true;
  });
  window.taskReminders?.onNavigateMissedTasksPanel?.(() => {
    showTaskPanel.value = true;
  });

  // Initialize workspace before anything else
  await workspaceStore.loadWorkspaces();

  if (workspaceStore.hasWorkspaces) {
    // Probe the backend so the first paint already reflects reachability
    await offlineStore.probeBackend();
    await offlineStore.loadOfflineState();
    offlineStore.startBackgroundSync();

    setupSocket();
  }
});
</script>
