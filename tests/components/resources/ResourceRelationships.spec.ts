import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ResourceRelationships from '@/components/resources/ResourceRelationships.vue';
import type { Relationship, RelationshipEntity } from '@/services/relationships/useRelationships';

const { api, subscribe, unsubscribe } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() }, subscribe: vi.fn(), unsubscribe: vi.fn(),
}));
vi.mock('@/services/api', () => ({ default: api }));
vi.mock('@/services/notifications/executionPublication', () => ({ subscribeExecutionPublication: subscribe }));

const entities: RelationshipEntity[] = [
  { id: 11, name: 'Ada', type: 'PERSON' },
  { id: 12, name: 'Municipal preservation department', type: 'ORGANIZATION' },
  { id: 13, name: 'Reading room', type: 'FACILITY' },
];
const relationships: Relationship[] = [
  { source: 11, target: 12, predicate: 'worked_with', confidence: 0.82 },
  { source: 12, target: 13, predicate: 'has_documented_long_term_ownership', confidence: 0.48 },
  { source: 13, target: 99, predicate: 'mentions', confidence: 0 },
];
const resourceId = 7;
const context = {
  arc: vi.fn(), fillText: vi.fn(), translate: vi.fn(), scale: vi.fn(), clearRect: vi.fn(),
  beginPath: vi.fn(), closePath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
  stroke: vi.fn(), fill: vi.fn(), save: vi.fn(), restore: vi.fn(),
};
const button = (name: string) => screen.getByRole('button', { name });
let current: Relationship[];
let complete: (data: { resourceId?: number }) => void;
let frame: FrameRequestCallback | undefined;

async function openGraph() {
  const view = render(ResourceRelationships, { props: { resourceId } });
  await waitFor(() => expect(api.get).toHaveBeenCalledExactlyOnceWith('/relationships/resource/7'));
  await waitFor(() => expect(context.arc).toHaveBeenCalled());
  return view.container.querySelector('canvas')!;
}

