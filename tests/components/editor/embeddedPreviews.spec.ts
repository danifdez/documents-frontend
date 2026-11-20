import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CanvasViewNode from '@/components/editor/CanvasViewNode.vue';
import TimelineViewNode from '@/components/editor/TimelineViewNode.vue';
import type { CanvasData, CanvasNode, CanvasNodeData, CanvasNodeType } from '@/types/canvas';
import type { TimelineEpoch, TimelineEvent } from '@/types/timeline';

const { api } = vi.hoisted(() => ({ api: { get: vi.fn() } }));
vi.mock('@/services/api', () => ({ default: api }));

const png = 'data:image/png;base64,cHJldmlldw==';
const context2d = {
  fillText: vi.fn(), fillRect: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), beginPath: vi.fn(), closePath: vi.fn(),
  quadraticCurveTo: vi.fn(), stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(), setLineDash: vi.fn(), scale: vi.fn(),
  measureText: (label: string) => ({ width: label.length * 7 }),
};
const event = (id: string, date: string, title: string): TimelineEvent => ({ id, date, title, color: '#065f46' });
const epoch: TimelineEpoch = {
  id: 'early', name: 'Early records', startDate: '1910-01-01', endDate: '1920-12-31', color: '#dbeafe',
};
const events: TimelineEvent[] = [
  event('last', '1968-01-01', 'Archive opens'),
  { ...event('early', '1910-01-01', 'Original registers'), endDate: '1911-01-01', description: 'Documentation of the first acquisitions.' },
  event('second', '1912-03-02', 'Invoices collected'),
  event('third', '1914-07-03', 'Catalogue published'),
  ...Array.from({ length: 7 }, (_, i) => event('overlap-' + i, '1914-07-0' + (i + 1), 'Addendum ' + i)),
  event('penultimate', '1965-03-01', 'New building'),
];
const timelineProps = { timelineId: 5, timelineName: 'Archives', initialZoom: 1.2, initialPanX: 10, initialPanY: -15 };

function node(type: CanvasNodeType, id: string, x: number, data: CanvasNodeData = {}): CanvasNode {
  return { type, id, position: { x, y: (x % 30) * 5 }, data };
}

const board: CanvasData = {
  nodes: [
    node('shape', 'rect', 0, { label: 'Container', color: '#fafafa' }),
    node('shape', 'ellipse', 120, { shape: 'circle', label: 'Circle' }),
    { ...node('shape', 'diamond', 300, { shape: 'diamond', label: 'Branch' }), style: { width: 80, height: 40 } },
    node('text', 'text', 400, { text: '<em>Evidence</em> extracted from the archive' }),
    node('bubble', 'bubble', 520, { text: 'Review remarks' }),
    node('card', 'card', 640, { title: 'Transcription' }),
    node('entityGraph', 'entity', 760, { entityName: 'Dr. Rivers', entityType: 'Person' }),
    node('entityGraph', 'unknown', 770, { entityName: 'Special case', entityType: 'Unknown' }),
    node('docRef', 'doc', 880, { sourceName: 'Inventory' }),
    node('resourceRef', 'resource', 1000, { resourceName: 'Photograph' }),
    node('chart', 'chart', 1120, { chartName: 'Shipments' }),
    node('timeline', 'timeline', 1240, { timelineName: 'Chronology' }),
    node('image', 'image', 1360, { caption: 'Ledger' }),
  ],
  edges: [
    { id: 'related', source: 'rect', target: 'ellipse', data: { dashed: true, arrow: true, color: '#065f46' } },
    { id: 'self', source: 'diamond', target: 'diamond', data: { arrow: true } },
    { id: 'plain', source: 'text', target: 'card' },
  ],
  viewport: { x: 0, y: 0, zoom: 1 },
};

let activeEvents: TimelineEvent[];
let activeBoard: CanvasData | null;

