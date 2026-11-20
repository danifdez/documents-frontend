import { fireEvent, screen, waitFor } from '@testing-library/vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { VueFlow, type VueFlowStore } from '@vue-flow/core';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import CanvasEditor from '@/components/canvas/CanvasEditor.vue';
import type { CanvasData, CanvasNode } from '@/types/canvas';

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), delete: vi.fn() } }));
vi.mock('@/services/api', () => ({ default: api }));

const nodes: CanvasNode[] = [
  { id: 'ada', type: 'entityGraph', position: { x: 10, y: 20 }, data: { entityName: 'Ada Rivers', entityType: 'PERSON' }, style: { width: 135, height: 65 } },
  { id: 'museum', type: 'entityGraph', position: { x: 240, y: 20 }, data: { entityName: 'City Museum', entityType: 'ORG' } },
  { id: 'berlin', type: 'entityGraph', position: { x: 300, y: 100 }, data: { entityName: 'Berlin', entityType: 'location' } },
  { id: 'cover', type: 'image', position: { x: 10, y: 140 }, data: { src: '/resources/24/view' } },
];
const board: CanvasData = {
  nodes, edges: [
    { id: 'seed', source: 'museum', target: 'berlin', type: 'smoothstep',
      data: { arrow: false, dashed: false, color: '#94a3b8' }, sourceHandle: 'right', targetHandle: 'left' },
  ],
  viewport: { x: 10, y: 15, zoom: 1 },
};
let view: VueWrapper<InstanceType<typeof CanvasEditor>> | undefined;

async function openCanvas(data = board) {
  const target = { template: '<p>Source</p>' };
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/canvas/3', component: CanvasEditor }, { path: '/document/:id', component: target }, { path: '/resource/:id', component: target },
  ] });
  await router.push('/canvas/3');
  view = mount(CanvasEditor, { props: { canvasData: null, pendingTool: null },
    global: { plugins: [router, createPinia()] }, attachTo: document.body });
  await view.setProps({ canvasData: structuredClone(data) });
  await waitFor(() => expect(view!.findComponent(VueFlow).exists()).toBe(true));
  const flow = view.getComponent(VueFlow).vm.$.exposed as VueFlowStore;
  await waitFor(() => expect(flow.findNode(nodes[0].id)).toBeTruthy());
  return { flow, wrapper: view, router };
}

function lastUpdate() {
  return view!.emitted<[CanvasData]>('canvas-change')?.at(-1)?.[0];
}

beforeEach(() => {
  vi.resetAllMocks();
  api.delete.mockResolvedValue({ data: {} });
});

afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.restoreAllMocks();
});

describe('canvas editor state and toolbar', () => {
  it('preserves node sizes and renders approved edge settings through the persisted graph', async () => {
    const { flow } = await openCanvas();
    flow.addSelectedEdges([flow.findEdge('seed')!]);
    await fireEvent.click(await screen.findByTitle('Curved line'));
    await fireEvent.click(screen.getByTitle('Toggle dashed'));
    await fireEvent.click(screen.getByTitle('Toggle arrow'));
    await fireEvent.click(screen.getByTitle('Line color'));
    const red = await waitFor(() => {
      const color = [...document.querySelectorAll<HTMLButtonElement>('button[style]')].find((button) =>
        ['#ef4444', 'rgb(239, 68, 68)'].includes(button.style.backgroundColor),
      );
      expect(color).toBeTruthy();
      return color!;
    });
    await fireEvent.click(red);
    expect(lastUpdate()?.edges).toEqual([expect.objectContaining({
      id: 'seed', source: 'museum', target: 'berlin', type: 'default',
      data: { arrow: true, dashed: true, color: '#ef4444' },
    })]);
    expect(lastUpdate()?.nodes[0].style).toMatchObject({ width: 135, height: 65 });
    expect(flow.findEdge('seed')?.markerEnd).toMatchObject({ color: '#ef4444' });
    await fireEvent.click(screen.getByTitle('Delete'));
    await waitFor(() => expect(flow.findEdge('seed')).toBeUndefined());
    expect(lastUpdate()?.nodes).toHaveLength(4);
  });

  it('duplicates the chosen entity without copying unrelated nodes or edges', async () => {
    const { flow } = await openCanvas();
    const node = flow.findNode('ada')!;
    flow.addSelectedNodes([node]);
    await fireEvent.click(await screen.findByTitle('Duplicate'));
    expect(lastUpdate()?.nodes).toHaveLength(5);
    expect(lastUpdate()?.nodes.at(-1)).toMatchObject({
      type: 'entityGraph', position: { x: node.position.x + 30, y: node.position.y + 30 }, data: nodes[0].data,
    });
    expect(lastUpdate()?.nodes.at(-1)?.id).not.toBe('ada');
    expect(lastUpdate()?.edges).toHaveLength(1);
  });

  it('draws source-related directed edges and skips previously linked or absent entities', async () => {
    const { flow } = await openCanvas();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    api.get.mockResolvedValue({ data: { relationships: [
      { source: 'Ada Rivers', target: 'city museum', predicate: 'collaborated_with' },
      { source: 'Berlin', target: 'Ada Rivers', predicate: 'hosted' },
      { source: 'City Museum', target: 'Ada Rivers', predicate: 'cites' },
      { source: 'Ada Rivers', target: 'not on the canvas', predicate: 'met' },
      { source: 'Berlin', target: 'City Museum', predicate: 'locates' },
      { source: 'Ada Rivers', target: 'Ada Rivers', predicate: 'identity' },
    ] } });
    flow.addSelectedNodes([flow.findNode('ada')!]);
    const draw = await screen.findByTitle('Draw relationships with other entities on canvas');
    await fireEvent.click(draw);
    expect(api.get).toHaveBeenCalledWith('/relationships/neighborhood?names=Ada%20Rivers,City%20Museum,Berlin');
    await waitFor(() => expect(lastUpdate()?.edges).toHaveLength(3));
    expect(lastUpdate()?.edges).toContainEqual(expect.objectContaining({
      source: 'ada', target: 'museum', label: 'collaborated with', data: { arrow: true, color: '#6366f1' },
    }));
    expect(lastUpdate()?.edges).toContainEqual(expect.objectContaining({ source: 'berlin', target: 'ada', label: 'hosted' }));
    await fireEvent.click(draw);
    expect(lastUpdate()?.edges).toHaveLength(3);
  });

  it('ignores Delete while typing and removes the selected image and its attached resource from the board', async () => {
    const { flow } = await openCanvas();
    flow.addSelectedNodes([flow.findNode('cover')!]);
    const input = document.createElement('input');
    document.body.append(input);
    try {
      await fireEvent.keyDown(input, { key: 'Delete' });
      expect(api.delete).not.toHaveBeenCalled();
      expect(flow.findNode('cover')).toBeTruthy();
    } finally {
      input.remove();
    }
    await fireEvent.keyDown(document.body, { key: 'Delete' });
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/resources/24');
    await waitFor(() => expect(flow.findNode('cover')).toBeUndefined());
    expect(lastUpdate()?.edges).toHaveLength(1);
  });
});

