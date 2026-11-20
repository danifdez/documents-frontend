import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NotesPanel from '@/components/notes/NotesPanel.vue';
import { useProjectStore } from '@/store/projectStore';
import type { Note } from '@/types/Note';
import type { Project } from '@/types/Project';

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/services/api', () => ({ default: api }));

const archive: Project = { id: 7, name: 'Archives', status: 'active', description: null, createdAt: '', updatedAt: '' };
const inventory: Project = { ...archive, id: 8, name: 'Inventory' };
const older: Note = {
  id: 10, title: 'Café field notes', content: '<p>Survey material</p>', project: archive,
  createdAt: '2025-09-01T12:00:00Z', updatedAt: '2025-09-01T12:00:00Z',
};
const recent: Note = { ...older, id: 11, title: 'Transcription', content: '<p>Référence to the interview.</p>', updatedAt: '2025-09-03T15:00:00Z' };
const outside: Note = { ...older, id: 12, title: 'Stock check', content: '<p>On loan</p>', project: inventory };
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const findNote = (name: string) => screen.findByRole('button', { name: new RegExp(name) });
const title = () => screen.getByRole('textbox', { name: 'Note title' }) as HTMLInputElement;
let records: Note[];

async function openPanel(project: Project | null = archive, initialNoteId?: number) {
  const pinia = createPinia();
  useProjectStore(pinia).setCurrentProject(project);
  const view = render(NotesPanel, {
    props: { modelValue: false, initialNoteId, quickCreate: 0 },
    global: { plugins: [pinia] },
  });
  await view.rerender({ modelValue: true });
  await findNote(older.title);
  return view;
}

beforeEach(() => {
  vi.resetAllMocks();
  records = [older, recent, outside];
  api.get.mockImplementation(async (path: string) => {
    if (path === '/projects') return { data: [archive, inventory] };
    if (path === '/notes') return { data: records };
    if (path === '/notes/project/7') return { data: records.filter((note) => note.project?.id === 7) };
    const id = Number(path.match(/^\/notes\/(\d+)$/)?.[1]);
    const note = records.find((item) => item.id === id);
    if (note) return { data: { ...note } };
    throw new Error(`Unexpected GET ${path}`);
  });
  api.post.mockImplementation(async (_path: string, payload: { title: string; projectId?: number }) => {
    const created: Note = {
      ...older, id: 13, title: payload.title, content: null, project: payload.projectId === 7 ? archive : null,
    };
    records = [...records, created];
    return { data: created };
  });
  api.patch.mockResolvedValue({ data: {} });
  api.delete.mockImplementation(async (path: string) => {
    records = records.filter((note) => path !== `/notes/${note.id}`);
    return { data: {} };
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('research notes panel', () => {
  it('lists current project notes newest first and searches title and content without accents', async () => {
    await openPanel();
    expect(api.get).toHaveBeenCalledWith('/notes/project/7');
    const sorted = screen.getAllByRole('button', { name: /Café field notes|Transcription/ });
    expect(sorted.map((item) => item.textContent)).toEqual([expect.stringContaining(recent.title), expect.stringContaining(older.title)]);
    expect(screen.queryByText(outside.title)).toBeNull();
    const search = screen.getByRole('textbox', { name: 'Search notes' });
    await fireEvent.update(search, 'CAFE');
    expect(screen.getByText(older.title)).toBeTruthy();
    expect(screen.queryByText(recent.title)).toBeNull();
    await fireEvent.update(search, 'reference');
    expect(screen.getByText(recent.title)).toBeTruthy();
    expect(screen.queryByText(older.title)).toBeNull();
    await fireEvent.update(search, 'missing');
    expect(screen.getByText('No matching notes')).toBeTruthy();
  });

  it('opens a specified note outside the active project by its identifier', async () => {
    await openPanel(archive, 12);
    expect(await screen.findByText('On loan')).toBeTruthy();
    expect(title().value).toBe(outside.title);
    expect(api.get).toHaveBeenCalledWith('/notes/12');
    expect(screen.queryByRole('button', { name: /Stock check/ })).toBeNull();
  });

  it.each([true, false])('creates and focuses a note using the available project context (%s)', async (projectScoped) => {
    const view = await openPanel(projectScoped ? archive : null);
    if (projectScoped) await fireEvent.click(button(/^New Note/));
    else await view.rerender({ quickCreate: 1 });
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/notes', {
      title: 'Untitled Note', ...(projectScoped ? { projectId: 7 } : {}),
    });
    await waitFor(() => expect(title().value).toBe('Untitled Note'));
    await waitFor(() => expect(document.activeElement).toBe(title()));
    expect(api.get).toHaveBeenCalledWith('/notes/13');
    expect(view.emitted()['note:changed']).toHaveLength(1);
  });

  it('saves title and project edits through the active note and allows removing its project', async () => {
    await openPanel(null);
    await fireEvent.click(await findNote(older.title));
    await fireEvent.update(await screen.findByRole('textbox', { name: 'Note title' }), 'Field notes revised');
    await fireEvent.keyDown(title(), { key: 'Enter' });
    expect(api.patch).toHaveBeenCalledWith('/notes/10', { title: 'Field notes revised' });
    const project = screen.getByRole('combobox', { name: 'Note project' });
    await fireEvent.update(project, '8');
    expect(api.patch).toHaveBeenLastCalledWith('/notes/10', { projectId: 8 });
    const noProject = within(project).getByRole('option', { name: 'No project' }) as HTMLOptionElement;
    await fireEvent.update(project, noProject.value);
    expect(api.patch).toHaveBeenLastCalledWith('/notes/10', { projectId: null });
    expect(await screen.findByText('Saved')).toBeTruthy();
  });

  it('debounces writing changes and saves just the latest HTML', async () => {
    const view = await openPanel();
    await fireEvent.click(await findNote(older.title));
    await screen.findByText('Survey material');
    await fireEvent.click(button('H2'));
    await fireEvent.click(button('H3'));
    expect(api.patch).not.toHaveBeenCalled();
    await waitFor(() => expect(api.patch).toHaveBeenCalledExactlyOnceWith('/notes/10', {
      content: '<h3>Survey material</h3><p></p>',
    }), { timeout: 1800 });
    expect(view.emitted()['note:changed']).toHaveLength(1);
  });

  it('flushes content for the previous note when switching before autosave', async () => {
    await openPanel();
    await fireEvent.click(await findNote(older.title));
    await screen.findByText('Survey material');
    await fireEvent.click(button('H2'));
    await fireEvent.click(await findNote(recent.title));
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/notes/10', { content: '<h2>Survey material</h2><p></p>' });
    expect(await screen.findByText('Référence to the interview.')).toBeTruthy();
    expect(title().value).toBe(recent.title);
  });

  it('confirms removal, refreshes the list and clears the editor', async () => {
    const view = await openPanel();
    await fireEvent.click(await findNote(recent.title));
    await fireEvent.click(await screen.findByTitle('Delete note'));
    await fireEvent.click(button('Cancel'));
    expect(api.delete).not.toHaveBeenCalled();
    await fireEvent.click(await screen.findByTitle('Delete note'));
    await fireEvent.click(button(/^Delete$/));
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/notes/11');
    expect(await screen.findByText('Select a note to edit')).toBeTruthy();
    expect(await findNote(older.title)).toBeTruthy();
    expect(screen.queryByText(recent.title)).toBeNull();
    expect(view.emitted()['note:changed']).toHaveLength(1);
    await fireEvent.click(button('Close notes'));
    expect(view.emitted()['update:modelValue']).toEqual([[false]]);
  });
});
