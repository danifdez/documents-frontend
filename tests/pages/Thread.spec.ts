import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import Thread from '@/pages/Thread.vue';
import { useFeatureStore } from '@/store/featureStore';
import { useProjectStore } from '@/store/projectStore';
import type { Project } from '@/types/Project';

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
vi.mock('@/services/api', () => ({ default: api }));

const project: Project = { id: 7, name: 'Archives', description: null, status: 'active', createdAt: '', updatedAt: '' };
const parent = { id: 6, name: 'Collections' };
const thread = { id: 8, name: 'Fieldwork', description: 'Original transcriptions', status: 'active', parent };
const child = { id: 9, name: 'Interviews', description: 'Oral histories', parent: { id: 8 } };
const target = { id: 10, name: 'Catalogue' };
const draft = { id: 20, name: 'Field journal', updatedAt: '2025-07-03T10:00:00Z' };
const canvas = { id: 30, name: 'Exhibit map', createdAt: '2025-07-04T10:00:00Z' };
const resource = { id: 40, name: 'Letters.pdf', title: 'Summer letters', mimeType: 'application/pdf' };
const button = (name: string | RegExp) => screen.getByRole('button', { name });

let getThread: () => object;
let children: object[];

async function openThread(features: Record<string, boolean> = {}) {
  const pinia = createPinia();
  useProjectStore(pinia).setCurrentProject(project);
  useFeatureStore(pinia).setBackendFeatures(features);
  const destination = { template: '<p>Destination</p>' };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/thread/:id', component: Thread },
      ...['document', 'project', 'canvas', 'timeline', 'resource'].map((part) => ({ path: `/${part}/:id`, component: destination })),
    ],
  });
  await router.push('/thread/8');
  render(Thread, {
    global: { plugins: [router, pinia], stubs: { OfflineToggle: true, ImportDocumentModal: true } },
  });
  await screen.findByRole('link', { name: draft.name });
  await screen.findByRole('link', { name: /^Interviews/ });
  return router;
}

async function chooseAction(name: string) {
  await fireEvent.click(button('More options'));
  await fireEvent.click(await screen.findByRole('menuitem', { name }));
}

function itemMove(name: string) {
  const row = screen.getByRole('link', { name }).parentElement!;
  return within(row).getByTitle('Move to...');
}

beforeEach(() => {
  vi.resetAllMocks();
  getThread = () => ({ ...thread });
  children = [child];
  api.get.mockImplementation(async (url: string) => {
    switch (url) {
      case '/threads/8': return { data: getThread() };
      case '/threads/8/children': return { data: [...children] };
      case '/threads/by-project/7': return { data: [parent, thread, child, target] };
      case '/docs/thread/8': return { data: [draft] };
      case '/canvases/thread/8': return { data: [canvas] };
      case '/resources/thread/8': return { data: [resource] };
      case '/notes/thread/8': return { data: [] };
      default: throw new Error(`Unexpected GET ${url}`);
    }
  });
  api.post.mockResolvedValue({ data: {} });
  api.patch.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({ data: {} });
});

afterEach(() => {
  cleanup();
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  vi.restoreAllMocks();
});

