import { test, expect } from './fixtures/electron-app';
import { BibliographyPage } from './pages';

test.describe('Bibliography', () => {
  test('bibliography page loads with empty state', async ({ window }) => {
    const bibliography = new BibliographyPage(window);

    await bibliography.goto();
    await bibliography.expectVisible();
    await expect(bibliography.emptyState).toBeVisible();
  });

  test('search input is visible', async ({ window }) => {
    const bibliography = new BibliographyPage(window);

    await bibliography.goto();
    await expect(bibliography.searchInput).toBeVisible();
  });

  test('add button is visible', async ({ window }) => {
    const bibliography = new BibliographyPage(window);

    await bibliography.goto();
    await expect(bibliography.addButton).toBeVisible();
  });
});
