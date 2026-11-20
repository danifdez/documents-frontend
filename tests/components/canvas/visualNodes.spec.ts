import { cleanup, fireEvent, render, screen } from '@testing-library/vue';
import { reactive } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CanvasChartNode from '@/components/canvas/nodes/ChartNode.vue';
import CanvasTimelineNode from '@/components/canvas/nodes/TimelineNode.vue';
import DatasetChartNode from '@/components/editor/DatasetChartNode.vue';
import type { CanvasNodeData } from '@/types/canvas';
import type { StatsResult } from '@/services/datasets/useDatasets';
import type { TimelineEvent } from '@/types/timeline';

const { api, createChart, destroy } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn() }, createChart: vi.fn(), destroy: vi.fn(),
}));
vi.mock('@/services/api', () => ({ default: api }));
vi.mock('@vue-flow/core', () => ({
  Handle: { template: '<i />' }, Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  useNode: () => ({ node }),
}));
vi.mock('@vue-flow/node-resizer', () => ({ NodeResizer: { template: '<i />' } }));
vi.mock('@/components/canvas/NodeFloatingToolbar.vue', () => ({ default: { template: '<i />' } }));
vi.mock('chart.js', () => ({
  registerables: [],
  Chart: class ChartMock {
    static register() {}
    constructor(ctx: object, config: object) { createChart(ctx, config); }
    destroy() { destroy(); }
  },
}));

const node = reactive<{ data: CanvasNodeData }>({ data: {} });
const png = 'data:image/png;base64,AA==';
const context = {
  fillText: vi.fn(), fillRect: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), beginPath: vi.fn(), closePath: vi.fn(),
  quadraticCurveTo: vi.fn(), stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(), setLineDash: vi.fn(), scale: vi.fn(),
  measureText: (text: string) => ({ width: text.length * 7 }),
};
const chartProps = { chartId: 41, chartName: 'Field productivity', datasetId: 6, datasetName: 'Catalogue' };
const savedChart = { id: 41, config: { chartType: 'scatter', xField: 'pages', yField: 'results' } };
const dateEvent = (id: string, title: string, date: string): TimelineEvent => ({ id, title, date, color: '#14663e' });
const timeline = {
  name: 'Acquisitions', epochs: [{ id: 'early', name: 'Founding records', startDate: '1910-01-01', endDate: '1910-07-10' }],
  timelineData: [
    dateEvent('late', 'Reopening', '1953-05-11'), dateEvent('recent', 'New gallery', '1953-05-20'),
    { ...dateEvent('first', 'Inventory opens', '1910-02-01'), endDate: '1910-02-04', description: 'First complete inventory.' },
    dateEvent('second', 'Public catalogue', '1910-03-15'), dateEvent('third', 'New classification', '1910-03-30'),
  ],
};
let status: string;
let result: StatsResult | null;

