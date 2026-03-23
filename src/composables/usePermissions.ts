import { computed } from 'vue';
import { useAuthStore } from '../store/authStore';

export function usePermissions() {
  const authStore = useAuthStore();

  const can = (permission: string): boolean => authStore.hasPermission(permission);
  const isAdmin = computed(() => authStore.isAdmin);
  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const authRequired = computed(() => authStore.authRequired);
  const user = computed(() => authStore.user);

  function logout() {
    authStore.logout();
  }

  return { can, isAdmin, isAuthenticated, authRequired, user, logout };
}
