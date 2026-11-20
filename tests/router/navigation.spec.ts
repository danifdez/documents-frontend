import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import router from '@/router';
import { useAuthStore, type AuthUser } from '@/store/authStore';
import { useFeatureStore } from '@/store/featureStore';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/services/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/api')>();
  return { ...original, default: api };
});

const account: AuthUser = {
  id: 18, username: 'reader', displayName: null, avatarPath: null, groupId: null, permissions: {},
};

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
  vi.resetAllMocks();
});

describe('Documents router', () => {
  it('initializes authentication once and redirects unauthenticated private routes to login', async () => {
    api.get.mockResolvedValue({ data: { authEnabled: true } });
    await router.push('/profile');
    expect(router.currentRoute.value.name).toBe('Login');
    expect(useAuthStore().initialized).toBe(true);
    await router.push('/quick-assistant');
    expect(router.currentRoute.value.name).toBe('QuickAssistant');
    expect(api.get).toHaveBeenCalledExactlyOnceWith('/auth/status');
  });

  it('checks administrator permissions for authenticated users', async () => {
    const auth = useAuthStore();
    auth.initialized = true;
    auth.authRequired = true;
    auth.accessToken = 'test-session';
    auth.user = account;

    await router.push('/admin/users');
    expect(router.currentRoute.value.path).toBe('/');

    auth.user = { ...account, permissions: { 'user-management': true } };
    await router.push('/admin/users');
    expect(router.currentRoute.value.name).toBe('UserManagement');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('honors backend feature flags and preserves the project on relationship redirects', async () => {
    api.get.mockResolvedValue({ data: { authEnabled: false, features: { datasets: false, relationships: true } } });

    await router.push('/datasets');
    expect(router.currentRoute.value.path).toBe('/');

    await router.push('/project/13/relationships');
    expect(router.currentRoute.value.fullPath).toBe('/relationships?tab=relationships&project=13');

    useFeatureStore().setBackendFeatures({ datasets: true });
    await router.push('/datasets/9');
    expect(router.currentRoute.value.name).toBe('Dataset');
    expect(router.currentRoute.value.params.id).toBe('9');

    await router.push('/entities');
    expect(router.currentRoute.value.name).toBe('Relationships');
  });
});
