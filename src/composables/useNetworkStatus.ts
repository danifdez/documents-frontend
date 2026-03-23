import { ref, onMounted, onUnmounted, readonly } from 'vue';
import axios from 'axios';
import { setServerReachable, isServerReachable } from '../services/offline/offlineInterceptor';

const isOnline = ref(true);
let pingInterval: ReturnType<typeof setInterval> | null = null;
let listeners = 0;

async function pingServer() {
  try {
    const baseUrl = localStorage.getItem('_lastApiBaseUrl') || 'http://localhost:3000';
    await axios.get(`${baseUrl}/auth/status`, { timeout: 5000 });
    isOnline.value = true;
    setServerReachable(true);
  } catch {
    isOnline.value = false;
    setServerReachable(false);
  }
}

export function useNetworkStatus() {
  onMounted(() => {
    listeners++;
    if (listeners === 1) {
      // Ping immediately to detect server state
      pingServer();

      // Then periodically
      pingInterval = setInterval(pingServer, 15000);
    }
  });

  onUnmounted(() => {
    listeners--;
    if (listeners === 0) {
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
    }
  });

  return { isOnline: readonly(isOnline) };
}

// Non-composable access for use outside components
export function getIsOnline(): boolean {
  return isServerReachable();
}
