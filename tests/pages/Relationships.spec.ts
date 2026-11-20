import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import Relationships from '@/pages/Relationships.vue';
import type { Entity } from '@/services/entities/useEntities';

const { api, toast } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock('@/services/api', () => ({ default: api }));
vi.mock('@/composables/useNotification', () => ({ useNotification: () => toast }));

const person = { id: 1, name: 'PERSON' };
const organization = { id: 2, name: 'ORGANIZATION' };
const place = { id: 3, name: 'LOCATION' };
const entity = (id: number, name: string, entityType: Entity['entityType'], extra: Partial<Entity> = {}): Entity => ({
  id, name, entityType, createdAt: '2026-02-01', updatedAt: '2026-02-01', ...extra,
});
const ada = entity(11, 'Ada', person, {
  description: 'Researcher and author', aliases: [{ locale: 'en', value: 'A. Lovelace' }],
  translations: { es: 'Ada Augusta' },
});
const archive = entity(22, 'Archive', organization, { global: true });
const city = entity(33, 'Madrid', place);
const institute = entity(44, 'Institute', organization);
const project = { id: 99, name: 'Reference project' };
const resources = [{ id: 5, name: 'Biographical index' }, { id: 6, name: 'Institution directory' }];
const relationships = {
  entities: [ada, archive, city, institute].map(({ id, name, entityType }) => ({ id, name, type: entityType.name })),
  relationships: [
    { source: 11, target: 22, predicate: 'worked_with', confidence: 0.94, resource_id: 5 },
    { source: 22, target: 33, predicate: 'located_in', confidence: 0.65, resource_id: 6 },
    { source: 33, target: 44, predicate: 'hosts', confidence: 0.42, resource_id: 6 },
  ],
};

function setUpCanvas() {
  const circles: [number, number][] = [];
  let translateX = 0;
  let translateY = 0;
  let scale = 1;
  const context = {
    globalAlpha: 1,
    scale: vi.fn((value: number) => { scale = value; }),
    clearRect: vi.fn(() => { circles.length = 0; }),
    save: vi.fn(),
    translate: vi.fn((x: number, y: number) => { translateX = x; translateY = y; }),
    beginPath: vi.fn(), moveTo: vi.fn(), quadraticCurveTo: vi.fn(), lineTo: vi.fn(),
    stroke: vi.fn(), closePath: vi.fn(), fill: vi.fn(), restore: vi.fn(),
    fillText: vi.fn(), measureText: (label: string) => ({ width: label.length * 5 }),
    arc: vi.fn((x: number, y: number) => { circles.push([translateX + x * scale, translateY + y * scale]); }),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'offsetWidth', 'get').mockReturnValue(600);
  vi.spyOn(HTMLCanvasElement.prototype, 'offsetHeight', 'get').mockReturnValue(450);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  return { circles, context };
}

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const select = (name: string | RegExp) => screen.getByRole('combobox', { name });
const entityCheck = (name: string) => screen.getByRole('checkbox', { name: `Select ${name}` });
const entityRow = (name: string) => entityCheck(name).parentElement!.parentElement!;
const relationTable = () => within(screen.getByRole('table'));
const dialogBody = (title: string) => screen.getByRole('heading', { name: title }).parentElement!.parentElement!;

async function openRelationships(path = '/relationships') {
  const { circles, context } = setUpCanvas();
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<p>Projects</p>' } },
      { path: '/relationships', component: Relationships },
      ...['project', 'resource', 'knowledge-base'].map((name) => ({
        path: `/${name}/:id`, component: { template: '<p>Details</p>' },
      })),
    ],
  });
  await router.push(path);
  const { container } = render(Relationships, { global: { plugins: [router, createPinia()] } });
  await screen.findByText('3 relationships, 4 entities');
  return { circles, context, router, getCanvas: () => container.querySelector('canvas')! };
}

beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockImplementation(async (url) => {
    if (url === '/entities') return { data: structuredClone([ada, archive, city, institute]) };
    if (url === '/entity-types') return { data: [person, organization, place] };
    if (url === '/projects') return { data: [project] };
    if (url === '/projects/99') return { data: project };
    if (url === '/resources/project/99') return { data: resources };
    if (url.startsWith('/relationships/')) return { data: relationships };
    if (url === '/entities/11/detailed') return { data: {
      ...ada, resources: [resources[0]], projects: [project],
      knowledgeEntries: [{ id: 17, title: 'Biography of Ada' }],
    } };
    if (url === '/entities/22/detailed') return { data: archive };
    if (url === '/entities/search?q=Arc') return { data: [ada, archive] };
    throw new Error(`Unexpected GET ${url}`);
  });
});

