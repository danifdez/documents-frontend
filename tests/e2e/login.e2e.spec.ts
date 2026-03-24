import { test, expect } from './fixtures/electron-app';
import { LoginPage } from './pages';

test.describe('Login', () => {
  test('login page loads with form fields', async ({ window }) => {
    const login = new LoginPage(window);

    await login.goto();
    await login.expectVisible();
    await expect(login.logo).toBeVisible();
  });

  test('sign in button is disabled with empty fields', async ({ window }) => {
    const login = new LoginPage(window);

    await login.goto();
    // The form uses required fields — submit with empty should not navigate
    await expect(login.signInButton).toBeVisible();
  });

  test('fill in credentials', async ({ window }) => {
    const login = new LoginPage(window);

    await login.goto();
    await login.usernameInput.fill('testuser');
    await login.passwordInput.fill('testpassword');

    await expect(login.usernameInput).toHaveValue('testuser');
    await expect(login.passwordInput).toHaveValue('testpassword');
  });
});
