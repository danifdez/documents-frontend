import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requestUse: vi.fn(),
  responseUse: vi.fn(),
  registerOfflineInterceptors: vi.fn(),
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
}));

describe('API workspace scope', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    mocks.requestUse.mockClear();
    mocks.responseUse.mockClear();
  });

  it('attaches the active workspace and its scoped token to every request', async () => {
    localStorage.setItem('activeWorkspaceId', 'workspace-a');
    localStorage.setItem('accessToken_workspace-a', 'workspace-token');
    await import('@/services/api');
    const interceptor = mocks.requestUse.mock.calls[0][0];

    const config = interceptor({ headers: {} });

    expect(config.headers).toMatchObject({
      'X-Workspace-Id': 'workspace-a',
      Authorization: 'Bearer workspace-token',
    });
  });
});
