import { test, expect } from './fixtures/electron-app';
import { TEST_API_URL } from './fixtures/helpers';
import { EntitiesPage } from './pages';

test.describe('Entities', () => {
  const entityTypeName = 'E2E Person';

  test.beforeAll(async ({ request }) => {
    const url = `${TEST_API_URL}/entity-types`;
    const existing = await request.get(url);
    await expect(existing).toBeOK();
    const types: Array<{ name: string }> = await existing.json();
    if (types.some(({ name }) => name === entityTypeName)) return;

    const response = await request.post(url, { data: { name: entityTypeName } });
    await expect(response).toBeOK();
  });

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
    await entities.createEntity('Albert Einstein', entityTypeName, 'Theoretical physicist');
  });

  test('search entities by name', async ({ window }) => {
    const entities = new EntitiesPage(window);

    await entities.goto();
    await entities.createEntity('Katherine Johnson', entityTypeName);
    await entities.createEntity('Marie Curie', entityTypeName);

    await entities.search('Johnson');
    await expect(entities.entityRow('Katherine Johnson')).toBeVisible();
    await expect(entities.entityRow('Marie Curie')).toBeHidden();

    await entities.search('');
    await expect(entities.entityRow('Katherine Johnson')).toBeVisible();
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