afterEach(() => vi.restoreAllMocks());

describe('relationship explorer', () => {
  it('filters the table by project, resource, type, predicate and checked entities', async () => {
    await openRelationships();
    await fireEvent.click(button('Table'));
    expect(relationTable().getAllByRole('row')).toHaveLength(4);
    expect(relationTable().getByText('94%')).toBeTruthy();
    expect(relationTable().getByRole('link', { name: 'Resource #5' }).getAttribute('href')).toBe('/resource/5');

    await fireEvent.update(select('Project'), '99');
    await screen.findByRole('option', { name: 'Institution directory' });
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/relationships/project/99'));
    await fireEvent.update(select('Resource'), '6');
    expect(relationTable().getAllByRole('row')).toHaveLength(3);
    expect(relationTable().queryByText('worked_with')).toBeNull();

    await fireEvent.update(select('Entity type'), 'ORGANIZATION');
    await fireEvent.update(select('Predicate'), 'located_in');
    expect(relationTable().getAllByRole('row')).toHaveLength(2);
    expect(relationTable().getByRole('link', { name: 'Institution directory' }).getAttribute('href')).toBe('/resource/6');

    await fireEvent.click(entityCheck('Archive'));
    expect(relationTable().queryByText('located_in')).toBeNull();
    await fireEvent.click(entityCheck('Madrid'));
    expect(relationTable().getByText('located_in')).toBeTruthy();
    await fireEvent.click(entityCheck('Madrid'));
    expect(relationTable().queryByText('located_in')).toBeNull();
    await fireEvent.click(screen.getByTitle('Clear selection'));
    expect(relationTable().getByText('located_in')).toBeTruthy();

    await fireEvent.click(button('Refresh'));
    expect(api.get).toHaveBeenCalledWith('/relationships/project/99?resourceIds=6');

    await fireEvent.update(select('Project'), '0');
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/relationships/all'));
    expect(within(await screen.findByRole('table')).getAllByRole('row')).toHaveLength(4);
  });

  it('loads the project from navigation and uses the project breadcrumb', async () => {
    await openRelationships('/relationships?project=99&tab=relationships');
    expect(screen.queryByRole('combobox', { name: 'Project' })).toBeNull();
    expect(screen.getByRole('link', { name: project.name }).getAttribute('href')).toBe('/project/99');
    expect(api.get).toHaveBeenCalledWith('/resources/project/99');
    expect(api.get).toHaveBeenCalledWith('/relationships/project/99');
  });

  it('draws nodes, zooms around the pointer, drags, selects and clears node focus', async () => {
    const { getCanvas, circles, context } = await openRelationships();
    await waitFor(() => expect(circles).toHaveLength(4));
    const canvas = getCanvas();
    expect(context.fillText).toHaveBeenCalledWith('worked with', expect.any(Number), expect.any(Number));
    const initialScale = context.scale.mock.lastCall![0];
    await fireEvent.wheel(canvas, { clientX: 250, clientY: 140, deltaY: -10 });
    expect(context.scale.mock.lastCall![0]).toBeGreaterThan(initialScale);
    await fireEvent.click(button('-'));
    await fireEvent.click(button('+'));
    await fireEvent.click(screen.getByTitle('Fit'));
    expect(context.scale.mock.lastCall![0]).toBeCloseTo(initialScale);

    // Ada is the end node of a three-edge chain. The entity panel highlights the adjacent nodes.
    const [adaX, adaY] = circles[2]!;
    await fireEvent.mouseDown(canvas, { clientX: adaX, clientY: adaY });
    await fireEvent.mouseUp(canvas);
    expect(context.arc).toHaveBeenCalled();
    const draws = context.arc.mock.calls.length;
    await fireEvent.mouseDown(canvas, { clientX: adaX, clientY: adaY });
    await fireEvent.mouseMove(canvas, { clientX: adaX + 12, clientY: adaY + 8 });
    await fireEvent.mouseUp(canvas);
    expect(context.arc.mock.calls.length).toBeGreaterThan(draws);

    await fireEvent.dblClick(canvas, { clientX: adaX + 12, clientY: adaY + 8 });
    await fireEvent.keyDown(window, { key: 'Escape' });
    await fireEvent.mouseDown(canvas, { clientX: 2, clientY: 2 });
    await fireEvent.mouseMove(canvas, { clientX: 14, clientY: 10 });
    await fireEvent.mouseUp(canvas);
    await fireEvent.mouseLeave(canvas);
    expect(context.translate.mock.lastCall![0]).not.toBe(0);
  });
});

