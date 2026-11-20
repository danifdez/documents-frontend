import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  use: vi.fn(), mount: vi.fn(), warn: vi.fn(), setReachable: vi.fn(), preload: vi.fn(),
  config: {} as { errorHandler?: (error: unknown, instance: unknown, info: string) => void },
  router: { name: 'router' }, toast: { name: 'toast' }, pinia: { name: 'pinia' },
}));
vi.mock('vue', async (original) => ({ ...(await original<typeof import('vue')>()), createApp: () => ({
  use: state.use, mount: state.mount, config: state.config,
}) }));
vi.mock('@/App.vue', () => ({ default: { template: '<main />' } }));
vi.mock('@/router', () => ({ default: state.router }));
vi.mock('@/plugins/toast', () => ({ default: state.toast }));
vi.mock('@/plugins/pinia', () => ({ default: state.pinia }));
vi.mock('@/services/offline/offlineInterceptor', () => ({ setServerReachable: state.setReachable }));
vi.mock('@/services/voice/preloadLocalEngine', () => ({ preloadLocalEngineIfNeeded: state.preload }));

function rejection(reason: unknown) {
  const event = new Event('unhandledrejection', { cancelable: true });
  return Object.assign(event, { reason });
}

describe('renderer startup and network error handling', () => {
  it('installs app plugins before mounting and only treats request failures without a response as offline', async () => {
    const listen = vi.spyOn(window, 'addEventListener');
    const warn = vi.spyOn(console, 'warn').mockImplementation(state.warn);
    try {
      await import('@/renderer');
      expect(state.use.mock.calls).toEqual([[state.router], [state.toast], [state.pinia]]);
      expect(state.use).toHaveBeenCalledBefore(state.mount);
      expect(state.mount).toHaveBeenCalledExactlyOnceWith('#app');
      await vi.waitFor(() => expect(state.preload).toHaveBeenCalledOnce());

      const failure = new Error('Component failed');
      state.config.errorHandler?.(failure, null, 'render');
      expect(warn).toHaveBeenCalledWith('[vue:error]', 'render', failure);
      for (const reason of [null, new Error('Unrelated error'), { isAxiosError: true, response: { status: 404 } }]) {
        const event = rejection(reason);
        window.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(false);
      }
      expect(state.setReachable).not.toHaveBeenCalled();

      for (const reason of [{ isAxiosError: true }, { config: { url: '/docs/3' } }]) {
        const event = rejection(reason);
        window.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
      }
      expect(state.setReachable.mock.calls).toEqual([[false], [false]]);
    } finally {
      const installed = listen.mock.calls.find(([type]) => type === 'unhandledrejection');
      if (installed) window.removeEventListener('unhandledrejection', installed[1]);
      listen.mockRestore();
      warn.mockRestore();
    }
  });
});
