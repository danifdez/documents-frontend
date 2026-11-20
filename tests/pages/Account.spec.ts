import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { createPinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import Login from '@/pages/Login.vue';
import Profile from '@/pages/Profile.vue';
import { useAuthStore, type AuthUser } from '@/store/authStore';

const { api, reconnectSocket } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  reconnectSocket: vi.fn(),
}));
vi.mock('@/services/api', () => ({ default: api, setApiBaseUrl: vi.fn() }));
vi.mock('@/services/notifications/notification', () => ({ reconnectSocket }));

const user: AuthUser = {
  id: 17, username: 'reader', displayName: 'Library Reader', avatarPath: null,
  permissions: { search: true, 'user-management': false }, groupId: 8,
};
const update = (label: string, value: string) => fireEvent.update(screen.getByLabelText(label, { exact: true }), value);
function submit(buttonName: string) {
  const form = (screen.getByRole('button', { name: buttonName }) as HTMLButtonElement).form;
  expect(form).toBeTruthy();
  return fireEvent.submit(form!);
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  localStorage.setItem('activeWorkspaceId', 'library');
});

describe('login', () => {
  it('shows a failed sign-in, then saves the workspace session on retry and returns to the dashboard', async () => {
    const pinia = createPinia();
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div>Dashboard</div>' } }, { path: '/login', component: Login }],
    });
    await router.push('/login');
    api.post.mockRejectedValueOnce({ response: { data: { message: 'Incorrect password' } } })
      .mockResolvedValueOnce({ data: { accessToken: 'access-a', refreshToken: 'refresh-a', user } });
    render(Login, { global: { plugins: [pinia, router] } });

    await update('Username', 'reader');
    await update('Password', 'wrong');
    await submit('Sign in');
    expect(await screen.findByText('Incorrect password')).toBeTruthy();
    expect(router.currentRoute.value.path).toBe('/login');
    expect(localStorage.getItem('accessToken_library')).toBeNull();

    await update('Password', 'working-password');
    await submit('Sign in');
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/'));
    expect(api.post.mock.calls).toEqual([
      ['/auth/login', { username: 'reader', password: 'wrong' }],
      ['/auth/login', { username: 'reader', password: 'working-password' }],
    ]);
    expect(screen.queryByText('Incorrect password')).toBeNull();
    expect(localStorage.getItem('accessToken_library')).toBe('access-a');
    expect(localStorage.getItem('refreshToken_library')).toBe('refresh-a');
    expect(useAuthStore(pinia).user).toEqual(user);
    expect(reconnectSocket).toHaveBeenCalledOnce();
  });
});

describe('profile', () => {
  function openProfile() {
    const pinia = createPinia();
    api.get.mockImplementation(async (path) => {
      if (path === '/auth/me') return { data: user };
      if (path === '/groups/8') return { data: { name: 'Readers' } };
      throw new Error(`Unexpected GET ${path}`);
    });
    render(Profile, { global: { plugins: [pinia] } });
    return useAuthStore(pinia);
  }

  it('loads the profile and active permissions, saves a display name and shows a rejected update', async () => {
    const store = openProfile();
    expect(await screen.findByText('Readers')).toBeTruthy();
    expect(screen.getByText('reader')).toBeTruthy();
    expect(screen.getByText('search')).toBeTruthy();
    expect(screen.queryByText('user-management')).toBeNull();

    const changed = { ...user, displayName: 'Library Editor' };
    api.patch.mockResolvedValueOnce({ data: changed }).mockRejectedValueOnce(new Error('offline'));
    await fireEvent.update(screen.getByPlaceholderText('Your display name'), changed.displayName);
    await submit('Save');
    expect(await screen.findByText('Profile updated')).toBeTruthy();
    expect(api.patch).toHaveBeenCalledWith('/auth/me', { displayName: changed.displayName });
    expect(store.user).toEqual(changed);

    await fireEvent.update(screen.getByPlaceholderText('Your display name'), 'Not saved');
    await submit('Save');
    expect(await screen.findByText('Failed to update profile')).toBeTruthy();
    expect(store.user).toEqual(changed);
  });

  it('validates a new password before sending it and clears fields after a successful change', async () => {
    openProfile();
    await screen.findByText('Readers');
    await update('Current Password', 'old-password');
    await update('New Password', 'abc');
    await update('Confirm New Password', 'xyz');
    await submit('Change Password');
    expect(await screen.findByText('New passwords do not match')).toBeTruthy();

    await update('Confirm New Password', 'abc');
    await submit('Change Password');
    expect(await screen.findByText('Password must be at least 4 characters')).toBeTruthy();
    expect(api.patch).not.toHaveBeenCalled();

    api.patch.mockRejectedValueOnce({ response: { data: { message: 'Current password is wrong' } } })
      .mockResolvedValueOnce({ data: user });
    await update('New Password', 'new-password');
    await update('Confirm New Password', 'new-password');
    await submit('Change Password');
    expect(await screen.findByText('Current password is wrong')).toBeTruthy();
    await submit('Change Password');
    expect(await screen.findByText('Password changed successfully')).toBeTruthy();
    expect(api.patch).toHaveBeenLastCalledWith('/auth/me', {
      currentPassword: 'old-password', newPassword: 'new-password',
    });
    for (const label of ['Current Password', 'New Password', 'Confirm New Password']) {
      expect((screen.getByLabelText(label, { exact: true }) as HTMLInputElement).value).toBe('');
    }
  });

  it('uploads an avatar using multipart data and removes it only after a successful request', async () => {
    const store = openProfile();
    await screen.findByText('Readers');
    const file = new File(['image'], 'avatar.png', { type: 'image/png' });
    const input = screen.getByLabelText('Choose profile photo');
    await fireEvent.change(input, { target: { files: [] } });
    expect(api.post).not.toHaveBeenCalled();

    api.post.mockRejectedValueOnce({ response: { data: { message: 'Image too large' } } })
      .mockResolvedValueOnce({ data: { ...user, avatarPath: '/avatars/reader.png' } });
    await fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByText('Image too large')).toBeTruthy();
    await fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByText('Photo updated')).toBeTruthy();

    const [path, form, config] = api.post.mock.lastCall!;
    expect(path).toBe('/auth/me/avatar');
    expect(form.get('avatar')).toMatchObject({ name: 'avatar.png' });
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
    expect(store.user?.avatarPath).toBe('/avatars/reader.png');

    api.delete.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: {} });
    await fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }));
    expect(await screen.findByText('Failed to remove photo')).toBeTruthy();
    expect(store.user?.avatarPath).toBe('/avatars/reader.png');

    await fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }));
    expect(await screen.findByText('Photo removed')).toBeTruthy();
    expect(api.delete).toHaveBeenLastCalledWith('/auth/me/avatar');
    expect(store.user?.avatarPath).toBeNull();
    expect(screen.getByRole('button', { name: 'Upload photo' })).toBeTruthy();
  });
});
