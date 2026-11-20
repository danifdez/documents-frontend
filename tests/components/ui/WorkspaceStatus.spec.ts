import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import SyncIndicator from '@/components/SyncIndicator.vue';
import WorkspaceSelector from '@/components/WorkspaceSelector.vue';
import { useAuthStore } from '@/store/authStore';
import { useOfflineStore } from '@/store/offlineStore';
import { useProjectStore } from '@/store/projectStore';
import { useWorkspaceStore } from '@/store/workspaceStore';

const state = vi.hoisted(() => ({
  setApiBaseUrl: vi.fn(), reconnect: vi.fn(), get: vi.fn(),
}));
vi.mock('@/services/api', () => ({ default: { get: state.get }, setApiBaseUrl: state.setApiBaseUrl }));
vi.mock('@/services/notifications/notification', () => ({ reconnectSocket: state.reconnect }));

const archive = { id: 'archives', name: 'Archives', type: 'remote' as const, url: 'https://archive.example:4400/path' };
const branch = { id: 'west', name: 'West archive', type: 'remote' as const, url: 'https://west.example' };
const button = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  state.get.mockResolvedValue({ data: { authEnabled: false } });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('workspace navigation and offline status', () => {
  it('renders and dismisses the workspace menu without changing the selected workspace', async () => {
    const pinia = createPinia();
    const store = useWorkspaceStore(pinia);
    store.activeWorkspace = archive;
    store.workspaces = [archive, { ...branch, url: 'not-a-literal-url' }, { id: 'local', name: 'Local profile', type: 'local', url: '' }];
    const change = vi.spyOn(store, 'switchWorkspace');
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] });
    await router.push('/');
    render(WorkspaceSelector, { props: { collapsed: false }, global: { plugins: [pinia, router] } });
    await fireEvent.click(button('Archives'));
    expect(screen.getByText('archive.example:4400')).toBeTruthy();
    expect(screen.getByText('not-a-literal-url')).toBeTruthy();
    expect(screen.getByText('local')).toBeTruthy();

    await fireEvent.click(screen.getByText('archive.example:4400'));
    expect(screen.queryByText('Add workspace')).toBeNull();
    expect(change).not.toHaveBeenCalled();
    await fireEvent.click(button('Archives'));
    await fireEvent.click(document.body);
    expect(screen.queryByText('Add workspace')).toBeNull();
  });

  it('clears the active project and authentication state and opens the selected workspace', async () => {
    const pinia = createPinia();
    const store = useWorkspaceStore(pinia);
    const auth = useAuthStore(pinia);
    const project = useProjectStore(pinia);
    store.workspaces = [archive, branch];
    store.activeWorkspace = archive;
    auth.user = { id: 42, username: 'member', displayName: null, avatarPath: null, permissions: {}, groupId: null };
    project.setCurrentProject({ id: 9, name: 'Index', status: 'active', description: null, createdAt: '', updatedAt: '' });
    const bridge = { setActiveWorkspace: vi.fn().mockResolvedValue(undefined) };
    vi.stubGlobal('electronAPI', bridge);
    const component = { template: '<div />' };
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component }, { path: '/project/9', component }] });
    await router.push('/project/9');
    render(WorkspaceSelector, { props: { collapsed: false }, global: { plugins: [pinia, router] } });
    await fireEvent.click(button('Archives'));
    await fireEvent.click(screen.getByText('West archive'));
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/'));
    expect(store.activeWorkspaceId).toBe('west');
    expect(auth.user).toBeNull();
    expect(project.currentProject).toBeNull();
    expect(bridge.setActiveWorkspace).toHaveBeenCalledExactlyOnceWith('west');
    expect(state.setApiBaseUrl).toHaveBeenCalledWith(branch.url);
    expect(state.reconnect).toHaveBeenCalledWith(branch.url);
    expect(state.get).toHaveBeenCalledWith('/auth/status');
  });

  it('shows pending changes while disconnected and only allows synchronization after reconnecting', async () => {
    const pinia = createPinia();
    const store = useOfflineStore(pinia);
    store.backendReachable = false;
    store.isOnline = false;
    store.pendingChangeCount = 3;
    const sync = vi.spyOn(store, 'syncOnReconnect').mockResolvedValue(undefined);
    render(SyncIndicator, { props: { collapsed: false }, global: { plugins: [pinia] } });
    await fireEvent.click(button('Offline (3)'));
    expect(screen.getByText('Offline')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Sync Now' })).toBeNull();

    store.backendReachable = true;
    store.isOnline = true;
    await fireEvent.click(await screen.findByRole('button', { name: 'Sync Now' }));
    expect(sync).toHaveBeenCalledTimes(1);
    store.isSyncing = true;
    const progress = await screen.findAllByRole('button', { name: 'Syncing...' });
    expect(progress.some((item) => (item as HTMLButtonElement).disabled)).toBe(true);
    await fireEvent.click(document.body);
    expect(screen.queryByText('Pending changes')).toBeNull();

    store.isSyncing = false;
    store.pendingChangeCount = 0;
    await waitFor(() => expect(screen.queryByRole('button')).toBeNull());
  });
});
