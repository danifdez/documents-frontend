import { describe, expect, it, vi } from 'vitest';
import {
  buildGraphLayout, collectNodesWithinHops, computeFitTransform, drawGraph, findNodeAt,
  runSimulation, SIM_H, SIM_W, type GraphLayout, type SimNode,
} from '@/services/relationships/graphEngine';

const node = (id: number, x: number, y: number, name = `Node ${id}`, radius = 28): SimNode => ({
  id, x, y, name, radius, type: 'person', vx: 0, vy: 0,
});

describe('relationship graph layout', () => {
  it('places hubs first, preserves mixed identifiers and omits edges with unknown endpoints', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.25);
    try {
      const result = buildGraphLayout(
        [
          { id: 4, name: 'Isolated', type: '' },
          { id: 'hub', name: 'Central Archive Institution', type: 'organization' },
          { id: 1, name: 'City', type: 'place' },
          { id: 2, name: 'Note', type: 'document' },
        ],
        [
          { source: 'hub', target: 1, confidence: 0.7, predicate: 'located_in' },
          { source: 2, target: 'hub', confidence: 0, predicate: 'mentions' },
          { source: 'hub', target: 99, confidence: 1, predicate: 'missing' },
        ],
      );

      expect(result.nodes.map(({ id, type, radius }) => ({ id, type, radius }))).toEqual([
        { id: 'hub', type: 'organization', radius: 50 },
        { id: 1, type: 'place', radius: 28 },
        { id: 2, type: 'document', radius: 28 },
        { id: 4, type: 'default', radius: 28 },
      ]);
      expect(result.links).toEqual([
        { source: 0, target: 1, predicate: 'located_in', weight: 0.7 },
        { source: 2, target: 0, predicate: 'mentions', weight: 1 },
      ]);
      expect(result.nodes.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
      expect(new Set(result.nodes.map(({ x, y }) => `${x},${y}`)).size).toBe(4);
    } finally {
      random.mockRestore();
    }
  });

  it('handles empty layouts and keeps coincident nodes finite', () => {
    expect(buildGraphLayout([], [])).toEqual({ nodes: [], links: [] });
    const nodes = [node(1, SIM_W / 2, SIM_H / 2), node(2, SIM_W / 2, SIM_H / 2), node(3, 2, 30)];
    runSimulation(nodes, [{ source: 0, target: 1, predicate: 'has_part', weight: 1 }]);
    expect(nodes.slice(0, 2).every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
    expect(nodes[2].x).toBeGreaterThan(2);
    expect(nodes[2].y).toBeGreaterThan(30);
  });

  it('finds the topmost hit and fits the graph around its padded bounds', () => {
    const nodes = [node(1, 100, 40), node(2, 100, 40), node(3, 260, 160)];
    expect(findNodeAt(nodes, 128, 40)).toBe(nodes[1]);
    expect(findNodeAt(nodes, 129, 40)).toBeNull();

    const transform = computeFitTransform(nodes, 700, 470);
    expect(transform.zoom).toBeCloseTo(410 / 256);
    expect(180 * transform.zoom + transform.panX).toBeCloseTo(350);
    expect(100 * transform.zoom + transform.panY).toBeCloseTo(235);
    expect(computeFitTransform([nodes[0]], 1600, 1000).zoom).toBe(3);
  });

  it('walks incoming and outgoing edges without looping through cycles', () => {
    const links = [
      { source: 0, target: 1, predicate: 'related', weight: 1 },
      { source: 2, target: 1, predicate: 'related', weight: 1 },
      { source: 3, target: 2, predicate: 'related', weight: 1 },
      { source: 2, target: 0, predicate: 'related', weight: 1 },
    ];
    expect(collectNodesWithinHops(links, 1, 0)).toEqual(new Set([1]));
    expect(collectNodesWithinHops(links, 1, 1)).toEqual(new Set([1, 0, 2]));
    expect(collectNodesWithinHops(links, 1, 4)).toEqual(new Set([1, 0, 2, 3]));
    expect(collectNodesWithinHops(links, 4, 3)).toEqual(new Set([4]));
  });
});

describe('relationship graph rendering', () => {
  const graph: GraphLayout = {
    nodes: [node(0, 0, 0, 'Long name with several words', 15), node(1, 120, 0, 'Archive'), node(2, 250, 0, 'Note')],
    links: [
      { source: 0, target: 1, predicate: 'located_in', weight: 4 },
      { source: 1, target: 0, predicate: 'connected_by_a_long_relationship_name', weight: 1 },
      { source: 1, target: 2, predicate: 'mentions', weight: 1 },
    ],
  };

  it.each([
    { selected: null, focused: null, expectedAlpha: 1 },
    { selected: 0, focused: null, expectedAlpha: 0.15 },
    { selected: 0, focused: 0, expectedAlpha: 1 },
  ])('draws parallel links and applies selection/focus to label opacity ($selected, $focused)', ({
    selected, focused, expectedAlpha,
  }) => {
    const labels: { text: string; alpha: number }[] = [];
    const context = {
      globalAlpha: 1, scale: vi.fn(), clearRect: vi.fn(), save: vi.fn(), translate: vi.fn(),
      beginPath: vi.fn(), moveTo: vi.fn(), quadraticCurveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
      closePath: vi.fn(), fill: vi.fn(), arc: vi.fn(), restore: vi.fn(),
      measureText: (text: string) => ({ width: text.length * 6 }),
      fillText(text: string) { labels.push({ text, alpha: this.globalAlpha }); },
    };
    drawGraph(context as unknown as CanvasRenderingContext2D, graph.nodes, graph.links, {
      width: 700, height: 400, dpr: 2, zoom: 0.5, panX: 50, panY: 70,
      selectedNodeIdx: selected, focusedNodeIdx: focused, mutedColor: '#999999',
      getNodeColor: () => '#008888',
    });
    expect(context.scale.mock.calls).toEqual([[2, 2], [0.5, 0.5]]);
    expect(context.translate).toHaveBeenCalledWith(50, 70);
    expect(context.quadraticCurveTo).toHaveBeenCalledTimes(2);
    expect(context.arc).toHaveBeenCalledTimes(3);
    expect(labels).toEqual(expect.arrayContaining([
      { text: 'located in', alpha: 1 },
      { text: 'connected by a long rel…', alpha: 1 },
      { text: 'mentions', alpha: expectedAlpha },
      { text: 'Note', alpha: expectedAlpha },
      expect.objectContaining({ text: expect.stringMatching(/…$/) }),
    ]));
    expect(context.globalAlpha).toBe(1);
    expect(context.restore).toHaveBeenCalledOnce();
  });
});
