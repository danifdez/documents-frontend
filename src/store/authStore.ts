import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '../services/api';

export interface AuthUser {
  id: number;
  username: string;
  displayName: string | null;
  role: string;
  permissions: Record<string, boolean>;
}

function tokenKey(key: string): string {
  const wsId = localStorage.getItem('activeWorkspaceId') || 'default';
  return `${key}_${wsId}`;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const accessToken = ref<string | null>(localStorage.getItem(tokenKey('accessToken')));
  const refreshTokenValue = ref<string | null>(localStorage.getItem(tokenKey('refreshToken')));
  const authRequired = ref(false);
  const initialized = ref(false);

  const isAuthenticated = computed(() => !!accessToken.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const permissions = computed(() => user.value?.permissions ?? {});

  async function checkAuthStatus() {
    try {
      const { data } = await apiClient.get('/auth/status');
      authRequired.value = data.authEnabled === true;
      // Remember last known auth state for offline use
      localStorage.setItem(tokenKey('authRequired'), String(authRequired.value));

      // Pass feature flags to feature store
      if (data.features) {
        const { useFeatureStore } = await import('./featureStore');
        const featureStore = useFeatureStore();
        featureStore.setBackendFeatures(data.features);
        await featureStore.loadLocalPreferences();
      }
    } catch {
      // Offline: restore last known auth state
      const cached = localStorage.getItem(tokenKey('authRequired'));
      authRequired.value = cached === 'true';
    }

    // Load tokens for current workspace
    accessToken.value = localStorage.getItem(tokenKey('accessToken'));
    refreshTokenValue.value = localStorage.getItem(tokenKey('refreshToken'));

    initialized.value = true;
  }

  async function login(username: string, password: string) {
    const { data } = await apiClient.post('/auth/login', { username, password });
    accessToken.value = data.accessToken;
    refreshTokenValue.value = data.refreshToken;
    user.value = data.user;
    localStorage.setItem(tokenKey('accessToken'), data.accessToken);
    localStorage.setItem(tokenKey('refreshToken'), data.refreshToken);
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
      localStorage.setItem(tokenKey('accessToken'), data.accessToken);
      localStorage.setItem(tokenKey('refreshToken'), data.refreshToken);
      return true;
    } catch {
      logout();
      return false;
    }
  }

  function logout() {
    user.value = null;
    accessToken.value = null;
    refreshTokenValue.value = null;
    localStorage.removeItem(tokenKey('accessToken'));
    localStorage.removeItem(tokenKey('refreshToken'));
  }

  function reset() {
    user.value = null;
    accessToken.value = null;
    refreshTokenValue.value = null;
    authRequired.value = false;
    initialized.value = false;
  }

  function hasPermission(perm: string): boolean {
    if (!authRequired.value) return true;
    if (!isAuthenticated.value) return false;
    if (isAdmin.value) return true;
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
    reset,
    hasPermission,
  };
});
