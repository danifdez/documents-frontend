import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios, { AxiosError, type AxiosInstance } from 'axios';
import { createPinia, setActivePinia } from 'pinia';
import { useOfflineStore } from '@/store/offlineStore';
import {
  registerOfflineInterceptors,
  setServerReachable,
} from '@/services/offline/offlineInterceptor';

const mocks = vi.hoisted(() => ({
  addPendingChange: vi.fn(),
  setBackendReachable: vi.fn(),
}));

vi.mock('@/services/api', () => ({ default: {} }));

vi.mock('@/services/offline/offlineDb', () => ({
  getOfflineItem: vi.fn(),
  getAllOfflineItemsByWorkspace: vi.fn(),
}));

vi.mock('@/services/offline/urlCache', () => ({
  getUrlCache: vi.fn(),
  setUrlCache: vi.fn(),
}));

describe.each(['already offline', 'network failure'] as const)(
  'Offline mutations: %s',
  (mode) => {
    let client: AxiosInstance;
    let networkError: AxiosError;

    beforeEach(() => {
      setActivePinia(createPinia());
      const store = useOfflineStore();
      vi.spyOn(store, 'addPendingChange').mockImplementation(mocks.addPendingChange);
      vi.spyOn(store, 'setBackendReachable').mockImplementation(mocks.setBackendReachable);
      mocks.addPendingChange.mockReset().mockResolvedValue(undefined);
      setServerReachable(mode === 'network failure');
      client = axios.create({
        adapter: async (config) => {
          networkError = new AxiosError('Network Error', 'ERR_NETWORK', config);
          throw networkError;
        },
        transformRequest: [(data) => data],
      });
      registerOfflineInterceptors(client);
    });

    it.each([
      ['object', { name: 'Updated', id: 99 }, { name: 'Updated', id: 99 }],
      ['JSON', '{"name":"Updated","id":99}', { name: 'Updated', id: 99 }],
      ['missing', undefined, {}],
    ])('queues a %s payload and returns the URL identity', async (_, data, payload) => {
      const response = await client.patch('/resources/42', data);

      expect(mocks.addPendingChange).toHaveBeenCalledExactlyOnceWith(
        'resource', 42, 'PATCH', payload,
      );
      expect(response).toMatchObject({
        status: 200,
        statusText: 'OK (queued offline)',
        data: { ...payload, id: 42 },
        config: { url: '/resources/42', method: 'patch' },
      });
    });

    it.each(['post', 'put', 'delete'])('preserves the %s method', async (method) => {
      await client.request({ url: '/docs/7', method, data: { title: 'Updated' } });

      expect(mocks.addPendingChange).toHaveBeenCalledExactlyOnceWith(
        'doc', 7, method.toUpperCase(), { title: 'Updated' },
      );
    });

    it('rejects invalid JSON without persisting a change', async () => {
      await expect(client.patch('/resources/42', '{invalid')).rejects.toBeInstanceOf(SyntaxError);
      expect(mocks.addPendingChange).not.toHaveBeenCalled();
    });

    it('propagates persistence failures unchanged', async () => {
      const failure = new Error('Persistence failed');
      mocks.addPendingChange.mockRejectedValueOnce(failure);

      await expect(client.patch('/resources/42', {})).rejects.toBe(failure);
    });

    it('waits for persistence before returning a response', async () => {
      let finishPersistence!: () => void;
      mocks.addPendingChange.mockReturnValueOnce(new Promise<void>((resolve) => {
        finishPersistence = resolve;
      }));
      const onResponse = vi.fn();
      const response = client.patch('/resources/42', {}).then(onResponse);

      await vi.waitFor(() => expect(mocks.addPendingChange).toHaveBeenCalledOnce());
      expect(onResponse).not.toHaveBeenCalled();
      finishPersistence();
      await response;
      expect(onResponse).toHaveBeenCalledOnce();
    });

    it('retains the branch-specific response for unknown URLs', async () => {
      const response = client.patch('/unknown/42', {});

      if (mode === 'already offline') {
        await expect(response).rejects.toMatchObject({ code: 'ERR_CANCELED' });
      } else {
        await expect(response).resolves.toMatchObject({
          status: 200,
          statusText: 'Service Unavailable (offline)',
          data: {},
        });
        expect(networkError.code).toBe('ERR_NETWORK');
      }
      expect(mocks.addPendingChange).not.toHaveBeenCalled();
    });
  },
);
