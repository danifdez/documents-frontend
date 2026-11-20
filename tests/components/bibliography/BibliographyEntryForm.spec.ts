import { fireEvent, render, screen } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import BibliographyEntryForm from '@/components/bibliography/BibliographyEntryForm.vue';
import type { BibliographyEntry } from '@/types/Bibliography';

const button = (name: string) => screen.getByRole('button', { name });

describe('bibliographic fields by entry type', () => {
  it.each([
    ['journalArticle', 'ISSN', 'Universidad'],
    ['magazineArticle', 'Publicación', 'ISBN'],
    ['newspaperArticle', 'Publicación', 'Título corto'],
    ['book', 'ISBN', 'ISSN'],
    ['bookSection', 'Título del libro', 'ISSN'],
    ['thesis', 'Universidad', 'Publicación'],
    ['report', 'Institución', 'Universidad'],
    ['webpage', 'Fecha de acceso', 'Volumen'],
    ['dataset', 'Editorial', 'ISBN'],
  ])('renders the expected fields for %s', async (type, shown, hidden) => {
    render(BibliographyEntryForm);
    await fireEvent.update(screen.getByLabelText('Tipo de elemento'), type);
    expect(screen.getByLabelText(shown)).toBeTruthy();
    expect(screen.queryByLabelText(hidden)).toBeNull();
  });

  it('preserves the source entry, supports an institutional author, and emits a scoped update', async () => {
    const entry = {
      id: 11, entryType: 'book', title: 'Archive directory', creators: [
        { creatorType: 'author', name: 'Local Archive' },
        { creatorType: 'editor', firstName: 'Toni', lastName: 'Hoffman' },
      ],
    } as BibliographyEntry;
    const save = vi.fn();
    const cancel = vi.fn();
    const view = render(BibliographyEntryForm, { props: { entry, projectId: 19, onSave: save, onCancel: cancel } });
    await fireEvent.click(screen.getAllByRole('button', { name: 'Remove creator' })[1]);
    expect(entry.creators).toHaveLength(2);
    await fireEvent.click(button('+ Trad.'));
    await fireEvent.update(screen.getAllByRole('textbox', { name: 'Last name' })[1], 'Jimenez');
    await fireEvent.update(screen.getAllByRole('textbox', { name: 'First name' })[1], 'Rosa');
    await fireEvent.click(button('Save changes'));
    expect(save).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      id: 11, title: 'Archive directory', projectId: 19, creators: [
        { creatorType: 'author', name: 'Local Archive' },
        { creatorType: 'translator', firstName: 'Rosa', lastName: 'Jimenez' },
      ],
    }));
    await view.rerender({ entry: null, projectId: null });
    expect((screen.getByLabelText('Tipo de elemento') as HTMLSelectElement).value).toBe('journalArticle');
    expect(screen.queryByRole('textbox', { name: 'Last name' })).toBeNull();
    await fireEvent.click(button('Cancel'));
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
