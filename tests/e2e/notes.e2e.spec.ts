import { test } from './fixtures/electron-app';
import { NotesPage } from './pages';

test.describe('Notes', () => {
  test('notes panel shows its header and new note button', async ({ window }) => {
    const notes = new NotesPage(window);

    await notes.open();
    await notes.expectVisible();
  });

  test('create a new note opens its editor', async ({ window }) => {
    const notes = new NotesPage(window);

    await notes.open();
    await notes.createNote();
  });
});