function canvasProps(data: CanvasNodeData) {
  node.data = data;
  return { id: 'visual', data: node.data, selected: false };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  node.data = {};
  status = 'completed';
  result = { chartType: 'scatter', title: 'Distribution', chartData: { points: [{ x: 12, y: 3 }] } };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(png);
  api.get.mockImplementation(async (url) => {
    if (url === '/timelines/11') return { data: timeline };
    if (url === '/datasets/6/charts') return { data: [savedChart] };
    if (url === '/datasets/6/stats/chart-render') return { data: { status, result } };
    throw new Error(`Unexpected GET ${url}`);
  });
  api.post.mockResolvedValue({ data: { executionId: 'chart-render' } });
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('canvas timeline node', () => {
  it('uses the linked timeline title and renders the chronological events with a clipped date band', async () => {
    render(CanvasTimelineNode, { props: canvasProps({ timelineId: 11, timelineName: 'Old title' }) });
    await vi.advanceTimersByTimeAsync(0);
    expect(screen.getByRole('img', { name: 'Timeline: Acquisitions' }).getAttribute('src')).toBe(png);
    expect(api.get).toHaveBeenCalledExactlyOnceWith('/timelines/11');
    const labels = context.fillText.mock.calls.map(([label]) => label);
    expect(labels).toContain('Founding records');
    expect(labels).toContain('New classification');
    expect(labels.indexOf('Inventory opens')).toBeLessThan(labels.indexOf('Reopening'));
    expect(context.setLineDash).toHaveBeenCalled();
  });

  it.each([
    { filterMode: 'epoch', epochId: 'early', keep: 'Inventory opens', omit: 'Reopening' },
    { filterMode: 'range', dateFrom: '1953-05-01', dateTo: '1953-05-15', keep: 'Reopening', omit: 'New gallery' },
  ])('renders the selected $filterMode only', async ({ keep, omit, ...filter }) => {
    render(CanvasTimelineNode, { props: canvasProps({ timelineId: 11, ...filter }) });
    await vi.advanceTimersByTimeAsync(0);
    expect(screen.getByRole('img')).toBeTruthy();
    const labels = context.fillText.mock.calls.map(([label]) => label);
    expect(labels).toContain(keep);
    expect(labels).not.toContain(omit);
  });

  it('shows an unavailable timeline, refreshes after an error, and reports an empty date range', async () => {
    render(CanvasTimelineNode, { props: canvasProps({}) });
    expect(screen.getByText('No timeline linked')).toBeTruthy();
    node.data.timelineId = 11;
    node.data.filterMode = 'range';
    node.data.dateFrom = '2026-01-01';
    api.get.mockRejectedValueOnce(new Error('Timeline unavailable'));
    await fireEvent.click(screen.getByTitle('Refresh'));
    await vi.advanceTimersByTimeAsync(0);
    expect(screen.getByText('Timeline unavailable')).toBeTruthy();
    await fireEvent.click(screen.getByTitle('Refresh'));
    await vi.advanceTimersByTimeAsync(0);
    expect(screen.getByText('No events')).toBeTruthy();
  });
});

describe('saved visualizations in the canvas and document editor', () => {
  it('loads a saved chart configuration and rasterizes its scatter data in the canvas', async () => {
    render(CanvasChartNode, { props: canvasProps(chartProps) });
    await vi.advanceTimersByTimeAsync(1600);
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/datasets/6/stats', { operation: 'chart', params: savedChart.config });
    expect(screen.getByRole('img', { name: 'Chart: Field productivity' }).getAttribute('src')).toBe(png);
    expect(createChart.mock.calls[0][1]).toMatchObject({
      type: 'scatter',
      data: { datasets: [{ label: 'Distribution', data: [{ x: 12, y: 3 }] }] },
      options: { responsive: false, animation: false },
    });
    expect(destroy).toHaveBeenCalledOnce();
  });

  it('supports a doughnut legend in the canvas and refreshes a failed execution', async () => {
    status = 'failed';
    render(CanvasChartNode, { props: canvasProps(chartProps) });
    await vi.advanceTimersByTimeAsync(1600);
    expect(screen.getByText('Chart generation failed')).toBeTruthy();
    expect(createChart).not.toHaveBeenCalled();
    status = 'processed';
    result = { chartType: 'doughnut', yLabel: 'Pages', chartData: { labels: ['Maps', 'Letters'], values: [3, 7] } };
    await fireEvent.click(screen.getByTitle('Refresh'));
    await vi.advanceTimersByTimeAsync(1600);
    expect(createChart.mock.calls[0][1]).toMatchObject({
      type: 'doughnut', data: { labels: ['Maps', 'Letters'], datasets: [{ label: 'Pages', data: [3, 7] }] },
      options: { plugins: { legend: { display: true, position: 'bottom' } } },
    });
    expect(screen.getByRole('img')).toBeTruthy();
  });

  it('provides a live chart in the document and disposes the previous chart when refreshed', async () => {
    const view = render(DatasetChartNode, { props: chartProps });
    await vi.advanceTimersByTimeAsync(1600);
    expect(createChart.mock.calls[0][1]).toMatchObject({
      type: 'scatter', options: { responsive: true, maintainAspectRatio: false },
    });
    result = { chartType: 'line', yLabel: 'Rows', chartData: { labels: ['January'], values: [3] } };
    await fireEvent.click(screen.getByTitle('Refresh'));
    await vi.advanceTimersByTimeAsync(1600);
    expect(createChart.mock.calls[1][1]).toMatchObject({
      type: 'line', data: { datasets: [{ label: 'Rows', tension: 0.3, fill: false }] },
    });
    expect(destroy).toHaveBeenCalledOnce();
    view.unmount();
    expect(destroy).toHaveBeenCalledTimes(2);
  });

  it('reports a missing saved chart in the canvas', async () => {
    api.get.mockResolvedValueOnce({ data: [] });
    render(CanvasChartNode, { props: canvasProps(chartProps) });
    await vi.advanceTimersByTimeAsync(0);
    expect(screen.getByText('Chart not found')).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('reports a timed-out analysis in the editor instead of rendering stale data', async () => {
    status = 'running';
    render(DatasetChartNode, { props: chartProps });
    await vi.advanceTimersByTimeAsync(31000);
    expect(screen.getByText('Timeout')).toBeTruthy();
    expect(createChart).not.toHaveBeenCalled();
  });
});
