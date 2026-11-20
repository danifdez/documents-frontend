import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import { type Component } from 'vue';
import Dashboard from '@/pages/Dashboard.vue';
import Project from '@/pages/Project.vue';
import { useFeatureStore } from '@/store/featureStore';
import { useProjectStore } from '@/store/projectStore';
import type { Project as ProjectRecord } from '@/types/Project';

const { api, notification } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), defaults: { baseURL: '' } },
  notification: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/services/api', () => ({ default: api }));
vi.mock('@/composables/useNotification', () => ({ useNotification: () => notification }));

const times = { updatedAt: '2026-02-01', createdAt: '2026-01-15' };
const project: ProjectRecord = { id: 7, name: 'Archives', description: 'Field research', status: 'active', ...times };
const archived = { ...project, id: 10, name: 'Prior research', status: 'archived' as const };
const thread = { id: 13, name: 'Maritime survey', description: 'First documents', ...times };
const draft = { id: 16, name: 'Café inventory', description: 'Survey notes', ...times };
const board = { id: 18, name: 'Café exhibit', ...times };
const timeline = { id: 19, name: 'Archive history', timelineData: [{ id: 'a' }], ...times };
const resource = { id: 21, name: 'index.pdf', originalName: 'café references.pdf', mimeType: 'application/pdf', ...times };
const pending = { id: 28, name: 'Awaiting assignment.txt', mimeType: 'text/plain' };
const button = (name: string | RegExp) => screen.getByRole('button', { name });

function configureRequests(active = project) {
  const collection = {
    docs: [draft, { ...draft, id: 35, name: 'Nested document', thread }],
    threads: [thread],
    canvases: [board],
  };
  api.get.mockImplementation(async (path: string) => {
    if (path === '/projects') return { data: [project] };
    if (path === '/projects?includeArchived=true') return { data: [project, archived] };
    if (path === '/projects/search?q=Archives') return { data: [project] };
    if (path === '/projects/7') return { data: active };
    if (path === '/threads/by-project/7') return { data: [...collection.threads] };
    if (path === '/docs/project/7') return { data: [...collection.docs] };
    if (path === '/canvases/project/7') return { data: [...collection.canvases] };
    if (path === '/timelines/project/7') return { data: [timeline] };
    if (path === '/resources/project/7') return { data: [resource] };
    if (path === '/resources/pending') return { data: [pending] };
    if (['/resource-types', '/notes', '/notes/project/7', '/calendar-events/project/7', '/calendar-events/range'].includes(path)) return { data: [] };
    throw new Error(`Unexpected GET ${path}`);
  });
  return collection;
}

async function openPage(component: Component, url: string, features: Record<string, boolean> = {}, active = project) {
  const collection = configureRequests(active);
  const pinia = createPinia();
  useFeatureStore(pinia).setBackendFeatures(features);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Dashboard },
      { path: '/project/:id', component: Project },
      { path: '/project/:id/:section', component: { template: '<p>Section</p>' } },
      { path: '/datasets', component: { template: '<p>Datasets</p>' } },
      ...['document', 'resource', 'timeline', 'canvas', 'thread'].map((key) => ({
        path: `/${key}/:id`, component: { template: '<p>Detail</p>' },
      })),
    ],
  });
  await router.push(url);
  render(component, { global: { plugins: [router, pinia], stubs: { OfflineToggle: true } } });
  return { collection, router, projectStore: useProjectStore(pinia) };
}

const projectLink = (name: string | RegExp) => screen.getByRole('link', { name });
const possibleProjectLink = (name: string | RegExp) => screen.queryByRole('link', { name });
const projectActions = () => within(screen.getByRole('heading', { name: project.name }).parentElement!.parentElement!);
const menu = async (menuName: 'More options' | 'New', item: string) => {
  const action = screen.queryByRole('menuitem', { name: item });
  if (!action) await fireEvent.click(projectActions().getByRole('button', { name: menuName }));
  await fireEvent.click(screen.getByRole('menuitem', { name: item }));
};

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(async () => {
  await fireEvent.keyDown(window, { key: 'Escape' });
});

