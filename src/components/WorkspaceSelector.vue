<template>
  <div class="relative" ref="dropdownRef">
    <!-- Trigger -->
    <button @click="open = !open"
      class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer"
      :class="{ 'justify-center': collapsed }">
      <div class="w-5 h-5 rounded bg-accent/20 flex items-center justify-center shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-accent" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
        </svg>
      </div>
      <span v-if="!collapsed" class="text-xs font-medium truncate flex-1 text-left">
        {{ workspaceStore.activeWorkspace?.name || 'No workspace' }}
      </span>
      <svg v-if="!collapsed" xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 shrink-0 text-text-muted" fill="none"
        viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown -->
    <div v-if="open"
      class="absolute left-0 top-full mt-1 w-56 bg-surface border border-border rounded-lg shadow-lg z-50 py-1">
      <div v-for="ws in workspaceStore.workspaces" :key="ws.id"
        @click="selectWorkspace(ws.id)"
        class="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors"
        :class="ws.id === workspaceStore.activeWorkspaceId
          ? 'bg-accent-subtle text-accent-dark font-medium'
          : 'text-text-secondary hover:bg-surface-hover'">
        <div class="w-2 h-2 rounded-full shrink-0"
          :class="ws.id === workspaceStore.activeWorkspaceId ? 'bg-accent' : 'bg-border'"></div>
        <span class="truncate flex-1">{{ ws.name }}</span>
        <span v-if="ws.type === 'local'" class="text-xs text-accent truncate max-w-24">local</span>
        <span v-else class="text-xs text-text-muted truncate max-w-24">{{ formatUrl(ws.url) }}</span>
      </div>

      <div class="border-t border-border mt-1 pt-1">
        <button @click="showAddModal = true; open = false"
          class="flex items-center gap-2 px-3 py-2 w-full text-sm text-text-muted hover:bg-surface-hover transition-colors cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add workspace
        </button>
      </div>
    </div>

    <WorkspaceModal v-if="showAddModal" @close="showAddModal = false" @save="handleAdd" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { useRouter } from 'vue-router';
import WorkspaceModal from './WorkspaceModal.vue';

defineProps<{ collapsed: boolean }>();

const workspaceStore = useWorkspaceStore();
const authStore = useAuthStore();
const projectStore = useProjectStore();
const router = useRouter();
const open = ref(false);
const showAddModal = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

function formatUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname + (u.port ? `:${u.port}` : '');
  } catch {
    return url;
  }
}

async function selectWorkspace(id: string) {
  open.value = false;
  if (id === workspaceStore.activeWorkspaceId) return;

  // Reset app state
  authStore.reset();
  projectStore.clearCurrentProject();

  // Switch workspace
  await workspaceStore.switchWorkspace(id);

  // Re-check auth for new workspace
  await authStore.checkAuthStatus();

  // Navigate to root
  router.push('/');
}

async function handleAdd(data: { name: string; url: string }) {
  const ws = await workspaceStore.addWorkspace(data.name, data.url);
  showAddModal.value = false;
  await selectWorkspace(ws.id);
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    open.value = false;
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));
</script>
