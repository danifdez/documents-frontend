import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore, type AuthUser } from '@/store/authStore';
import { useFeatureStore } from '@/store/featureStore';
import { useWorkspaceStore } from '@/store/workspaceStore';
import type { Workspace } from '@/types/Workspace';

const { api, setApiBaseUrl, reconnectSocket } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn() },
  setApiBaseUrl: vi.fn(),
  reconnectSocket: vi.fn(),
}));
vi.mock('@/services/api', () => ({ default: api, setApiBaseUrl }));
vi.mock('@/services/notifications/notification', () => ({ reconnectSocket }));

const remote: Workspace = { id: 'library', url: 'https://library.example', name: 'Library', type: 'remote' };
const second: Workspace = { id: 'archive', url: 'https://archive.example', name: 'Archive', type: 'remote' };
const local: Workspace = { id: 'local', url: '', name: 'Local', type: 'local' };
const localUrl = 'http://127.0.0.1:4301';
const user: AuthUser = {
  id: 1, username: 'curator', displayName: 'Curator', avatarPath: null, groupId: null,
  permissions: { 'user-management': true, export: false },
};

function installBridge() {
  const bridge = {
    getWorkspaces: vi.fn().mockResolvedValue([remote, second]),
    getDefaultWorkspace: vi.fn().mockResolvedValue(null),
    getActiveWorkspace: vi.fn().mockResolvedValue(remote),
    setActiveWorkspace: vi.fn(async (id: string) => { localStorage.setItem('activeWorkspaceId', id); }),
    addWorkspace: vi.fn().mockResolvedValue(undefined),
    updateWorkspace: vi.fn().mockResolvedValue(undefined),
    removeWorkspace: vi.fn().mockResolvedValue(undefined),
    setDefaultWorkspace: vi.fn().mockResolvedValue(undefined),
    standaloneStart: vi.fn().mockResolvedValue({ success: true, url: localUrl }),
    standaloneStop: vi.fn().mockResolvedValue(undefined),
    standaloneGetFeatures: vi.fn().mockResolvedValue({ timelines: false }),
    getSettings: vi.fn().mockResolvedValue({ disabledFeatures: ['datasets'] }),
  };
  vi.stubGlobal('electronAPI', bridge);
  return bridge;
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  setActivePinia(createPinia());
});

afterEach(() => vi.unstubAllGlobals());

