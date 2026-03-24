import { test, expect } from './fixtures/electron-app';
import { EntitiesPage } from './pages';

test.describe('Entities', () => {
  test('entities page loads with empty state', async ({ window }) => {
    const entities = new EntitiesPage(window);

    await entities.goto();
    await entities.expectVisible();
    await expect(entities.emptyState).toBeVisible();
  });

  test('open create entity modal', async ({ window }) => {
    const entities = new EntitiesPage(window);

    await entities.goto();
    await entities.openCreateModal();
    await expect(entities.nameInput).toBeVisible();
    await expect(entities.typeSelect).toBeVisible();
    await expect(entities.descriptionInput).toBeVisible();
    await expect(entities.createButton).toBeVisible();
    await expect(entities.cancelButton).toBeVisible();
  });

  test('create a new entity', async ({ window }) => {
    const entities = new EntitiesPage(window);

    await entities.goto();
    await entities.createEntity('Albert Einstein', { description: 'Theoretical physicist' });
  });

  test('search entities by name', async ({ window }) => {
    const entities = new EntitiesPage(window);

    await entities.goto();
    await entities.createEntity('Marie Curie');

    await entities.search('Einstein');
    await expect(entities.entityRow('Albert Einstein')).toBeVisible();
    await expect(entities.entityRow('Marie Curie')).toBeHidden();

    await entities.search('');
    await expect(entities.entityRow('Albert Einstein')).toBeVisible();
    await expect(entities.entityRow('Marie Curie')).toBeVisible();
  });

  test('cancel create entity modal', async ({ window }) => {
    const entities = new EntitiesPage(window);

    await entities.goto();
    await entities.openCreateModal();
    await entities.nameInput.fill('Should Not Exist');
    await entities.cancelButton.click();

    await expect(entities.createModal).toBeHidden({ timeout: 5_000 });
    await expect(entities.entityRow('Should Not Exist')).toBeHidden();
  });
});
