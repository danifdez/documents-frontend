import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerOfflineInterceptors, isServerReachable, setServerReachable } from '@/services/offline/offlineInterceptor';

const cache = vi.hoisted(() => ({ item: vi.fn(), items: vi.fn(), get: vi.fn(), set: vi.fn(), reachable: vi.fn() }));
vi.mock('@/services/offline/offlineDb', () => ({ getOfflineItem: cache.item, getAllOfflineItemsByWorkspace: cache.items }));
vi.mock('@/services/offline/urlCache', () => ({ getUrlCache: cache.get, setUrlCache: cache.set }));
vi.mock('@/services/workspaceScope', () => ({ getActiveWorkspaceId: () => 'local-archive', workspaceKey: (name: string) => 'archive:' + name }));
vi.mock('@/store/offlineStore', () => ({ useOfflineStore: () => ({ setBackendReachable: cache.reachable }) }));

const adapter = vi.fn<(config: InternalAxiosRequestConfig) => Promise<AxiosResponse>>();
const client = axios.create({ adapter, baseURL: 'https://archive.example' });
registerOfflineInterceptors(client);
const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({
  config, data, status, statusText: 'OK', headers: {},
});

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  cache.items.mockResolvedValue([]);
  setServerReachable(true);
});

afterEach(() => vi.restoreAllMocks());

describe('read-only requests during a server outage', () => {
  it('stays within the active workspace while returning structured project lists and the requested resource subfield', async () => {
    setServerReachable(false);
    const local = { id: 10, name: 'Local data' };
    const linked = { id: 11, name: 'Linked data', project: { id: 20 } };
    cache.items.mockResolvedValue([
      { entityType: 'doc', parentId: 20, data: local },
      { entityType: 'doc', parentId: 18, data: linked },
      { entityType: 'doc', parentId: 21, data: { id: 12 } },
      { entityType: 'resource', parentId: 20, data: { id: 13 } },
    ]);
    cache.item.mockResolvedValue({ data: { id: 91, content: 'Original notes', translatedContent: 'Notas traducidas' } });
    await expect(client.get('/docs/project/20')).resolves.toMatchObject({ data: [local, linked], statusText: 'OK (offline)' });
    await expect(client.get('/resources/91/translated-content')).resolves.toMatchObject({ data: { translatedContent: 'Notas traducidas' } });
    await expect(client.get('/resources/91')).resolves.toMatchObject({ data: { id: 91, content: 'Original notes' } });
    expect(cache.items).toHaveBeenCalledExactlyOnceWith('local-archive');
    expect(cache.item).toHaveBeenCalledWith('local-archive', 'resource', 91);
    expect(cache.get).not.toHaveBeenCalled();
    expect(adapter).not.toHaveBeenCalled();
  });

  it('returns the remembered auth status and known empty lists without attempting the backend', async () => {
    setServerReachable(false);
    localStorage.setItem('archive:authRequired', 'true');
    await expect(client.get('/auth/status')).resolves.toMatchObject({ data: { authEnabled: true, offlineEnabled: true } });
    await expect(client.get('/calendar-events/range')).resolves.toMatchObject({ data: [] });
    expect(cache.get).not.toHaveBeenCalled();
    expect(cache.items).not.toHaveBeenCalled();
    expect(adapter).not.toHaveBeenCalled();
  });

  it('marks a network failure offline, uses a URL cache entry, and falls back to an empty list on a cache miss', async () => {
    cache.get.mockReturnValueOnce([{ id: 18, name: 'Offline reference' }]);
    adapter.mockImplementation(async (config) => { throw new AxiosError('Unavailable', 'ECONNREFUSED', config); });
    await expect(client.get('/references')).resolves.toMatchObject({ data: [{ id: 18 }], statusText: 'OK (offline fallback)' });
    expect(cache.get).toHaveBeenLastCalledWith('local-archive', 'get', '/references');
    expect(isServerReachable()).toBe(false);
    await expect(client.get('/docs/99')).resolves.toMatchObject({ data: [], statusText: 'OK (offline)' });
    expect(cache.item).toHaveBeenCalledExactlyOnceWith('local-archive', 'doc', 99);
    expect(cache.get).toHaveBeenLastCalledWith('local-archive', 'get', '/docs/99');
    expect(adapter).toHaveBeenCalledTimes(1);
  });

  it('stores successful text responses and omits binary, no-cache, refresh and mutation responses', async () => {
    adapter.mockImplementation(async (config) => response(config, { id: 4, content: 'Content' }));
    await client.get('/docs/4');
    await client.get('/docs/4/export/pdf', { responseType: 'blob' });
    await client.get('/documents/download', { headers: { 'x-offline-skip-cache': '1' } });
    await client.get('/auth/refresh');
    await client.patch('/docs/4', { title: 'Edited' });

    expect(cache.set).toHaveBeenCalledExactlyOnceWith('local-archive', 'get', '/docs/4', { id: 4, content: 'Content' });
    expect(localStorage.getItem('_lastApiBaseUrl')).toBe('https://archive.example');
  });

  it('keeps explicit HTTP errors visible without marking the backend unreachable', async () => {
    adapter.mockImplementation(async (config) => {
      throw new AxiosError('Not found', 'ERR_BAD_REQUEST', config, undefined, response(config, {}, 404));
    });
    await expect(client.get('/docs/99')).rejects.toMatchObject({ response: { status: 404 } });
    expect(isServerReachable()).toBe(true);
    expect(cache.get).not.toHaveBeenCalled();
  });
});
