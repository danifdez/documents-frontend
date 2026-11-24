import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '../services/api';
import { getActiveWorkspaceId, workspaceKey } from '../services/workspaceScope';

export interface AuthUser {
  id: number;
  username: string;
  displayName: string | null;
  avatarPath: string | null;
  permissions: Record<string, boolean>;
  groupId: number | null;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const accessToken = ref<string | null>(localStorage.getItem(workspaceKey('accessToken')));
  const refreshTokenValue = ref<string | null>(localStorage.getItem(workspaceKey('refreshToken')));
  const authRequired = ref(false);
  const initialized = ref(false);
  let freshLoginRequired = false;

  const isAuthenticated = computed(() => !!accessToken.value);
  const isAdmin = computed(() => !!user.value?.permissions?.['user-management']);
  const permissions = computed(() => user.value?.permissions ?? {});

  async function checkAuthStatus() {
    // Local workspaces skip authentication entirely
    const { useWorkspaceStore } = await import('./workspaceStore');
    const wsStore = useWorkspaceStore();
    const workspaceId = getActiveWorkspaceId();
    if (wsStore.isLocal) {
      logout();
      authRequired.value = false;
      initialized.value = true;
      // Still load feature flags from backend
      try {
        const { data } = await apiClient.get('/auth/status');
        if (data.features) {
          const { useFeatureStore } = await import('./featureStore');
          const featureStore = useFeatureStore();
          featureStore.setBackendFeatures(data.features);
          await featureStore.loadLocalPreferences(true);
        }
      } catch { /* standalone server may not be ready yet */ }
      return;
    }

    const authRequiredKey = workspaceKey('authRequired', workspaceId);
    try {
      const { data } = await apiClient.get('/auth/status');
      if (workspaceId !== getActiveWorkspaceId()) return;
      authRequired.value = data.authEnabled === true;
      localStorage.setItem(authRequiredKey, String(authRequired.value));
      if (freshLoginRequired) {
        logout();
        freshLoginRequired = false;
      }

      // Pass feature flags to feature store
      if (data.features) {
        const { useFeatureStore } = await import('./featureStore');
        const featureStore = useFeatureStore();
        featureStore.setBackendFeatures(data.features);
        await featureStore.loadLocalPreferences();
      }
    } catch {
      if (workspaceId !== getActiveWorkspaceId()) return;
      authRequired.value = localStorage.getItem(authRequiredKey) === 'true';
    }

    if (workspaceId !== getActiveWorkspaceId()) return;
    accessToken.value = localStorage.getItem(workspaceKey('accessToken', workspaceId));
    refreshTokenValue.value = localStorage.getItem(workspaceKey('refreshToken', workspaceId));

    initialized.value = true;
  }

  async function login(username: string, password: string) {
    const { data } = await apiClient.post('/auth/login', { username, password });
    accessToken.value = data.accessToken;
    refreshTokenValue.value = data.refreshToken;
    user.value = data.user;
    freshLoginRequired = false;
    localStorage.setItem(workspaceKey('accessToken'), data.accessToken);
    localStorage.setItem(workspaceKey('refreshToken'), data.refreshToken);

    // Reconnect WebSocket with new token
    const { reconnectSocket } = await import('../services/notifications/notification');
    reconnectSocket();
  }

  async function refresh(): Promise<boolean> {
    if (!refreshTokenValue.value) return false;
    try {
      const { data } = await apiClient.post('/auth/refresh', {
        refreshToken: refreshTokenValue.value,
      });
      accessToken.value = data.accessToken;
      refreshTokenValue.value = data.refreshToken;
      user.value = data.user;
      localStorage.setItem(workspaceKey('accessToken'), data.accessToken);
      localStorage.setItem(workspaceKey('refreshToken'), data.refreshToken);
      return true;
    } catch {
      logout();
      return false;
    }
  }

  function clearSession() {
    user.value = null;
    accessToken.value = null;
    refreshTokenValue.value = null;
  }

  function logout() {
    clearSession();
    localStorage.removeItem(workspaceKey('accessToken'));
    localStorage.removeItem(workspaceKey('refreshToken'));
  }

  function resetForWorkspace() {
    // Keep persisted tokens available for offline startup. A reachable server
    // still requires a fresh login when entering a remote workspace.
    clearSession();
    authRequired.value = false;
    initialized.value = false;
    freshLoginRequired = true;
  }

  function hasPermission(perm: string): boolean {
    if (!authRequired.value) return true;
    if (!isAuthenticated.value) return false;
    return permissions.value[perm] === true;
  }

  return {
    user,
    accessToken,
    authRequired,
    initialized,
    isAuthenticated,
    isAdmin,
    permissions,
    checkAuthStatus,
    login,
    refresh,
    logout,
    resetForWorkspace,
    hasPermission,
  };
});
