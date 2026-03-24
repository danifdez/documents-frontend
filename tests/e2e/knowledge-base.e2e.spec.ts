import { test, expect } from './fixtures/electron-app';
import { KnowledgeBasePage, KnowledgeEntryPage } from './pages';

test.describe('Knowledge Base', () => {
  test('knowledge base page loads with empty state', async ({ window }) => {
    const kb = new KnowledgeBasePage(window);

    await kb.goto();
    await kb.expectVisible();
    await expect(kb.emptyState).toBeVisible();
  });

  test('create a new entry and navigate to editor', async ({ window }) => {
    const kb = new KnowledgeBasePage(window);
    const entry = new KnowledgeEntryPage(window);

    await kb.goto();
    await kb.createEntry();
    await entry.expectVisible();
    await expect(entry.summaryInput).toBeVisible();
  });

  test('edit entry title and summary', async ({ window }) => {
    const kb = new KnowledgeBasePage(window);
    const entry = new KnowledgeEntryPage(window);

    await kb.goto();
    await kb.createEntry();
    await entry.setTitle('Concepto de Relatividad');
    await entry.setSummary('Teoría fundamental de la física moderna');
    await entry.expectSaved();
  });

  test('add tags to an entry', async ({ window }) => {
    const kb = new KnowledgeBasePage(window);
    const entry = new KnowledgeEntryPage(window);

    await kb.goto();
    await kb.createEntry();
    await entry.addTag('física');
    await entry.addTag('ciencia');
  });

  test('navigate back to knowledge base list', async ({ window }) => {
    const kb = new KnowledgeBasePage(window);
    const entry = new KnowledgeEntryPage(window);

    await kb.goto();
    await kb.createEntry();
    await entry.setTitle('Entrada de Prueba');
    await entry.expectSaved();
    await entry.goBack();

    await expect(kb.entryCard('Entrada de Prueba')).toBeVisible({ timeout: 10_000 });
  });
});
