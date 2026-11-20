import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import App from '@/App.vue';

const hooks = vi.hoisted(() => ({
  bindAlarms: vi.fn(), bindReminders: vi.fn(), connectSocket: vi.fn(), reconnectSocket: vi.fn(),
  subscribe: vi.fn(), info: vi.fn(), probe: vi.fn(), loadOffline: vi.fn(), startSync: vi.fn(), setApiBaseUrl: vi.fn(),
}));
vi.mock('@/services/api', () => ({ default: { get: vi.fn() }, setApiBaseUrl: hooks.setApiBaseUrl }));
vi.mock('@/services/notifications/notification', () => ({ connectSocket: hooks.connectSocket, reconnectSocket: hooks.reconnectSocket }));
vi.mock('@/services/notifications/executionPublication', () => ({ subscribeExecutionPublication: hooks.subscribe }));
vi.mock('@/services/calendar/useCalendarAlarms', () => ({ bindCalendarAlarms: hooks.bindAlarms }));
vi.mock('@/services/user-tasks/useTaskReminders', () => ({ bindTaskReminders: hooks.bindReminders }));
vi.mock('@/composables/useNotification', () => ({ useNotification: () => ({ info: hooks.info }) }));
vi.mock('@/store/offlineStore', () => ({
  useOfflineStore: () => ({ probeBackend: hooks.probe, loadOfflineState: hooks.loadOffline, startBackgroundSync: hooks.startSync }),
}));

const remote = { id: 'archive', type: 'remote', name: 'Archive', url: 'https://archive.example' };
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const shell = { template: '<main aria-label="Application shell"><slot /></main>' };
const calendarAlarms = { onNavigateToEvent: vi.fn(), onNavigateMissedPanel: vi.fn() };
const taskReminders = { onNavigateToTask: vi.fn(), onNavigateMissedTasksPanel: vi.fn() };

async function openApp(path: string, configured = true) {
  const bridge = {
    getWorkspaces: vi.fn().mockResolvedValue(configured ? [remote] : []),
    getActiveWorkspace: vi.fn().mockResolvedValue(configured ? remote : null),
    getDefaultWorkspace: vi.fn().mockResolvedValue(null),
    getSettings: vi.fn().mockResolvedValue({ theme: 'light' }),
    addWorkspace: vi.fn().mockResolvedValue(undefined),
    setActiveWorkspace: vi.fn().mockResolvedValue(undefined),
  };
  vi.stubGlobal('electronAPI', bridge);
  vi.stubGlobal('calendarAlarms', calendarAlarms);
  vi.stubGlobal('taskReminders', taskReminders);
  const pages = [
    ['/', 'Projects', 'Projects page'], ['/login', 'Login', 'Sign in page'],
    ['/quick-assistant', 'QuickAssistant', 'Quick Assistant page'], ['/resource/:id', 'Resource', 'Resource page'],
    ['/calendar', 'Calendar', 'Calendar page'], ['/calendar/missed', 'Missed', 'Missed calendar events'],
  ];
  const router = createRouter({
    history: createMemoryHistory(),
    routes: pages.map(([path, name, label]) => ({ path, name, component: { template: `<h1>${label}</h1>` } })),
  });
  await router.push(path);
  render(App, { global: { plugins: [router, createPinia()], stubs: {
    MainLayout: shell,
    GlobalSearchModal: { props: ['show'], template: '<div v-if="show">Global search is open</div>' },
    SelectionLookup: true, OfflineBanner: true, FavoritesPanel: true, AssistantModal: true,
    TaskPanel: { props: ['modelValue'], template: '<div v-if="modelValue">Task panel is open</div>' },
    StandaloneSetup: {
      emits: ['use-server', 'back', 'done'],
      template: '<div><button @click="$emit(\'back\')">Go back</button><button @click="$emit(\'use-server\')">Use a server</button><button @click="$emit(\'done\')">Finish standalone</button></div>',
    },
    WorkspaceModal: {
      emits: ['save', 'close'],
      template: '<div><button @click="$emit(\'close\')">Cancel workspace</button><button @click="$emit(\'save\', { name: \'Archive\', url: \'https://archive.example\' })">Save workspace</button></div>',
    },
  } } });
  return { bridge, router };
}