describe('canvas node appearance', () => {
  async function selectNode(node: CanvasNode) {
    const { flow, wrapper } = await openCanvas({ ...board, nodes: [...nodes, node] });
    flow.addSelectedNodes([flow.findNode(node.id)!]);
    await screen.findByTitle('Color');
    return wrapper.get(`[data-id="${node.id}"]`);
  }

  async function paletteButton(color: string) {
    return waitFor(() => {
      const button = [...document.querySelectorAll<HTMLButtonElement>('button[style]')]
        .find((candidate) => candidate.style.backgroundColor.toLowerCase() === color.toLowerCase());
      expect(button).toBeTruthy();
      return button!;
    });
  }

  it('cycles radius, border width and line styles and applies colors to a rectangle', async () => {
    const shape = await selectNode({
      id: 'shape', type: 'shape', position: { x: 50, y: 50 },
      data: { label: 'Review', shape: 'rectangle' }, style: { width: 120, height: 90 },
    });
    expect(shape.text()).toContain('Review');
    const rectangle = shape.get('rect');
    expect(rectangle.attributes('rx')).toBe('4');

    for (const [title, radius] of [['Radius: 0', '8'], ['Radius: 8', '16'], ['Radius: 16', '45'], ['Radius: 999', '0']]) {
      await fireEvent.click(screen.getByTitle(title));
      expect(rectangle.attributes('rx')).toBe(radius);
    }

    await fireEvent.click(screen.getByTitle('Width: 1.5'));
    expect(rectangle.attributes('stroke-width')).toBe('2.5');
    await fireEvent.click(screen.getByTitle('Border: solid'));
    expect(rectangle.attributes('stroke-dasharray')).toBe('6 4');
    await fireEvent.click(screen.getByTitle('Border: dashed'));
    expect(rectangle.attributes('stroke-dasharray')).toBe('2 3');
    await fireEvent.click(screen.getByTitle('Border: dotted'));
    expect(rectangle.attributes('stroke-width')).toBe('0');
    await fireEvent.click(screen.getByTitle('Border: none'));
    expect(rectangle.attributes('stroke-width')).toBe('2.5');

    await fireEvent.click(screen.getByTitle('Border color'));
    await fireEvent.click(await paletteButton('#EF4444'));
    expect(rectangle.attributes('stroke')).toBe('#EF4444');
    await fireEvent.click(screen.getByTitle('Color'));
    await fireEvent.click(await paletteButton('#DCFCE7'));
    expect(rectangle.attributes('fill')).toBe('#DCFCE7');
  });

  it.each([
    ['rounded-rectangle', 'rect'],
    ['circle', 'ellipse'],
    ['diamond', 'polygon'],
    ['triangle', 'polygon'],
    ['parallelogram', 'polygon'],
    ['cylinder', 'g > ellipse'],
    ['hexagon', 'polygon'],
    ['star', 'polygon'],
    ['arrow-right', 'polygon'],
  ] as const)('renders a %s with its chosen fill', async (shape, element) => {
    const node = await selectNode({
      id: 'diagram', type: 'shape', position: { x: 0, y: 0 }, data: { shape, color: '#f0eeee' },
    });
    expect(node.get(element).attributes('fill')).toBe('#f0eeee');
    expect(screen.queryByTitle(/^Radius:/)).toBeNull();
  });

  it('updates horizontal alignment, vertical alignment and font size in the text node', async () => {
    await selectNode({
      id: 'text', type: 'text', position: { x: 0, y: 0 }, data: { content: 'Research finding' },
    });

    for (const [button, key, value] of [
      ['Align center', 'align', 'center'],
      ['Align right', 'align', 'right'],
      ['Align left', 'align', 'left'],
      ['Align middle', 'valign', 'middle'],
      ['Align bottom', 'valign', 'bottom'],
      ['Align top', 'valign', 'top'],
      ['Medium text', 'fontSize', 'base'],
      ['Large text', 'fontSize', 'lg'],
      ['Small text', 'fontSize', 'sm'],
    ] as const) {
      await fireEvent.click(screen.getByTitle(button));
      expect(screen.getByTitle(button).classList.contains('bg-accent-subtle')).toBe(true);
      const flow = view!.getComponent(VueFlow).vm.$.exposed as VueFlowStore;
      expect(flow.findNode('text')?.data[key]).toBe(value);
    }
  });

  it.each([
    ['card', 'accent', '#10B981'],
    ['bubble', 'color', '#FED7AA'],
  ] as const)('applies the %s palette to its appropriate property', async (type, property, color) => {
    await selectNode({ id: 'colored', type, position: { x: 0, y: 0 }, data: { title: 'Research' } });
    await fireEvent.click(screen.getByTitle('Color'));
    await paletteButton(color);
    await fireEvent.click(screen.getByTitle('Color'));
    expect(document.querySelector(`button[style*="${color}"]`)).toBeNull();

    await fireEvent.click(screen.getByTitle('Color'));
    await fireEvent.click(await paletteButton(color));
    const flow = view!.getComponent(VueFlow).vm.$.exposed as VueFlowStore;
    expect(flow.findNode('colored')?.data[property]).toBe(color);
  });
});

