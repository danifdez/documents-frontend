import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { setApiBaseUrl } from '../services/api';
import { reconnectSocket } from '../services/notifications/notification';
import type { Workspace } from '../types/Workspace';

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspaces = ref<Workspace[]>([]);
  const activeWorkspace = ref<Workspace | null>(null);
  const initialized = ref(false);

  const activeWorkspaceId = computed(() => activeWorkspace.value?.id || '');
  const hasWorkspaces = computed(() => workspaces.value.length > 0);

  async function loadWorkspaces() {
    workspaces.value = await window.electronAPI.getWorkspaces();
    activeWorkspace.value = await window.electronAPI.getActiveWorkspace();

    if (activeWorkspace.value) {
      setApiBaseUrl(activeWorkspace.value.url);
    }

    initialized.value = true;
  }

  async function addWorkspace(name: string, url: string): Promise<Workspace> {
    const workspace: Workspace = { id: uuidv4(), name, url };
    await window.electronAPI.addWorkspace(workspace);
    workspaces.value.push(workspace);
    return workspace;
  }

  async function updateWorkspace(workspace: Workspace) {
    await window.electronAPI.updateWorkspace(workspace);
    const index = workspaces.value.findIndex((w) => w.id === workspace.id);
    if (index >= 0) {
      workspaces.value[index] = workspace;
    }
    if (activeWorkspace.value?.id === workspace.id) {
      activeWorkspace.value = workspace;
      setApiBaseUrl(workspace.url);
    }
  }

  async function removeWorkspace(id: string) {
    await window.electronAPI.removeWorkspace(id);
    workspaces.value = workspaces.value.filter((w) => w.id !== id);
    if (activeWorkspace.value?.id === id && workspaces.value.length > 0) {
      await switchWorkspace(workspaces.value[0].id);
    }
  }

  async function switchWorkspace(id: string) {
    const workspace = workspaces.value.find((w) => w.id === id);
    if (!workspace) return;

    await window.electronAPI.setActiveWorkspace(id);

    activeWorkspace.value = workspace;

    // Update API client
    setApiBaseUrl(workspace.url);

    // Reconnect socket
    reconnectSocket(workspace.url);
  }

  return {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    hasWorkspaces,
    initialized,
    loadWorkspaces,
    addWorkspace,
    updateWorkspace,
    removeWorkspace,
    switchWorkspace,
  };
});