describe('workspace-scoped authentication', () => {
  it('keeps the last remote auth requirement when offline and reloads session keys for the active workspace', async () => {
    installBridge();
    const store = useAuthStore();
    api.get.mockResolvedValueOnce({ data: { authEnabled: true, features: { canvas: false } } })
      .mockRejectedValueOnce(new Error('offline'));
    localStorage.setItem('activeWorkspaceId', remote.id);

    await store.checkAuthStatus();
    expect(store.initialized).toBe(true);
    expect(store.authRequired).toBe(true);
    expect(store.hasPermission('view')).toBe(false);
    expect(useFeatureStore().isEnabled('canvas')).toBe(false);
    expect(useFeatureStore().isEnabled('datasets')).toBe(false);
    expect(localStorage.getItem('authRequired_library')).toBe('true');

    localStorage.setItem('accessToken_library', 'library-access');
    localStorage.setItem('accessToken_archive', 'archive-access');
    await store.checkAuthStatus();
    expect(store.authRequired).toBe(true);
    expect(store.isAuthenticated).toBe(true);
    expect(store.accessToken).toBe('library-access');
    expect(store.hasPermission('view')).toBe(false);
  });

  it('rotates the refresh token and removes the current session when a later refresh fails', async () => {
    installBridge();
    const store = useAuthStore();
    const refreshed = { accessToken: 'new-access', refreshToken: 'new-refresh', user };
    api.get.mockResolvedValue({ data: { authEnabled: true } });
    api.post.mockResolvedValueOnce({ data: { accessToken: 'old-access', refreshToken: 'old-refresh', user } })
      .mockResolvedValueOnce({ data: refreshed }).mockRejectedValueOnce(new Error('expired'));
    localStorage.setItem('activeWorkspaceId', remote.id);
    localStorage.setItem('accessToken_archive', 'archive-session');
    await store.checkAuthStatus();

    await expect(store.refresh()).resolves.toBe(false);
    expect(api.post).not.toHaveBeenCalled();
    await store.login('curator', 'password-example');
    expect(store.isAdmin).toBe(true);
    expect(store.hasPermission('user-management')).toBe(true);
    expect(store.hasPermission('export')).toBe(false);

    await expect(store.refresh()).resolves.toBe(true);
    expect(api.post).toHaveBeenLastCalledWith('/auth/refresh', { refreshToken: 'old-refresh' });
    expect(localStorage.getItem('accessToken_library')).toBe('new-access');
    expect(localStorage.getItem('refreshToken_library')).toBe('new-refresh');

    await expect(store.refresh()).resolves.toBe(false);
    expect(api.post).toHaveBeenLastCalledWith('/auth/refresh', { refreshToken: 'new-refresh' });
    expect(store.user).toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(localStorage.getItem('accessToken_library')).toBeNull();
    expect(localStorage.getItem('refreshToken_library')).toBeNull();
    expect(localStorage.getItem('accessToken_archive')).toBe('archive-session');
  });

  it('skips login for standalone workspaces, applying both server and local feature flags', async () => {
    const bridge = installBridge();
    bridge.getWorkspaces.mockResolvedValue([local]);
    bridge.getActiveWorkspace.mockResolvedValue(local);
    api.get.mockResolvedValueOnce({ data: { authEnabled: true, features: { bibliography: false, timelines: true } } })
      .mockRejectedValueOnce(new Error('starting'));

    await useWorkspaceStore().loadWorkspaces();
    const store = useAuthStore();
    await store.checkAuthStatus();
    expect(store.authRequired).toBe(false);
    expect(store.hasPermission('export')).toBe(true);
    expect(useFeatureStore().isEnabled('bibliography')).toBe(false);
    expect(useFeatureStore().isEnabled('timelines')).toBe(false);
    await expect(store.checkAuthStatus()).resolves.toBeUndefined();
    expect(store.initialized).toBe(true);
  });
});