describe('editing canvas nodes inline', () => {
  it.each([
    ['text', 'Note to check', 'Text node content'],
    ['bubble', 'Remember the date', 'Speech bubble text'],
  ] as const)('updates the text displayed in a %s node', async (type, original, label) => {
    const { flow } = await openCanvas({
      ...board, nodes: [...nodes, { id: type, type, position: { x: 100, y: 80 }, data: { text: original, fontSize: 'lg', bold: true } }],
    });
    await fireEvent.dblClick(await screen.findByText(original));
    const edit = screen.getByLabelText(label) as HTMLTextAreaElement;
    expect(edit.value).toBe(original);
    await fireEvent.update(edit, 'Check the new date');
    await fireEvent.keyDown(edit, { key: 'Escape' });
    expect(screen.getByText('Check the new date')).toBeTruthy();
    await waitFor(() => expect(flow.findNode(type)?.data.text).toBe('Check the new date'));
  });

  it('edits a card title and subtitle independently', async () => {
    const { flow } = await openCanvas({
      ...board, nodes: [...nodes, { id: 'index-card', type: 'card', position: { x: 100, y: 80 }, data: { title: 'Accession', subtitle: 'Spring 1926' } }],
    });
    await fireEvent.dblClick(await screen.findByText('Accession'));
    const title = screen.getByLabelText('Card title');
    await fireEvent.update(title, 'Accession index');
    await fireEvent.keyDown(title, { key: 'Enter' });
    await fireEvent.dblClick(screen.getByText('Spring 1926'));
    const subtitle = screen.getByLabelText('Card subtitle');
    await fireEvent.update(subtitle, 'Summer 1927');
    await fireEvent.blur(subtitle);
    expect(screen.getByText('Accession index')).toBeTruthy();
    expect(screen.getByText('Summer 1927')).toBeTruthy();
    expect(flow.findNode('index-card')?.data).toMatchObject({
      title: 'Accession index', subtitle: 'Summer 1927',
    });
  });

  it.each([
    ['docRef', 'Document reference text', { docId: 16 }, '/document/16'],
    ['resourceRef', 'Resource reference text', { resourceId: 31 }, '/resource/31'],
  ] as const)('renames a %s label and still points to its original source', async (type, label, link, destination) => {
    const { router, flow } = await openCanvas({
      ...board, nodes: [...nodes, { id: type, type, position: { x: 100, y: 80 },
        data: { ...link, title: 'Selected passage', sourceName: 'Original source' } }],
    });
    await fireEvent.dblClick(await screen.findByText('Selected passage'));
    const input = screen.getByLabelText(label);
    await fireEvent.update(input, 'Archival passage');
    await fireEvent.blur(input);
    expect(screen.getByText('Archival passage')).toBeTruthy();
    await waitFor(() => expect(flow.findNode(type)?.data)
      .toEqual({ ...link, title: 'Archival passage', sourceName: 'Original source' }));
    await fireEvent.click(screen.getByTitle('Original source'));
    await waitFor(() => expect(router.currentRoute.value.path).toBe(destination));
  });
});
