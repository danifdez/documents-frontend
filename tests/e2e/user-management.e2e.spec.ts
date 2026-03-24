import { test, expect } from './fixtures/electron-app';
import { UserManagementPage } from './pages';

test.describe('User Management', () => {
  // Note: /admin/users requires admin role. When auth is disabled, the page is accessible.

  test('user management page loads with table', async ({ window }) => {
    const users = new UserManagementPage(window);

    await users.goto();
    await users.expectVisible();
    await users.expectTable();
  });

  test('create user button is visible', async ({ window }) => {
    const users = new UserManagementPage(window);

    await users.goto();
    await expect(users.createUserButton).toBeVisible();
  });

  test('open create user modal', async ({ window }) => {
    const users = new UserManagementPage(window);

    await users.goto();
    await users.openCreateModal();
    await expect(users.modal).toBeVisible();
  });
});
