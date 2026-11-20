import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  io: vi.fn(),
  setServerReachable: vi.fn(),
  getAccessToken: vi.fn(),
  dispatchExecutionPublication: vi.fn(),
  isExecutionPublicationKnown: vi.fn(),
}));
vi.mock('socket.io-client', () => ({ io: dependencies.io }));
vi.mock('@/services/apiBase', () => ({ getApiBaseUrl: () => 'http://workspace.example' }));
vi.mock('@/services/workspaceScope', () => ({ getAccessToken: dependencies.getAccessToken }));
vi.mock('@/services/offline/offlineInterceptor', () => ({ setServerReachable: dependencies.setServerReachable }));
vi.mock('@/services/notifications/executionPublication', () => dependencies);

function makeSocket() {
  type Listener = (...args: unknown[]) => void;
  const handlers = new Map<string, Set<Listener>>();
  const socket = {
    connected: false,
    auth: {},
    connect: vi.fn(() => { socket.connected = true; }),
    disconnect: vi.fn(() => { socket.connected = false; }),
    on: vi.fn((event: string, callback: Listener) => {
      const listeners = handlers.get(event) ?? new Set();
      listeners.add(callback);
      handlers.set(event, listeners);
    }),
    off: vi.fn((event: string, callback: Listener) => handlers.get(event)?.delete(callback)),
    receive(event: string, ...args: unknown[]) {
      handlers.get(event)?.forEach((callback) => callback(...args));
    },
  };
  dependencies.io.mockReturnValueOnce(socket);
  return socket;
}

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  dependencies.getAccessToken.mockReturnValue('first-token');
});

afterEach(() => vi.restoreAllMocks());

describe('workspace notification socket', () => {
  it('preserves subscriptions and refreshes credentials when the workspace changes', async () => {
    const first = makeSocket();
    const second = makeSocket();
    const notification = await import('@/services/notifications/notification');
    const listener = vi.fn();
    const unsubscribe = notification.onSocketEvent('calendar:alarm', listener);

    expect(notification.getSocket()).toBe(first);
    expect(first.connect).not.toHaveBeenCalled();
    expect(dependencies.io).toHaveBeenCalledWith('http://workspace.example', expect.objectContaining({
      autoConnect: false, reconnection: true, auth: { token: 'first-token' },
    }));
    dependencies.getAccessToken.mockReturnValue('updated-token');
    notification.connectSocket();
    notification.connectSocket();
    expect(first.auth).toEqual({ token: 'updated-token' });
    expect(first.connect).toHaveBeenCalledTimes(1);
    first.receive('calendar:alarm', { id: 1 });

    notification.reconnectSocket('http://other-workspace.example');
    expect(first.disconnect).toHaveBeenCalledOnce();
    expect(second.connect).toHaveBeenCalledOnce();
    expect(dependencies.io).toHaveBeenLastCalledWith('http://other-workspace.example', expect.objectContaining({
      auth: { token: 'updated-token' },
    }));
    const lastListener = vi.fn();
    const unsubscribeLast = notification.onSocketEvent('calendar:alarm', lastListener);
    second.receive('calendar:alarm', { id: 2 });
    unsubscribe();
    second.receive('calendar:alarm', { id: 3 });
    unsubscribeLast();
    second.receive('calendar:alarm', { id: 4 });

    expect(listener.mock.calls).toEqual([[{ id: 1 }], [{ id: 2 }]]);
    expect(lastListener.mock.calls).toEqual([[{ id: 2 }], [{ id: 3 }]]);
  });

  it('acknowledges new or already processed publications and resets warning suppression after reconnecting', async () => {
    const socket = makeSocket();
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const notification = await import('@/services/notifications/notification');
    notification.connectSocket();
    socket.receive('connect_error');
    socket.receive('connect_error');
    expect(warning).toHaveBeenCalledTimes(1);
    socket.receive('connect');
    expect(dependencies.setServerReachable).toHaveBeenCalledWith(true);
    socket.receive('connect_error');
    expect(warning).toHaveBeenCalledTimes(2);

    const publication = { outboxId: 'publication-14' };
    const acknowledge = vi.fn();
    dependencies.dispatchExecutionPublication.mockReturnValueOnce(true);
    socket.receive('execution:publication', publication, acknowledge);
    expect(dependencies.isExecutionPublicationKnown).not.toHaveBeenCalled();
    dependencies.isExecutionPublicationKnown.mockReturnValueOnce(true).mockReturnValueOnce(false);
    socket.receive('execution:publication', publication, acknowledge);
    socket.receive('execution:publication', publication, acknowledge);
    socket.receive('execution:publication', publication);
    expect(dependencies.isExecutionPublicationKnown).toHaveBeenCalledWith('publication-14');
    expect(acknowledge.mock.calls).toEqual([[{ accepted: true }], [{ accepted: true }], [{ accepted: false }]]);
  });
});
