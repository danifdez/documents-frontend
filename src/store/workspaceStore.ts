import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { setApiBaseUrl } from '../services/api';
import { reconnectSocket } from '../services/notifications/notification';
import type { Workspace } from '../types/Workspace';

const LOCAL_WORKSPACE_ID = 'local';

export const useWorkspaceStore = defineStore('workspace', () => {
  const workspaces = ref<Workspace[]>([]);
  const activeWorkspace = ref<Workspace | null>(null);
  const initialized = ref(false);
  const localServerLoading = ref(false);
  const localServerError = ref<string | null>(null);

  const activeWorkspaceId = computed(() => activeWorkspace.value?.id || '');
  const hasWorkspaces = computed(() => workspaces.value.length > 0);
  const isLocal = computed(() => activeWorkspace.value?.type === 'local');
  const defaultWorkspaceId = ref<string | null>(null);

  async function loadWorkspaces() {
    const loaded = await window.electronAPI.getWorkspaces();
    workspaces.value = loaded.map((w: any) => ({ ...w, type: w.type || 'remote' }));

    // Load default workspace preference
    defaultWorkspaceId.value = await window.electronAPI.getDefaultWorkspace();

    // Use default workspace if set, otherwise last active
    let active: any = null;
    if (defaultWorkspaceId.value) {
      const defaultWs = workspaces.value.find(w => w.id === defaultWorkspaceId.value);
      if (defaultWs) {
        await window.electronAPI.setActiveWorkspace(defaultWs.id);
        active = defaultWs;
      }
    }
    if (!active) {
      active = await window.electronAPI.getActiveWorkspace();
    }
    activeWorkspace.value = active ? { ...active, type: active.type || 'remote' } : null;

    if (activeWorkspace.value) {
      if (activeWorkspace.value.type === 'local') {
        await startLocalServer();
      } else {
        setApiBaseUrl(activeWorkspace.value.url);
        // Remote workspaces always require fresh login on startup
        const { useAuthStore } = await import('./authStore');
        useAuthStore().reset();
      }
    }

    initialized.value = true;
  }

  async function setupLocal() {
    // Create the local workspace if it doesn't exist
    let local = workspaces.value.find(w => w.id === LOCAL_WORKSPACE_ID);
    if (!local) {
      local = { id: LOCAL_WORKSPACE_ID, name: 'Local', url: '', type: 'local' };
      await window.electronAPI.addWorkspace(local);
      workspaces.value.push(local);
    }
    await switchWorkspace(LOCAL_WORKSPACE_ID);
  }

  async function addWorkspace(name: string, url: string): Promise<Workspace> {
    const workspace: Workspace = { id: uuidv4(), name, url, type: 'remote' };
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
      if (workspace.type !== 'local') {
        setApiBaseUrl(workspace.url);
      }
    }
  }

  async function removeWorkspace(id: string) {
    if (id === LOCAL_WORKSPACE_ID) {
      await window.electronAPI.standaloneStop();
    }
    await window.electronAPI.removeWorkspace(id);
    workspaces.value = workspaces.value.filter((w) => w.id !== id);
    if (activeWorkspace.value?.id === id && workspaces.value.length > 0) {
      await switchWorkspace(workspaces.value[0].id);
    }
  }

  async function switchWorkspace(id: string) {
    const workspace = workspaces.value.find((w) => w.id === id);
    if (!workspace) return;

    // Stop local server if switching away from local
    if (activeWorkspace.value?.type === 'local' && id !== LOCAL_WORKSPACE_ID) {
      await window.electronAPI.standaloneStop();
    }

    await window.electronAPI.setActiveWorkspace(id);
    activeWorkspace.value = workspace;

    if (workspace.type === 'local') {
      await startLocalServer();
    } else {
      setApiBaseUrl(workspace.url);
      reconnectSocket(workspace.url);
      // Remote workspaces always require fresh login on switch
      const { useAuthStore } = await import('./authStore');
      useAuthStore().reset();
    }
  }

  async function startLocalServer() {
    localServerLoading.value = true;
    localServerError.value = null;
    try {
      const result = await window.electronAPI.standaloneStart();
      if (result.success && result.url) {
        // Update the local workspace URL
        const local = workspaces.value.find(w => w.id === LOCAL_WORKSPACE_ID);
        if (local) local.url = result.url;
        if (activeWorkspace.value?.id === LOCAL_WORKSPACE_ID) {
          activeWorkspace.value = { ...activeWorkspace.value, url: result.url };
        }
        setApiBaseUrl(result.url);
        reconnectSocket(result.url);
      } else {
        localServerError.value = result.error || 'Failed to start local server';
      }
    } catch (err: any) {
      localServerError.value = err.message;
    } finally {
      localServerLoading.value = false;
    }
  }

  async function setDefaultWorkspace(id: string | null) {
    defaultWorkspaceId.value = id;
    await window.electronAPI.setDefaultWorkspace(id);
  }

  return {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    hasWorkspaces,
    initialized,
    isLocal,
    defaultWorkspaceId,
    localServerLoading,
    localServerError,
    loadWorkspaces,
    setupLocal,
    addWorkspace,
    updateWorkspace,
    removeWorkspace,
    switchWorkspace,
    setDefaultWorkspace,
  };
});
