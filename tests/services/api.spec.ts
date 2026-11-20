import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requestUse: vi.fn(),
  responseUse: vi.fn(),
  registerOfflineInterceptors: vi.fn(),
  setServerReachable: vi.fn(),
  client: Object.assign(vi.fn(), {
    defaults: { baseURL: '' },
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    post: vi.fn(),
  }),
}));

mocks.client.interceptors.request.use = mocks.requestUse;
mocks.client.interceptors.response.use = mocks.responseUse;

vi.mock('axios', () => ({
  default: { create: vi.fn(() => mocks.client) },
}));

vi.mock('@/services/offline/offlineInterceptor', () => ({
  registerOfflineInterceptors: mocks.registerOfflineInterceptors,
  setServerReachable: mocks.setServerReachable,
}));

describe('API connection scope', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    mocks.requestUse.mockClear();
    mocks.responseUse.mockClear();
    mocks.client.mockReset();
    mocks.client.post.mockReset();
    mocks.setServerReachable.mockClear();
    window.location.hash = '';
  });

  afterEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it('attaches the connection-scoped token without sending workspace identity', async () => {
    localStorage.setItem('activeWorkspaceId', 'workspace-a');
    localStorage.setItem('accessToken_workspace-a', 'workspace-token');
    await import('@/services/api');
    const interceptor = mocks.requestUse.mock.calls[0][0];

    const config = interceptor({ headers: {} });

    expect(config.headers).toEqual({ Authorization: 'Bearer workspace-token' });
  });
  it('updates both the API client and the shared base URL on workspace switch', async () => {
    const { setApiBaseUrl } = await import('@/services/api');
    const { getApiBaseUrl } = await import('@/services/apiBase');

    setApiBaseUrl('http://archive.example');
    expect(mocks.client.defaults.baseURL).toBe('http://archive.example');
    expect(getApiBaseUrl()).toBe('http://archive.example');
    expect(mocks.setServerReachable).toHaveBeenCalledWith(true);
  });

  it('refreshes the credentials once and retries both pending workspace requests', async () => {
    localStorage.setItem('activeWorkspaceId', 'archive');
    localStorage.setItem('accessToken_archive', 'expired');
    localStorage.setItem('refreshToken_archive', 'previous-refresh');
    localStorage.setItem('accessToken_research', 'other-workspace');
    let completeRefresh!: (response: { data: { accessToken: string; refreshToken: string } }) => void;
    mocks.client.post.mockReturnValue(new Promise((resolve) => { completeRefresh = resolve; }));
    mocks.client.mockResolvedValue({ data: 'recovered' });
    await import('@/services/api');
    const handleError = mocks.responseUse.mock.calls[0][1];
    const documents = { url: '/docs', headers: {} };
    const resources = { url: '/resources', headers: {} };
    const first = handleError({ config: documents, response: { status: 401 } });
    const second = handleError({ config: resources, response: { status: 401 } });

    expect(mocks.client.post).toHaveBeenCalledExactlyOnceWith('/auth/refresh', { refreshToken: 'previous-refresh' });
    expect(mocks.client).not.toHaveBeenCalled();
    completeRefresh({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } });

    await expect(Promise.all([first, second])).resolves.toEqual([{ data: 'recovered' }, { data: 'recovered' }]);
    expect(mocks.client).toHaveBeenCalledTimes(2);
    expect(documents).toMatchObject({ headers: { Authorization: 'Bearer new-access' } });
    expect(resources).toMatchObject({ headers: { Authorization: 'Bearer new-access' } });
    expect(localStorage.getItem('accessToken_archive')).toBe('new-access');
    expect(localStorage.getItem('refreshToken_archive')).toBe('new-refresh');
    expect(localStorage.getItem('accessToken_research')).toBe('other-workspace');
  });

  it('rejects both queued requests and returns to login if the refresh is denied', async () => {
    localStorage.setItem('accessToken_default', 'expired');
    localStorage.setItem('refreshToken_default', 'denied');
    let denyRefresh!: (reason: unknown) => void;
    mocks.client.post.mockReturnValue(new Promise((_resolve, reject) => { denyRefresh = reject; }));
    await import('@/services/api');
    const handleError = mocks.responseUse.mock.calls[0][1];
    const jobs = Promise.allSettled(['/docs', '/resources'].map((url) =>
      handleError({ config: { url, headers: {} }, response: { status: 401 } })));
    const failure = new Error('Session expired');
    denyRefresh(failure);

    expect(await jobs).toEqual([
      { status: 'rejected', reason: failure }, { status: 'rejected', reason: failure },
    ]);
    expect(mocks.client).not.toHaveBeenCalled();
    expect(localStorage.getItem('accessToken_default')).toBeNull();
    expect(localStorage.getItem('refreshToken_default')).toBeNull();
    expect(window.location.hash).toBe('#/login');
  });

  it('bypasses refresh for an auth request or a retry and clears an unrenewable session', async () => {
    localStorage.setItem('accessToken_default', 'expired');
    await import('@/services/api');
    const [handleSuccess, handleError] = mocks.responseUse.mock.calls[0];
    const success = { data: ['available'] };
    expect(handleSuccess(success)).toBe(success);
    for (const config of [{ url: '/auth/login' }, { url: '/docs', _retry: true }]) {
      const responseError = { config, response: { status: 401 } };
      await expect(handleError(responseError)).rejects.toBe(responseError);
    }
    const unavailable = { config: { url: '/docs' }, response: { status: 503 } };
    await expect(handleError(unavailable)).rejects.toBe(unavailable);
    expect(window.location.hash).toBe('');

    const expired = { config: { url: '/docs' }, response: { status: 401 } };
    await expect(handleError(expired)).rejects.toBe(expired);
    expect(mocks.client.post).not.toHaveBeenCalled();
    expect(localStorage.getItem('accessToken_default')).toBeNull();
    expect(window.location.hash).toBe('#/login');
  });
});