describe('projects dashboard', () => {
  it('loads archived projects only when requested and searches by keyboard', async () => {
    await openPage(Dashboard, '/');
    await screen.findByRole('link', { name: /Archives/ });
    expect(possibleProjectLink(/Prior research/)).toBeNull();
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Show archived' }));
    expect(await screen.findByRole('link', { name: /Prior research/ })).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith('/projects?includeArchived=true');
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Show archived' }));

    await fireEvent.keyDown(window, { key: 'f', ctrlKey: true });
    const search = await screen.findByRole('textbox', { name: 'Search projects...' });
    await fireEvent.update(search, 'Archives');
    await fireEvent.keyUp(search, { key: 'Enter' });
    expect(api.get).toHaveBeenCalledWith('/projects/search?q=Archives');
    expect(screen.getByText('Filtered by "Archives"')).toBeTruthy();
    await fireEvent.click(button('Clear filter'));
    expect(screen.queryByText('Filtered by "Archives"')).toBeNull();
    expect(projectLink(/Archives/).getAttribute('href')).toBe('/project/7');
  });

  it('assigns a pending resource after a failed request and updates the dashboard', async () => {
    await openPage(Dashboard, '/');
    api.patch.mockRejectedValueOnce(new Error('Backend unavailable')).mockResolvedValueOnce({ data: {} });
    const selector = await screen.findByRole('combobox', { name: /Assign project to Awaiting assignment/ });
    await waitFor(() => expect(within(selector).getByRole('option', { name: 'Archives' })).toBeTruthy());
    await fireEvent.update(selector, '7');
    await waitFor(() => expect(notification.error).toHaveBeenCalledWith('Failed to assign resource'));
    expect(screen.getByText(pending.name)).toBeTruthy();
    await fireEvent.update(selector, '7');
    await waitFor(() => expect(screen.queryByText(pending.name)).toBeNull());
    expect(api.patch).toHaveBeenLastCalledWith('/resources/28/assign', { projectId: 7 });
    expect(notification.success).toHaveBeenCalledWith('Resource assigned to project');
  });

  it('creates a project with the form and selects it for navigation', async () => {
    const { router, projectStore } = await openPage(Dashboard, '/');
    const created = { ...project, id: 31, name: 'Library collection', description: 'Restricted sources' };
    api.post.mockResolvedValue({ status: 201, data: created });
    await fireEvent.click(button('New Project'));
    await fireEvent.update(screen.getByLabelText('Project Name'), created.name);
    await fireEvent.update(screen.getByLabelText('Description'), created.description);
    const submit = button('Create Project') as HTMLButtonElement;
    await fireEvent.submit(submit.form!);
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/project/31'));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/projects', {
      name: created.name, description: created.description,
    });
    expect(projectStore.currentProject).toEqual(created);
  });
});

