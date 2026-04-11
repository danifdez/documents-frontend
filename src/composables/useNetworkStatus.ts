import { socketConnected } from '../services/notifications/notification';
import { isServerReachable } from '../services/offline/offlineInterceptor';

export function useNetworkStatus() {
  return { isOnline: socketConnected };
}

// Non-composable access for use outside components
export function getIsOnline(): boolean {
  return isServerReachable();
}