beforeEach(() => {
  vi.resetAllMocks();
  current = [...relationships];
  api.get.mockImplementation(async (url: string) => {
    if (url !== '/relationships/resource/7') throw new Error(`Unexpected GET ${url}`);
    return { data: { entities, relationships: current } };
  });
  api.post.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({ data: {} });
  subscribe.mockImplementation((_event: string, callback: typeof complete) => {
    complete = callback;
    return unsubscribe;
  });
  frame = undefined;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frame = callback; return 1; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'offsetWidth', 'get').mockReturnValue(800);
  vi.spyOn(HTMLCanvasElement.prototype, 'offsetHeight', 'get').mockReturnValue(650);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('relationships in a resource', () => {
  it('shows endpoint names and confidence in the table, including an unresolved entity', async () => {
    await openGraph();
    await fireEvent.click(button('Table'));
    const row = within(screen.getByRole('row', { name: /Ada worked_with/ }));
    expect(row.getByText('82%')).toBeTruthy();
    expect(row.getByText(entities[1].name)).toBeTruthy();
    const unresolved = within(screen.getByRole('row', { name: /Reading room mentions/ }));
    expect(unresolved.getByRole('cell', { name: '99' })).toBeTruthy();
    expect(unresolved.getByText('0%')).toBeTruthy();
  });

  it('waits for extraction completion for this resource before reloading its relationships', async () => {
    current = [];
    render(ResourceRelationships, { props: { resourceId } });
    await screen.findByText('No relationships found');
    await fireEvent.click(await screen.findByRole('button', { name: 'Extract Relationships' }));
    expect(subscribe).toHaveBeenCalledWith('relationshipExtractionComplete', expect.any(Function));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/relationships/resource/7/extract');
    complete({ resourceId: 8 });
    expect(api.get).toHaveBeenCalledOnce();
    expect(unsubscribe).not.toHaveBeenCalled();
    current = [relationships[0]];
    complete({ resourceId });
    await waitFor(() => expect(context.fillText).toHaveBeenCalledWith('worked with', expect.any(Number), expect.any(Number)));
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('cancels relationship creation and sends both endpoints and the source resource when confirmed', async () => {
    await openGraph();
    await fireEvent.click(button('Table'));
    await fireEvent.click(button('Add Relationship'));
    expect((button('Add') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.click(button('Cancel'));
    expect(api.post).not.toHaveBeenCalled();

    await fireEvent.click(button('Add Relationship'));
    await fireEvent.update(screen.getByLabelText('Subject'), '11');
    await fireEvent.update(screen.getByLabelText('Predicate'), 'visited');
    await fireEvent.update(screen.getByLabelText('Object'), '13');
    api.post.mockImplementationOnce(async () => {
      current.push({ source: 11, target: 13, predicate: 'visited', confidence: 1 });
      return { data: {} };
    });
    await fireEvent.click(button('Add'));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/relationships', {
      subjectId: 11, objectId: 13, predicate: 'visited', resourceId: 7,
    });
    expect(await screen.findByRole('row', { name: /Ada visited Reading room 100%/ })).toBeTruthy();
  });

  it('removes only the chosen relationship and keeps other predicates in the table', async () => {
    await openGraph();
    await fireEvent.click(button('Table'));
    const row = within(screen.getByRole('row', { name: /Ada worked_with/ }));
    api.delete.mockImplementationOnce(async () => {
      current = current.slice(1);
      return { data: {} };
    });
    await fireEvent.click(row.getByRole('button', { name: 'Delete' }));
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/relationships', {
      data: { subjectId: 11, objectId: 12, predicate: 'worked_with', resourceId: 7 },
    });
    await waitFor(() => expect(screen.queryByText('worked_with')).toBeNull());
    expect(await screen.findByText('mentions')).toBeTruthy();
  });

  it('draws only valid edges and keeps their labels readable when zooming and dragging vertices', async () => {
    const random = vi.spyOn(Math, 'random');
    for (const value of [0.2, 0.2, 0.6, 0.6, 0.8, 0.3]) random.mockReturnValueOnce(value);
    const canvas = await openGraph();
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 800, 650));
    for (let iteration = 0; iteration < 250; iteration++) frame?.(iteration * 16);
    expect(context.fillText).toHaveBeenCalledWith('worked with', expect.any(Number), expect.any(Number));
    expect(context.fillText).toHaveBeenCalledWith('has documented long term ow...', expect.any(Number), expect.any(Number));
    expect(context.fillText).not.toHaveBeenCalledWith('mentions', expect.any(Number), expect.any(Number));
    const [x, y] = context.arc.mock.calls.at(-3)! as [number, number];
    const [panX, panY] = context.translate.mock.lastCall! as [number, number];
    const scale = context.scale.mock.lastCall![0] as number;
    const startX = panX + x * scale;
    const startY = panY + y * scale;

    await fireEvent.mouseMove(canvas, { clientX: startX, clientY: startY });
    await fireEvent.mouseDown(canvas, { clientX: startX, clientY: startY });
    expect(canvas.classList.contains('cursor-grabbing')).toBe(true);
    await fireEvent.mouseMove(canvas, { clientX: startX + 35, clientY: startY + 10 });
    const [movedX] = context.arc.mock.calls.at(-3)! as [number];
    expect(movedX).toBeGreaterThan(x);
    await fireEvent.mouseUp(canvas);
    expect(canvas.classList.contains('cursor-grabbing')).toBe(false);

    await fireEvent.mouseDown(canvas, { clientX: -400, clientY: -80 });
    await fireEvent.mouseMove(canvas, { clientX: -385, clientY: -70 });
    expect(context.translate).toHaveBeenLastCalledWith(panX + 15, panY + 10);
    await fireEvent.mouseLeave(canvas);
    await fireEvent.wheel(canvas, { clientX: 80, clientY: 90, deltaY: -100 });
    expect(context.scale.mock.lastCall![0]).toBeGreaterThan(scale);
    await fireEvent.click(button('-'));
    await fireEvent.click(button('+'));
    await fireEvent.click(screen.getByTitle('Fit to view'));
    expect(context.scale.mock.lastCall![0]).toBeGreaterThan(0);
  });
});
