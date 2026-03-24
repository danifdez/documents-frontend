import { test, expect } from './fixtures/electron-app';
import { NotesPage } from './pages';

test.describe('Notes', () => {
  test('notes page shows header and new note button', async ({ window }) => {
    const notes = new NotesPage(window);

    await notes.goto();
    await notes.expectVisible();
  });

  test('create a new note navigates to editor', async ({ window }) => {
    const notes = new NotesPage(window);

    await notes.goto();
    await expect(notes.newNoteButton).toBeVisible();
    await notes.createNote();
  });
});
