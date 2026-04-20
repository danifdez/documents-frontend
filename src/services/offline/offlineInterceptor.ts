import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getOfflineItem, getAllOfflineItemsByWorkspace } from './offlineDb';
import { getUrlCache, setUrlCache } from './urlCache';

function getWsId(): string {
  return localStorage.getItem('activeWorkspaceId') || 'default';
}

// ── Server reachability state ──
// Tracks whether the backend is reachable. Once a request fails,
// all subsequent GETs go straight to cache without hitting the network.
let serverReachable = true;

export function isServerReachable(): boolean {
  return serverReachable;
}

export function setServerReachable(value: boolean) {
  const changed = serverReachable !== value;
  serverReachable = value;
  if (!changed) return;
  // Mirror into the Pinia store so the UI reacts. Dynamic import keeps
  // this free of a static cycle; try/catch survives the very first
  // request fired before Pinia is installed (module var is the fallback).
  import('../../store/offlineStore')
    .then(({ useOfflineStore }) => {
      try {
        useOfflineStore().setBackendReachable(value);
      } catch { /* Pinia not ready yet — module var still reflects state */ }
    })
    .catch(() => { /* ignore */ });
}

// ── URL pattern matching ──

const urlPatterns: Array<{ regex: RegExp; type: string; subfield?: string }> = [
  { regex: /^\/resources\/(\d+)\/content$/, type: 'resource', subfield: 'content' },
  { regex: /^\/resources\/(\d+)\/translated-content$/, type: 'resource', subfield: 'translatedContent' },
  { regex: /^\/resources\/(\d+)$/, type: 'resource' },
  { regex: /^\/docs\/(\d+)$/, type: 'doc' },
  { regex: /^\/threads\/(\d+)$/, type: 'thread' },
  { regex: /^\/notes\/(\d+)$/, type: 'note' },
  { regex: /^\/projects\/(\d+)$/, type: 'project' },
];

const listPatterns: Array<{ regex: RegExp; type: string; filterByParent?: { type: string; paramIndex: number } }> = [
  { regex: /^\/projects\/?$/, type: 'project' },
  { regex: /^\/threads\/project\/(\d+)\/?$/, type: 'thread', filterByParent: { type: 'project', paramIndex: 1 } },
  { regex: /^\/resources\/project\/(\d+)\/?$/, type: 'resource', filterByParent: { type: 'project', paramIndex: 1 } },
  { regex: /^\/docs\/project\/(\d+)\/?$/, type: 'doc', filterByParent: { type: 'project', paramIndex: 1 } },
  { regex: /^\/comments\/doc\/(\d+)\/?$/, type: 'comment' },
  { regex: /^\/comments\/resource\/(\d+)\/?$/, type: 'comment' },
  { regex: /^\/marks\/doc\/(\d+)\/?$/, type: 'mark' },
  { regex: /^\/marks\/resource\/(\d+)\/?$/, type: 'mark' },
  { regex: /^\/notes\/?$/, type: 'note' },
  { regex: /^\/notes\/project\/(\d+)\/?$/, type: 'note' },
  { regex: /^\/canvases\/project\/(\d+)\/?$/, type: '__empty__' },
  { regex: /^\/canvases\/thread\/(\d+)\/?$/, type: '__empty__' },
  { regex: /^\/calendar-events/, type: '__empty__' },
  { regex: /^\/timelines\/project\/(\d+)\/?$/, type: '__empty__' },
  { regex: /^\/resource-types\/?$/, type: '__empty__' },
  { regex: /^\/resources\/pending\/?$/, type: '__empty__' },
  { regex: /^\/auth\/status\/?$/, type: '__auth_status__' },
];

function matchUrl(url: string): { type: string; id: number; subfield?: string } | null {
  for (const pattern of urlPatterns) {
    const match = url.match(pattern.regex);
    if (match) {
      return { type: pattern.type, id: parseInt(match[1], 10), subfield: pattern.subfield };
    }
  }
  return null;
}

function matchListUrl(url: string): { type: string; parentId?: number } | null {
  for (const pattern of listPatterns) {
    const match = url.match(pattern.regex);
    if (match) {
      const parentId = pattern.filterByParent ? parseInt(match[pattern.filterByParent.paramIndex], 10) : undefined;
      return { type: pattern.type, parentId };
    }
  }
  return null;
}

// ── Cache resolution ──

async function resolveFromCache(url: string): Promise<any | undefined> {
  const wsId = getWsId();

  // List endpoints
  const listMatch = matchListUrl(url);
  if (listMatch) {
    if (listMatch.type === '__empty__') return [];
    if (listMatch.type === '__auth_status__') {
      const cachedAuth = localStorage.getItem(`authRequired_${wsId}`);
      return { authEnabled: cachedAuth === 'true', offlineEnabled: true };
    }

    const allItems = await getAllOfflineItemsByWorkspace(wsId);
    let items = allItems.filter((item) => item.entityType === listMatch.type);

    if (listMatch.parentId) {
      items = items.filter((item) =>
        item.parentId === listMatch.parentId
        || item.data?.project?.id === listMatch.parentId
      );
    }

    if (items.length > 0) {
      return items.map((item) => item.data);
    }
    // Fall through to URL cache below — covers items not pre-bundled.
  }

  // Single-item endpoints
  const matched = matchUrl(url);
  if (matched) {
    const item = await getOfflineItem(wsId, matched.type, matched.id);
    if (item) {
      return matched.subfield
        ? { [matched.subfield]: item.data[matched.subfield] }
        : item.data;
    }
    // Fall through to URL cache below.
  }

  // URL-keyed cache: covers any GET we've previously seen successfully,
  // even if it doesn't fit the structured patterns above.
  return getUrlCache(wsId, 'get', url);
}

