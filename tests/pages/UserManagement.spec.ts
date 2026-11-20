import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UserManagement from '@/pages/UserManagement.vue';
import type { PermissionGroup } from '@/services/permission-groups/usePermissionGroups';
import type { User } from '@/services/users/useUsers';

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/services/api', () => ({ default: api }));

const archivists: PermissionGroup = { id: 10, name: 'Archivists', description: 'Catalog maintenance', permissions: { write: true, delete: false } };
const observers: PermissionGroup = { id: 20, name: 'Observers', description: null, permissions: {} };
const users: User[] = [
  { id: 1, username: 'avoss', displayName: 'Avery Voss', groupId: 10, active: true, permissions: { write: true } },
  { id: 2, username: 'rreed', displayName: null, groupId: null, active: false, permissions: {} },
  { id: 3, username: 'old-account', displayName: null, groupId: 99, active: false, permissions: { export: true, projects: true } },
];

const button = (name: string) => screen.getByRole('button', { name });
const userRow = (username: string) => within(screen.getByRole('row', { name: new RegExp(username) }));
const groupCard = (name: string) => within(screen.getByRole('heading', { name }).parentElement!.parentElement!.parentElement!);
const form = (heading: string) => within(screen.getByRole('heading', { name: heading, level: 2 }).parentElement!);
const update = (control: HTMLElement, value: string) => fireEvent.update(control, value);

async function openUsers() {
  render(UserManagement);
  await screen.findByRole('cell', { name: 'avoss' });
}

async function openGroups() {
  await openUsers();
  await fireEvent.click(button('Groups'));
}

beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockImplementation(async (url: string) => {
    if (url === '/users') return { data: structuredClone(users) };
    if (url === '/groups') return { data: structuredClone([archivists, observers]) };
    throw new Error(`Unexpected GET ${url}`);
  });
  api.post.mockResolvedValue({ data: {} });
  api.patch.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({ data: {} });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('user and group administration', () => {
  it('lists active and inactive users, group membership, and effective permissions', async () => {
    await openUsers();
    expect(userRow('avoss').getByRole('cell', { name: 'Archivists' })).toBeTruthy();
    expect(userRow('avoss').getByText('Active')).toBeTruthy();
    expect(userRow('avoss').getByRole('cell', { name: 'write' })).toBeTruthy();
    expect(userRow('rreed').getAllByRole('cell', { name: '-' })).toHaveLength(2);
    expect(userRow('rreed').getByText('Inactive')).toBeTruthy();
    expect(userRow('rreed').getByRole('cell', { name: 'None' })).toBeTruthy();
    expect(userRow('old-account').getByRole('cell', { name: 'export, projects' })).toBeTruthy();
  });

  it('creates a user with explicit permissions when no group is assigned', async () => {
    await openUsers();
    await fireEvent.click(button('Create User'));
    const dialog = form('Create User');
    await update(dialog.getByLabelText('Username'), 'new-researcher');
    await update(dialog.getByLabelText('Password'), 'example-password');
    await update(dialog.getByLabelText('Display Name'), 'New researcher');
    await fireEvent.click(dialog.getByRole('checkbox', { name: 'documents' }));
    await fireEvent.click(dialog.getByRole('button', { name: 'Create User' }));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/users', expect.objectContaining({
      username: 'new-researcher', password: 'example-password', displayName: 'New researcher', groupId: null,
      permissions: expect.objectContaining({ documents: true, delete: false }),
    }));
    await waitFor(() => expect(api.get.mock.calls.filter(([url]) => url === '/users')).toHaveLength(2));
  });

  it('edits a user without a password change and delegates permissions to the selected group', async () => {
    await openUsers();
    await fireEvent.click(userRow('rreed').getByRole('button', { name: 'Edit' }));
    const dialog = form('Edit User');
    expect(dialog.queryByLabelText('Username')).toBeNull();
    await update(dialog.getByLabelText('Group'), '10');
    expect(dialog.getByText(/Permissions are managed by the group.*write/)).toBeTruthy();
    expect(dialog.queryByRole('checkbox', { name: 'write' })).toBeNull();
    await update(dialog.getByLabelText('Display Name'), 'Robin Reed');
    await fireEvent.click(dialog.getByRole('button', { name: 'Save Changes' }));
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/users/2', { displayName: 'Robin Reed', groupId: 10 });
  });

  it('shows the server error and clears the form when the failed creation is canceled', async () => {
    await openUsers();
    api.post.mockRejectedValueOnce({ response: { data: { message: 'Username already exists' } } });
    await fireEvent.click(button('Create User'));
    const dialog = form('Create User');
    await update(dialog.getByLabelText('Username'), 'avoss');
    await update(dialog.getByLabelText('Password'), 'example-password');
    await fireEvent.click(dialog.getByRole('button', { name: 'Create User' }));
    expect(await dialog.findByText('Username already exists')).toBeTruthy();
    await fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    await fireEvent.click(button('Create User'));
    expect((form('Create User').getByLabelText('Username') as HTMLInputElement).value).toBe('');
    expect(screen.queryByText('Username already exists')).toBeNull();
  });

  it('deactivates and reactivates users through their row actions', async () => {
    await openUsers();
    await fireEvent.click(userRow('avoss').getByRole('button', { name: 'Deactivate' }));
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/users/1');
    await fireEvent.click(userRow('rreed').getByRole('button', { name: 'Activate' }));
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/users/2', { active: true });
  });

  it('creates and edits a group, showing how many existing users an edit affects', async () => {
    await openGroups();
    expect(groupCard('Archivists').getByText('Catalog maintenance')).toBeTruthy();
    expect(groupCard('Archivists').getByText('1 user')).toBeTruthy();
    expect(groupCard('Observers').getByText('No permissions')).toBeTruthy();
    expect(groupCard('Observers').getByText('0 users')).toBeTruthy();
    await fireEvent.click(button('Create Group'));
    const create = form('Create Group');
    await update(create.getByLabelText('Name'), 'Reviewers');
    await update(create.getByLabelText('Description'), 'Reviews excerpts');
    await fireEvent.click(create.getByRole('checkbox', { name: 'documents' }));
    await fireEvent.click(create.getByRole('button', { name: 'Create Group' }));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/groups', expect.objectContaining({
      name: 'Reviewers', description: 'Reviews excerpts',
      permissions: expect.objectContaining({ documents: true, write: false }),
    }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Create Group' })).toBeNull());

    await screen.findByRole('heading', { name: 'Archivists' });
    await fireEvent.click(groupCard('Archivists').getByRole('button', { name: 'Edit' }));
    const edit = form('Edit Group');
    expect(edit.getByText(/apply to all 1 user in this group/)).toBeTruthy();
    expect((edit.getByRole('checkbox', { name: 'write' }) as HTMLInputElement).checked).toBe(true);
    await fireEvent.click(edit.getByRole('checkbox', { name: 'write' }));
    await fireEvent.click(edit.getByRole('button', { name: 'Save Changes' }));
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/groups/10', expect.objectContaining({
      name: 'Archivists', permissions: expect.objectContaining({ write: false }),
    }));
  });

  it('refreshes the group and user lists after a group is deleted', async () => {
    await openGroups();
    api.get.mockImplementation(async (url: string) => ({ data: url === '/groups' ? [] : users }));
    await fireEvent.click(groupCard('Observers').getByRole('button', { name: 'Delete' }));
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/groups/20');
    expect(await screen.findByText(/No groups created yet/)).toBeTruthy();
    expect(api.get.mock.calls.filter(([url]) => url === '/users')).toHaveLength(2);
    expect(api.get.mock.calls.filter(([url]) => url === '/groups')).toHaveLength(2);
  });

  it('uses a fallback error and keeps a failed group draft editable', async () => {
    await openGroups();
    api.post.mockRejectedValueOnce({});
    await fireEvent.click(button('Create Group'));
    const dialog = form('Create Group');
    await update(dialog.getByLabelText('Name'), 'Draft');
    await fireEvent.click(dialog.getByRole('button', { name: 'Create Group' }));
    expect(await dialog.findByText('Operation failed')).toBeTruthy();
    expect((dialog.getByLabelText('Name') as HTMLInputElement).value).toBe('Draft');
  });
});