beforeEach(() => {
  vi.resetAllMocks();
  activeEvents = events;
  activeBoard = board;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context2d as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(png);
  api.get.mockImplementation(async (url: string) => {
    if (url === '/timelines/5') return { data: { timelineData: activeEvents, epochs: [epoch] } };
    if (url === '/canvases/7') return { data: { canvasData: activeBoard } };
    throw new Error(`Unexpected GET ${url}`);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('embedded timeline preview', () => {
  it('plots events in chronological order with epoch bands, durations, and compressed gaps', async () => {
    render(TimelineViewNode, { props: timelineProps });
    const image = await screen.findByRole('img', { name: 'Timeline of Archives' });
    expect(image.getAttribute('src')).toBe(png);
    expect(image.style.transform).toBe('scale(1.2) translate(10px, -15px)');
    expect(screen.getByText(events.length + ' events')).toBeTruthy();
    expect(api.get).toHaveBeenCalledExactlyOnceWith('/timelines/5');
    const labels = context2d.fillText.mock.calls.map(([label]) => label);
    expect(labels).toContain(epoch.name);
    expect(labels).toContain('Documentation of th...');
    expect(labels.indexOf('Original registers')).toBeLessThan(labels.indexOf('Archive opens'));
    expect(labels).toContain('Addendum 6');
    expect(context2d.fillRect).toHaveBeenCalledWith(expect.any(Number), 198, 28, 24);
    expect(screen.getByTitle('Open timeline').getAttribute('href')).toBe('#/timeline/5');
  });

  it.each([
    { filterMode: 'epoch', epochId: 'early', name: 'Early records', count: 10, excluded: 'Archive opens' },
    { filterMode: 'range', dateFrom: '1964-01-01', dateTo: '1967-01-01', name: '1964-01-01 – 1967-01-01', count: 1, excluded: 'Original registers' },
  ])('includes only the events inside $name', async ({ name, count, excluded, ...filter }) => {
    render(TimelineViewNode, { props: { ...timelineProps, ...filter } });
    await screen.findByRole('img');
    expect(screen.getByText(name)).toBeTruthy();
    expect(screen.getByText(count === 1 ? '1 event' : count + ' events')).toBeTruthy();
    expect(context2d.fillText.mock.calls.flat()).not.toContain(excluded);
  });

  it('offers refresh after a loading error and handles a selection with no events', async () => {
    api.get.mockRejectedValueOnce({ response: { data: { message: 'Timeline offline' } } });
    render(TimelineViewNode, { props: { ...timelineProps, filterMode: 'range', dateFrom: '2000-01-01' } });
    expect(await screen.findByText('Timeline offline')).toBeTruthy();
    await fireEvent.click(screen.getByTitle('Refresh'));
    expect(await screen.findByText('No events found')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('2000-01-01 – ...')).toBeTruthy();
  });

  it('persists zoom and drag state and resets it to fit the view', async () => {
    const onViewChange = vi.fn();
    render(TimelineViewNode, { props: { ...timelineProps, onViewChange } });
    const image = await screen.findByRole('img');
    const viewport = image.parentElement!;
    await fireEvent.click(screen.getByTitle('Zoom in'));
    await waitFor(() => expect(onViewChange).toHaveBeenLastCalledWith({ zoom: 1.56, panX: 10, panY: -15 }));
    await fireEvent.mouseDown(viewport, { button: 0, clientX: 10, clientY: 10 });
    await fireEvent.mouseMove(document, { clientX: 35, clientY: 42 });
    await fireEvent.mouseUp(document);
    await waitFor(() => expect(onViewChange).toHaveBeenLastCalledWith({ zoom: 1.56, panX: 26.03, panY: 5.51 }));
    expect(image.style.transform).not.toBe('scale(1.56) translate(10px, -15px)');
    await fireEvent.click(screen.getByTitle('Fit to view'));
    await waitFor(() => expect(onViewChange).toHaveBeenLastCalledWith({ zoom: 1, panX: 0, panY: 0 }));
    expect(image.style.transform).toBe('scale(1) translate(0px, 0px)');
  });
});

describe('embedded canvas preview', () => {
  const props = { canvasId: 7, canvasName: 'Exhibit', initialZoom: 1 };
  it('renders SVG previews for shapes, entities, links and labelled references', async () => {
    const { container } = render(CanvasViewNode, { props });
    expect(await screen.findByText('13 nodes, 3 edges')).toBeTruthy();
    const preview = container.querySelector('.canvas-viewport > svg')!;
    expect(preview.querySelectorAll('g')).toHaveLength(13);
    expect(preview.querySelector('rect[fill="#fafafa"]')).toBeTruthy();
    expect(preview.querySelector('polygon[points="340,0 380,20 340,40 300,20"]')).toBeTruthy();
    expect(preview.querySelector('polygon[points="0,0 0,0 0,0"]')).toBeTruthy();
    expect(preview.querySelector('line[stroke-dasharray="6 4"]')?.getAttribute('stroke')).toBe('#065f46');
    expect(preview.querySelector('text[fill="#6366f1"]')?.textContent?.trim()).toBe('Dr. Rivers');
    expect(preview.querySelector('text[fill="#64748b"]')?.textContent?.trim()).toBe('Special case');
    for (const label of ['Evidence extracted from t...', 'Inventory', 'Photograph', 'Shipments', 'Chronology', 'Ledger']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByTitle('Open canvas').getAttribute('href')).toBe('#/canvas/7');
  });

  it('updates the preview coordinates while panning and zooming', async () => {
    const onViewChange = vi.fn();
    const { container } = render(CanvasViewNode, { props: { ...props, onViewChange } });
    await screen.findByText('13 nodes, 3 edges');
    const viewport = container.querySelector<HTMLElement>('.canvas-viewport')!;
    const preview = viewport.querySelector('svg')!;
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 600, 280));
    const initial = preview.getAttribute('viewBox');
    await fireEvent.wheel(viewport, { deltaY: -100 });
    expect(preview.getAttribute('viewBox')).not.toBe(initial);
    const zoomed = preview.getAttribute('viewBox');
    await fireEvent.mouseDown(viewport, { button: 0, clientX: 10, clientY: 10 });
    await fireEvent.mouseMove(document, { clientX: 35, clientY: 42 });
    await fireEvent.mouseUp(document);
    expect(preview.getAttribute('viewBox')).not.toBe(zoomed);
    await waitFor(() => expect(onViewChange).toHaveBeenLastCalledWith({
      zoom: expect.any(Number), panX: expect.any(Number), panY: expect.any(Number),
    }));
    await fireEvent.click(screen.getByTitle('Fit to view'));
    expect(preview.getAttribute('viewBox')).toBe(initial);
  });

  it('reports fetch failures and refreshes an empty canvas', async () => {
    api.get.mockRejectedValueOnce({ response: { data: { message: 'Canvas offline' } } });
    activeBoard = { ...board, nodes: [], edges: [] };
    render(CanvasViewNode, { props });
    expect(await screen.findByText('Canvas offline')).toBeTruthy();
    await fireEvent.click(screen.getByTitle('Refresh'));
    expect(await screen.findByText('Empty canvas')).toBeTruthy();
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });
});