function offlineResponse(data: any, config: any, statusText: string) {
  return { data, status: 200, statusText, headers: {}, config };
}

// ── Interceptors ──

const OFFLINE_ABORT = '__offline_abort__';

export function registerOfflineInterceptors(apiClient: AxiosInstance) {

  // Request interceptor: if server is unreachable, resolve from cache immediately
  apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      if (serverReachable) return config;

      if (config.method !== 'get') {
        // Mark for offline queueing in response interceptor
        (config as any)[OFFLINE_ABORT] = true;
        const controller = new AbortController();
        controller.abort();
        config.signal = controller.signal;
        return config;
      }

      // Resolve GET from cache — never hit the network
      const url = config.url || '';
      const cached = await resolveFromCache(url);

      if (cached !== undefined) {
        (config as any)[OFFLINE_ABORT] = cached;
      } else {
        // No cache — return empty array for lists, empty object for unknown
        (config as any)[OFFLINE_ABORT] = [];
      }

      // Abort the real request
      const controller = new AbortController();
      controller.abort();
      config.signal = controller.signal;
      return config;
    },
  );

  // Response interceptor
  apiClient.interceptors.response.use(
    (response) => {
      // Server responded — mark as reachable
      setServerReachable(true);
      if (response.config.baseURL) {
        localStorage.setItem('_lastApiBaseUrl', response.config.baseURL);
      }

      // Write-through cache: store every successful GET so we can serve it
      // from cache the next time the backend is unreachable.
      if (response.config.method === 'get' && response.status >= 200 && response.status < 300) {
        const url = response.config.url || '';
        // Skip caching of binary file downloads and the auth/refresh endpoint.
        const isBinary = response.config.responseType === 'blob' || response.config.responseType === 'arraybuffer';
        if (url && !isBinary && !url.startsWith('/auth/refresh')) {
          try {
            setUrlCache(getWsId(), 'get', url, response.data);
          } catch { /* ignore caching failures */ }
        }
      }
      return response;
    },
    async (error: AxiosError) => {
      const config = error.config;
      if (!config) return Promise.reject(error);

      // Handle requests we aborted ourselves for offline mode
      if (OFFLINE_ABORT in (config as any)) {
        const data = (config as any)[OFFLINE_ABORT];

        // GET: return cached data (or empty fallback)
        if (config.method === 'get') {
          return offlineResponse(data, config, 'OK (offline)');
        }

        // Mutations: queue for later sync
        const url = config.url || '';
        const matched = matchUrl(url);
        if (matched) {
          const { useOfflineStore } = await import('../../store/offlineStore');
          const offlineStore = useOfflineStore();
          const method = config.method!.toUpperCase() as 'PATCH' | 'POST' | 'DELETE';
          const payload = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {};
          await offlineStore.addPendingChange(matched.type, matched.id, method, payload);
          return offlineResponse({ ...payload, id: matched.id }, config, 'OK (queued offline)');
        }

        return Promise.reject(error);
      }

      // Real network error (server was thought reachable but isn't).
      // Covers ERR_NETWORK, ERR_NETWORK_CHANGED, ECONNREFUSED, ECONNRESET, ECONNABORTED, etc.
      // Exclude our own aborted requests (ERR_CANCELED).
      if (!error.response && error.code !== 'ERR_CANCELED') {
        setServerReachable(false);

        // Try to serve this failed GET from cache, fallback to empty
        if (config.method === 'get') {
          const url = config.url || '';
          const cached = await resolveFromCache(url);
          return offlineResponse(cached !== undefined ? cached : [], config, 'OK (offline fallback)');
        }

        // Queue mutations
        if (config.method && ['patch', 'put', 'post', 'delete'].includes(config.method)) {
          const url = config.url || '';
          const matched = matchUrl(url);
          if (matched) {
            const { useOfflineStore } = await import('../../store/offlineStore');
            const offlineStore = useOfflineStore();
            const method = config.method.toUpperCase() as 'PATCH' | 'POST' | 'DELETE';
            const payload = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {};
            await offlineStore.addPendingChange(matched.type, matched.id, method, payload);
            return offlineResponse({ ...payload, id: matched.id }, config, 'OK (queued offline)');
          }
          // Unknown mutation URL: don't reject (would surface as unhandled rejection
          // and can blank the UI). Return a 503-like synthetic response; callers
          // checking response.status can react, callers awaiting data get an empty object.
          return offlineResponse({}, config, 'Service Unavailable (offline)');
        }
      }

      return Promise.reject(error);
    },
  );
}