describe('thread workspace', () => {
  it('shows breadcrumbs, sub-threads, documents, and resources ordered in their sections', async () => {
    await openThread();
    expect(screen.getByRole('link', { name: project.name }).getAttribute('href')).toBe('/project/7');
    expect(screen.getByRole('link', { name: parent.name }).getAttribute('href')).toBe('/thread/6');
    expect(screen.getByRole('link', { name: /^Interviews/ }).getAttribute('href')).toBe('/thread/9');
    expect(await screen.findByRole('link', { name: resource.title })).toHaveProperty('pathname', '/resource/40');
    const documents = screen.getByRole('heading', { name: 'Documents' }).closest('section')!;
    expect(within(documents).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/canvas/30', '/document/20']);
  });

  it('filters documents and canvases from the keyboard and clears an empty result', async () => {
    await openThread();
    await fireEvent.keyDown(document.body, { key: 'f', ctrlKey: true });
    const search = await screen.findByRole('textbox', { name: 'Search documents...' });
    await fireEvent.update(search, 'missing');
    await fireEvent.keyUp(search, { key: 'Enter' });
    expect(await screen.findByText('No documents yet.')).toBeTruthy();
    expect(screen.getByRole('link', { name: resource.title })).toBeTruthy();
    await fireEvent.click(button('Clear filter'));
    expect(screen.getByRole('link', { name: draft.name })).toBeTruthy();
    expect(screen.getByRole('link', { name: canvas.name })).toBeTruthy();
  });

  it.each([
    ['New document', '/document/new?threadId=8'],
    ['New canvas', '/canvas/new?threadId=8'],
    ['New timeline', '/timeline/new?projectId=7'],
  ])('opens %s with its parent context', async (title, path) => {
    const router = await openThread();
    await fireEvent.click(screen.getByTitle(title));
    await waitFor(() => expect(router.currentRoute.value.fullPath).toBe(path));
  });

  it('hides canvas entries and creation actions for disabled features', async () => {
    await openThread({ canvas: false, timelines: false });
    expect(screen.queryByTitle('New canvas')).toBeNull();
    expect(screen.queryByTitle('New timeline')).toBeNull();
    expect(screen.queryByRole('link', { name: canvas.name })).toBeNull();
    expect(screen.getByTitle('New document')).toBeTruthy();
  });

  it('creates a sub-thread under the current thread and refreshes the child list', async () => {
    await openThread();
    const created = { ...child, id: 12, name: 'Correspondence' };
    api.post.mockImplementationOnce(async () => {
      children.push(created);
      return { data: created };
    });
    await fireEvent.click(screen.getByTitle('New sub-thread'));
    await fireEvent.click(button('Create Thread'));
    expect(api.post).not.toHaveBeenCalled();
    await fireEvent.update(screen.getByLabelText('Thread Name'), created.name);
    await fireEvent.click(button('Create Thread'));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/threads', {
      name: created.name, projectId: 7, parentId: 8, description: '',
    });
    expect(await screen.findByRole('link', { name: /^Correspondence/ })).toBeTruthy();
  });

  it('edits metadata, trims input, and clears the description when left blank', async () => {
    await openThread();
    await chooseAction('Edit');
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe(thread.name);
    await fireEvent.update(screen.getByLabelText('Name'), '  Revised Fieldwork  ');
    await fireEvent.update(screen.getByLabelText('Description'), '  ');
    await fireEvent.click(button('Save'));
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/threads/8', { name: 'Revised Fieldwork', description: null });
    expect(await screen.findByRole('heading', { name: 'Revised Fieldwork' })).toBeTruthy();
    expect(screen.getByText('No description')).toBeTruthy();
  });

  it.each([
    [draft.name, 'Project root', '/docs/20', { threadId: null }],
    [canvas.name, target.name, '/canvases/30', { threadId: 10 }],
    [resource.title, 'Project root', '/resources/40', { thread: null }],
    [resource.title, target.name, '/resources/40/assign-thread', { threadId: 10 }],
  ])('moves %s to %s and reloads the collection', async (name, destination, url, payload) => {
    await openThread();
    await fireEvent.click(itemMove(name));
    expect((button(/^Move$/) as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.click(button(destination));
    await fireEvent.click(button(/^Move$/));
    expect(api.patch).toHaveBeenCalledExactlyOnceWith(url, payload);
    await waitFor(() => expect(api.get.mock.calls.filter(([url]) => url === '/resources/thread/8')).toHaveLength(2));
  });

  it.each(['Archive', 'Delete'])('requires confirmation before the %s action', async (action) => {
    const router = await openThread();
    await chooseAction(action);
    await fireEvent.click(button('Cancel'));
    expect(api.post).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
    expect(router.currentRoute.value.path).toBe('/thread/8');
    await chooseAction(action);
    await fireEvent.click(button(action));
    if (action === 'Archive') expect(api.post).toHaveBeenCalledExactlyOnceWith('/threads/8/archive');
    else expect(api.delete).toHaveBeenCalledExactlyOnceWith('/threads/8');
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/project/7'));
  });

  it('unarchives an archived thread and updates the actions after refresh', async () => {
    getThread = () => ({ ...thread, status: api.post.mock.calls.length ? 'active' : 'archived' });
    await openThread();
    await chooseAction('Unarchive');
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/threads/8/unarchive');
    expect(await screen.findByRole('menuitem', { name: 'Archive' })).toBeTruthy();
  });
});
