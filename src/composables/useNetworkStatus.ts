import { computed } from 'vue';
import { socketConnected } from '../services/notifications/notification';
import { isServerReachable } from '../services/offline/offlineInterceptor';
import { useOfflineStore } from '../store/offlineStore';
import { storeToRefs } from 'pinia';

export function useNetworkStatus() {
  const offlineStore = useOfflineStore();
  const { backendReachable } = storeToRefs(offlineStore);
  const isOnline = computed(() => backendReachable.value);
  return { isOnline, isSocketConnected: socketConnected };
}

// Non-composable access for use outside components
export function getIsOnline(): boolean {
  return isServerReachable();
}