beforeEach(() => {
  vi.resetAllMocks();
  hooks.subscribe.mockReturnValue(vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.classList.remove('dark');
});

describe('application startup', () => {
  it('loads workspaces and a socket for the quick assistant without running background jobs', async () => {
    const { bridge } = await openApp('/quick-assistant');
    expect(await screen.findByRole('heading', { name: 'Quick Assistant page' })).toBeTruthy();
    await waitFor(() => expect(hooks.connectSocket).toHaveBeenCalledTimes(1));
    expect(bridge.getWorkspaces).toHaveBeenCalledTimes(1);
    expect(hooks.probe).not.toHaveBeenCalled();
    expect(hooks.bindAlarms).not.toHaveBeenCalled();
    expect(hooks.bindReminders).not.toHaveBeenCalled();
    expect(screen.queryByRole('main', { name: 'Application shell' })).toBeNull();
  });

  it('registers reminders and resource notifications after probing the configured server', async () => {
    const { router } = await openApp('/');
    expect(await screen.findByRole('main', { name: 'Application shell' })).toBeTruthy();
    await waitFor(() => expect(hooks.bindReminders).toHaveBeenCalledTimes(1));
    expect(hooks.probe).toHaveBeenCalledBefore(hooks.loadOffline);
    expect(hooks.loadOffline).toHaveBeenCalledBefore(hooks.startSync);
    expect(hooks.startSync).toHaveBeenCalledBefore(hooks.connectSocket);
    expect(hooks.bindAlarms).toHaveBeenCalledTimes(1);

    expect(hooks.subscribe.mock.calls[0][0]).toBe('notification');
    const receive = hooks.subscribe.mock.calls[0][1];
    receive({ message: 'Operation finished' });
    expect(hooks.info).not.toHaveBeenCalled();
    receive({ resourceId: 31 });
    expect(hooks.info).toHaveBeenCalledWith('Resource extracted', { link: {
      url: '/resource/31', text: 'View resource', onClick: expect.any(Function),
    } });
    hooks.info.mock.calls[0][1].link.onClick();
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/resource/31'));

    calendarAlarms.onNavigateToEvent.mock.calls[0][0](9);
    await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/calendar?eventId=9'));
    calendarAlarms.onNavigateMissedPanel.mock.calls[0][0]();
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/calendar/missed'));
    taskReminders.onNavigateToTask.mock.calls[0][0]();
    expect(await screen.findByText('Task panel is open')).toBeTruthy();

    await fireEvent.keyDown(window, { key: 'F', ctrlKey: true, shiftKey: true });
    expect(screen.getByText('Global search is open')).toBeTruthy();
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Global search is open')).toBeNull();
  });

  it('puts the login route outside the application shell', async () => {
    await openApp('/login');
    expect(await screen.findByRole('heading', { name: 'Sign in page' })).toBeTruthy();
    expect(screen.queryByRole('main', { name: 'Application shell' })).toBeNull();
  });

  it('returns from the installer and connects the first remote workspace', async () => {
    const { bridge } = await openApp('/', false);
    await fireEvent.click(await screen.findByRole('button', { name: /Standalone/ }));
    await fireEvent.click(button('Go back'));
    await fireEvent.click(button(/Connect to server/));
    await fireEvent.click(button('Cancel workspace'));
    await fireEvent.click(button(/Standalone/));
    await fireEvent.click(button('Use a server'));
    await fireEvent.click(button('Save workspace'));

    await waitFor(() => expect(hooks.connectSocket).toHaveBeenCalledTimes(1));
    const [workspace] = bridge.addWorkspace.mock.calls[0];
    expect(workspace).toMatchObject({ name: remote.name, url: remote.url, type: 'remote' });
    expect(bridge.setActiveWorkspace).toHaveBeenCalledExactlyOnceWith(workspace.id);
    expect(hooks.reconnectSocket).toHaveBeenCalledExactlyOnceWith(remote.url);
    expect(await screen.findByRole('heading', { name: 'Projects page' })).toBeTruthy();
  });
});