describe('workspace lifecycle via Electron', () => {
  it('prefers the saved default, normalizes legacy workspaces and resets a stale remote session', async () => {
    const bridge = installBridge();
    bridge.getWorkspaces.mockResolvedValue([{ id: remote.id, url: remote.url, name: remote.name }, second]);
    bridge.getDefaultWorkspace.mockResolvedValue(remote.id);
    const store = useWorkspaceStore();
    localStorage.setItem('accessToken_library', 'old-session');

    await store.loadWorkspaces();
    expect(store.workspaces).toEqual([remote, second]);
    expect(store.activeWorkspace).toEqual(remote);
    expect(store.initialized).toBe(true);
    expect(bridge.getActiveWorkspace).not.toHaveBeenCalled();
    expect(bridge.setActiveWorkspace).toHaveBeenCalledWith(remote.id);
    expect(setApiBaseUrl).toHaveBeenCalledWith(remote.url);
    expect(localStorage.getItem('accessToken_library')).toBeNull();
  });

  it('falls back to the last active workspace if the default was removed', async () => {
    const bridge = installBridge();
    bridge.getDefaultWorkspace.mockResolvedValue('missing');
    bridge.getActiveWorkspace.mockResolvedValue(second);
    const store = useWorkspaceStore();

    await store.loadWorkspaces();
    expect(store.activeWorkspace).toEqual(second);
    expect(bridge.getActiveWorkspace).toHaveBeenCalledOnce();
    await store.setDefaultWorkspace(second.id);
    expect(bridge.setDefaultWorkspace).toHaveBeenCalledWith(second.id);
    expect(store.defaultWorkspaceId).toBe(second.id);
    await store.setDefaultWorkspace(null);
    expect(bridge.setDefaultWorkspace).toHaveBeenLastCalledWith(null);
    expect(store.defaultWorkspaceId).toBeNull();
  });

  it('creates, updates and removes remote workspaces and keeps the active API origin in sync', async () => {
    const bridge = installBridge();
    const store = useWorkspaceStore();
    await store.loadWorkspaces();
    const created = await store.addWorkspace('Research', 'https://research.example');
    expect(created).toMatchObject({ name: 'Research', url: 'https://research.example', type: 'remote' });
    expect(bridge.addWorkspace).toHaveBeenCalledWith(created);

    const edited = { ...created, url: 'https://research-2.example' };
    setApiBaseUrl.mockClear();
    await store.updateWorkspace(edited);
    expect(setApiBaseUrl).not.toHaveBeenCalled();
    await store.switchWorkspace(created.id);
    expect(bridge.setActiveWorkspace).toHaveBeenLastCalledWith(created.id);
    expect(reconnectSocket).toHaveBeenLastCalledWith(edited.url);
    const moved = { ...edited, url: 'https://research-3.example' };
    await store.updateWorkspace(moved);
    expect(store.activeWorkspace).toEqual(moved);
    expect(setApiBaseUrl).toHaveBeenLastCalledWith(moved.url);

    await store.removeWorkspace(created.id);
    expect(store.activeWorkspaceId).toBe(remote.id);
    expect(store.workspaces).toEqual([remote, second]);
    expect(bridge.removeWorkspace).toHaveBeenCalledWith(created.id);
    expect(bridge.standaloneStop).not.toHaveBeenCalled();
    await store.switchWorkspace('unknown');
    expect(store.activeWorkspaceId).toBe(remote.id);
  });

  it('creates a local workspace once, starts the server, and stops it when switching back to remote', async () => {
    const bridge = installBridge();
    const store = useWorkspaceStore();
    await store.loadWorkspaces();
    const starting = store.setupLocal();
    await vi.waitFor(() => expect(bridge.standaloneStart).toHaveBeenCalledOnce());
    await starting;

    expect(bridge.addWorkspace).toHaveBeenCalledWith(expect.objectContaining({ id: local.id, type: local.type }));
    expect(store.isLocal).toBe(true);
    expect(store.activeWorkspace?.url).toBe(localUrl);
    expect(store.localServerLoading).toBe(false);
    expect(store.localServerError).toBeNull();
    expect(reconnectSocket).toHaveBeenLastCalledWith(localUrl);
    expect(useFeatureStore().isEnabled('timelines')).toBe(false);

    await store.setupLocal();
    expect(bridge.addWorkspace).toHaveBeenCalledOnce();
    await store.switchWorkspace(remote.id);
    expect(bridge.standaloneStop).toHaveBeenCalledOnce();
    expect(store.isLocal).toBe(false);
    expect(store.activeWorkspaceId).toBe(remote.id);
  });

  it.each([
    ['disk full', { success: false, error: 'disk full' }],
    ['Failed to start local server', { success: false }],
    ['bridge unavailable', new Error('bridge unavailable')],
  ] as const)('reports standalone start failure (%s), then clears it when retried', async (message, failure) => {
    const bridge = installBridge();
    bridge.getWorkspaces.mockResolvedValue([local, remote]);
    bridge.getActiveWorkspace.mockResolvedValue(local);
    if (failure instanceof Error) bridge.standaloneStart.mockRejectedValueOnce(failure);
    else bridge.standaloneStart.mockResolvedValueOnce(failure);
    const store = useWorkspaceStore();

    await store.loadWorkspaces();
    expect(store.localServerError).toBe(message);
    expect(store.localServerLoading).toBe(false);
    expect(reconnectSocket).not.toHaveBeenCalled();
    await store.switchWorkspace(local.id);
    expect(store.localServerError).toBeNull();
    expect(store.activeWorkspace?.url).toBe(localUrl);
  });
});
