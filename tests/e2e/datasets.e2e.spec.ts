import { test, expect } from './fixtures/electron-app';
import { DatasetsPage } from './pages';

test.describe('Datasets', () => {
  test('datasets page loads with empty state', async ({ window }) => {
    const datasets = new DatasetsPage(window);

    await datasets.goto();
    await datasets.expectVisible();
    await expect(datasets.emptyState).toBeVisible();
  });

  test('open create dataset modal', async ({ window }) => {
    const datasets = new DatasetsPage(window);

    await datasets.goto();
    await datasets.openCreateModal();

    await expect(datasets.nameInput).toBeVisible();
    await expect(datasets.descriptionInput).toBeVisible();
    await expect(datasets.createButton).toBeVisible();
    await expect(datasets.cancelButton).toBeVisible();
  });

  test('cancel create dataset modal', async ({ window }) => {
    const datasets = new DatasetsPage(window);

    await datasets.goto();
    await datasets.openCreateModal();
    await datasets.nameInput.fill('Should Not Exist');
    await datasets.cancelButton.click();

    await expect(datasets.createModal).toBeHidden({ timeout: 5_000 });
    await expect(datasets.emptyState).toBeVisible();
  });

  test('import file button is visible', async ({ window }) => {
    const datasets = new DatasetsPage(window);

    await datasets.goto();
    await expect(datasets.importFileButton).toBeVisible();
  });
});