describe('entity directory', () => {
  it.each(['researcher', 'lovelace', 'augusta', 'person'])('matches entities by %s', async (query) => {
    await openRelationships();
    await fireEvent.update(screen.getByRole('textbox', { name: 'Search entities' }), query);
    expect(entityCheck('Ada')).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: 'Select Archive' })).toBeNull();
  });

  it('opens resource and knowledge links, and creates a definition for an unlinked entity', async () => {
    const { router } = await openRelationships();
    await fireEvent.click(within(entityRow('Ada')).getByText('Ada'));
    expect(await screen.findByRole('button', { name: 'Biographical index' })).toBeTruthy();
    await fireEvent.click(button('Biography of Ada'));
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/knowledge-base/17'));
    await fireEvent.click(within(entityRow('Ada')).getByText('Ada'));
    expect(screen.queryByRole('button', { name: 'Biography of Ada' })).toBeNull();

    await fireEvent.click(within(entityRow('Archive')).getByText('Archive'));
    expect(await screen.findByText('Not linked to any resources')).toBeTruthy();
    api.post.mockResolvedValue({ data: { id: 27 } });
    await fireEvent.click(button(/Crear entrada en Knowledge Base/));
    expect(api.post).toHaveBeenCalledWith('/knowledge-entries', {
      title: 'Archive', summary: undefined, isDefinition: true, entityId: 22,
    });
    await waitFor(() => expect(router.currentRoute.value.path).toBe('/knowledge-base/27'));
  });

  it('adds a typed entity and includes the trimmed description', async () => {
    await openRelationships();
    api.post.mockResolvedValue({ data: entity(52, 'Library', organization, { description: 'Public collections' }) });
    await fireEvent.click(screen.getByTitle('New Entity'));
    expect((button('Create') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.update(screen.getByPlaceholderText('Entity name'), ' Library ');
    await fireEvent.update(select(/^Type/), '2');
    await fireEvent.update(screen.getByPlaceholderText('Optional description'), ' Public collections ');
    await fireEvent.click(button('Create'));

    expect(await screen.findByRole('checkbox', { name: 'Select Library' })).toBeTruthy();
    expect(api.post).toHaveBeenCalledWith('/entities', {
      name: 'Library', entityTypeId: 2, description: 'Public collections',
    });
  });

  it('edits an entity and normalizes aliases and translations', async () => {
    await openRelationships();
    api.patch.mockResolvedValue({ data: ada });
    await fireEvent.click(within(entityRow('Ada')).getByTitle('Edit'));
    await fireEvent.update(screen.getByPlaceholderText('Entity name'), ' Ada Lovelace ');
    await fireEvent.click(button('+ Add translation'));
    await fireEvent.update(screen.getAllByLabelText('Translation language')[1], ' fr ');
    await fireEvent.update(screen.getAllByLabelText('Translated name')[1], ' Comtesse ');
    await fireEvent.click(button('+ Add alias'));
    await fireEvent.update(screen.getAllByLabelText('Alias name')[1], ' Countess ');
    await fireEvent.click(button('Save'));

    expect(await screen.findByRole('checkbox', { name: 'Select Ada Lovelace' })).toBeTruthy();
    expect(api.patch).toHaveBeenCalledWith('/entities/11', {
      name: 'Ada Lovelace', description: ada.description, entityTypeId: 1, global: false,
      translations: { es: 'Ada Augusta', fr: 'Comtesse' },
      aliases: [...ada.aliases!, { locale: 'en', value: 'Countess' }],
    });
  });

  it('excludes the source from merge search and requires confirmation before merging', async () => {
    await openRelationships();
    api.post.mockResolvedValue({ data: { ...archive, aliases: [{ locale: 'en', value: 'Ada' }] } });
    await fireEvent.click(within(entityRow('Ada')).getByTitle('Merge'));
    await fireEvent.update(screen.getByRole('textbox', { name: 'Search for merge target' }), 'Arc');
    await fireEvent.click(await screen.findByRole('button', { name: /ORGANIZATION Archive/ }));
    expect(api.post).not.toHaveBeenCalled();

    await fireEvent.click(within(dialogBody('Merge: Ada')).getByRole('button', { name: 'Merge' }));
    const confirm = () => within(dialogBody('Confirm Merge')).getByRole('button', { name: 'Merge' });
    await fireEvent.click(confirm());
    await waitFor(() => expect(screen.queryByRole('checkbox', { name: 'Select Ada' })).toBeNull());
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/entities/11/merge/22');
    expect(entityCheck('Archive')).toBeTruthy();
  });
});