describe('project detail', () => {
  it('lists project-level items, filters by normalized names across collections and clears the filter', async () => {
    await openPage(Project, '/project/7');
    await screen.findByRole('link', { name: /Archive history/ });
    expect(projectLink(/Maritime survey/).getAttribute('href')).toBe('/thread/13');
    expect(projectLink(/Café inventory/).getAttribute('href')).toBe('/document/16');
    expect(projectLink(/Café exhibit/).getAttribute('href')).toBe('/canvas/18');
    expect(possibleProjectLink(/Nested document/)).toBeNull();
    await fireEvent.keyDown(window, { key: 'f', ctrlKey: true });
    const filter = await screen.findByRole('textbox', { name: 'Search threads, documents and resources...' });
    await fireEvent.update(filter, 'caFE');
    await fireEvent.keyUp(filter, { key: 'Enter' });
    expect(possibleProjectLink(/Maritime survey/)).toBeNull();
    expect(possibleProjectLink(/Archive history/)).toBeNull();
    expect(projectLink(/Café inventory/)).toBeTruthy();
    expect(projectLink(/Café exhibit/)).toBeTruthy();
    expect(projectLink(/index.pdf/)).toBeTruthy();
    await fireEvent.click(button('Clear filter'));
    expect(projectLink(/Maritime survey/)).toBeTruthy();
    expect(projectLink(/Archive history/)).toBeTruthy();
  });

  it('moves a document to a thread and reloads project collections', async () => {
    const { collection } = await openPage(Project, '/project/7');
    const link = await screen.findByRole('link', { name: /Café inventory/ });
    api.patch.mockImplementation(async () => {
      collection.docs.splice(0, 1, { ...draft, thread });
      return { data: draft };
    });
    await fireEvent.click(within(link.parentElement!).getByTitle('Move to...'));
    expect((button('Move') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.click(button('Maritime survey'));
    await fireEvent.click(button('Move'));

    await waitFor(() => expect(possibleProjectLink(/Café inventory/)).toBeNull());
    expect(api.patch).toHaveBeenCalledWith('/docs/16', { threadId: 13 });
    expect(notification.success).toHaveBeenCalledWith('Moved "Café inventory" successfully');
    expect(api.get.mock.calls.filter(([request]) => request === '/docs/project/7')).toHaveLength(2);
  });

  it('creates a thread in the project and includes it in the project view', async () => {
    const { collection } = await openPage(Project, '/project/7');
    await screen.findByRole('link', { name: /Archive history/ });
    const created = { id: 15, name: 'Research returns', description: 'Returned holdings', ...times };
    api.post.mockImplementation(async () => {
      collection.threads.push(created);
      return { data: created };
    });
    await menu('New', 'Thread');
    await fireEvent.update(screen.getByLabelText('Thread Name'), created.name);
    await fireEvent.update(screen.getByLabelText('Description'), created.description);
    await fireEvent.click(button(/^Create( Thread)?$/));
    expect(await screen.findByRole('link', { name: /Research returns/ })).toBeTruthy();
    expect(api.post).toHaveBeenCalledWith('/threads', {
      name: created.name, description: created.description, projectId: 7,
    });
  });

  it('respects project feature flags when fetching collections and opening new items', async () => {
    const { router } = await openPage(Project, '/project/7', {
      canvas: false, timelines: false, bibliography: false, datasets: false, relationships: false,
    });
    await screen.findByRole('link', { name: /Café inventory/ });
    expect(possibleProjectLink('Bibliography')).toBeNull();
    expect(possibleProjectLink('Relationships')).toBeNull();
    expect(api.get).not.toHaveBeenCalledWith('/canvases/project/7');
    expect(api.get).not.toHaveBeenCalledWith('/timelines/project/7');
    await fireEvent.click(projectActions().getByRole('button', { name: 'New' }));
    expect(screen.queryByRole('menuitem', { name: 'Canvas' })).toBeNull();
    await fireEvent.click(screen.getByRole('menuitem', { name: 'Document' }));
    await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/document/new?projectId=7'));
  });

  it('confirms project archiving and only leaves the project after the request succeeds', async () => {
    const { router } = await openPage(Project, '/project/7');
    await screen.findByRole('link', { name: /Archive history/ });
    await menu('More options', 'Archive');
    await fireEvent.click(button('Cancel'));
    expect(api.post).not.toHaveBeenCalled();

    api.post.mockRejectedValueOnce(new Error('temporarily unavailable')).mockResolvedValueOnce({ data: {} });
    await menu('More options', 'Archive');
    await fireEvent.click(button('Archive'));
    await waitFor(() => expect(notification.error).toHaveBeenCalledWith('Failed to archive project'));
    expect(router.currentRoute.value.fullPath).toBe('/project/7');

    await menu('More options', 'Archive');
    await fireEvent.click(button('Archive'));
    await waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/'));
    expect(api.post).toHaveBeenLastCalledWith('/projects/7/archive');
    expect(notification.success).toHaveBeenCalledWith('Project archived');
  });
});

describe('project collection updates', () => {
  it('unarchives the project without leaving its detail page', async () => {
    const status: ProjectRecord = { ...project, status: 'archived' };
    const { router } = await openPage(Project, '/project/7', {}, status);
    await screen.findByRole('link', { name: /Archive history/ });
    api.post.mockResolvedValue({ data: {} });
    await menu('More options', 'Unarchive');
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/projects/7/unarchive');
    await waitFor(() => expect(notification.success).toHaveBeenCalledWith('Project unarchived'));
    expect(router.currentRoute.value.path).toBe('/project/7');
  });

  it('preserves a canvas in the project after a failed move and retries from the original row', async () => {
    const { collection } = await openPage(Project, '/project/7');
    const link = await screen.findByRole('link', { name: /Café exhibit/ });
    api.patch.mockRejectedValueOnce(new Error('Temporary failure')).mockImplementationOnce(async () => {
      collection.canvases.splice(0, 1);
      return { data: board };
    });
    await fireEvent.click(within(link.parentElement!).getByTitle('Move to...'));
    await fireEvent.click(button('Maritime survey'));
    await fireEvent.click(button('Move'));
    await waitFor(() => expect(notification.error).toHaveBeenCalledWith('Failed to move item'));
    expect(possibleProjectLink(/Café exhibit/)).toBeTruthy();
    await fireEvent.click(button('Cancel'));

    await fireEvent.click(within(link.parentElement!).getByTitle('Move to...'));
    await fireEvent.click(button('Maritime survey'));
    await fireEvent.click(button('Move'));
    await waitFor(() => expect(possibleProjectLink(/Café exhibit/)).toBeNull());
    expect(api.patch.mock.calls).toEqual([
      ['/canvases/18', { threadId: 13 }], ['/canvases/18', { threadId: 13 }],
    ]);
  });

  it('keeps a project open when deletion fails and returns to the dashboard on retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { router } = await openPage(Project, '/project/7');
    await screen.findByRole('link', { name: /Archive history/ });
    api.delete.mockRejectedValueOnce(new Error('Project in use')).mockResolvedValueOnce({ data: {} });
    await menu('More options', 'Delete');
    await fireEvent.click(button('Delete'));
    await waitFor(() => expect(screen.queryByRole('heading', { name: /Delete Project/ })).toBeNull());
    expect(router.currentRoute.value.path).toBe('/project/7');

    await menu('More options', 'Delete');
    await fireEvent.click(button('Delete'));
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/'));
    expect(api.delete.mock.calls).toEqual([['/projects/7'], ['/projects/7']]);
  });
});
