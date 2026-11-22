import { fireEvent, screen, waitFor, within } from '@testing-library/vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DatasetChartBuilder from '@/components/datasets/DatasetChartBuilder.vue';
import DatasetCorrelationMatrix from '@/components/datasets/DatasetCorrelationMatrix.vue';
import DatasetOutlierPanel from '@/components/datasets/DatasetOutlierPanel.vue';
import DatasetPivotTable from '@/components/datasets/DatasetPivotTable.vue';
import DatasetStatsPanel from '@/components/datasets/DatasetStatsPanel.vue';
import type { DatasetChart, DatasetField, PivotTableData, StatsResult } from '@/services/datasets/useDatasets';

const chart = vi.hoisted(() => ({ config: vi.fn(), destroy: vi.fn() }));
vi.mock('chart.js', () => ({
  registerables: [],
  Chart: class Chart {
    static register() {}
    constructor(context: unknown, config: object) { chart.config(context, config); }
    destroy = chart.destroy;
  },
}));

const schema: DatasetField[] = [
  { key: 'location', name: 'Location', type: 'text', required: true },
  { key: 'category', name: 'Category', type: 'text', required: false },
  { key: 'year', name: 'Year', type: 'date', required: false },
  { key: 'pages', name: 'Pages', type: 'number', required: false },
  { key: 'price', name: 'Price', type: 'number', required: false },
  { key: 'weight', name: 'Weight', type: 'number', required: false },
];
const saved: DatasetChart = {
  id: 15, name: 'Pages by category', createdAt: '2026-01-01', updatedAt: '2026-01-01',
  config: { chartType: 'bar', visualMode: 'chart-bar', xField: 'category', yField: 'pages',
    sortBy: 'label', sortOrder: 'asc', aggregation: 'sum', limit: 8 },
};
const series: StatsResult = {
  operation: 'time-series', chartType: 'line', title: 'Pages over time', fieldName: 'Pages',
  chartData: { labels: ['2026-01', '2026-02'], values: [15, 19] },
  tableData: { labels: ['2026-01', '2026-02'], values: [15, 19] },
};
const btn = (name: string | RegExp) => screen.getByRole('button', { name });
const field = (name: string | RegExp) => screen.getByRole('combobox', { name });
const lastChart = () => chart.config.mock.lastCall?.[1];
const png = 'data:image/png;base64,AA==';
let wrapper: VueWrapper | undefined;

function captureDownloads() {
  const downloads: { filename: string; url: string }[] = [];
  const files: Blob[] = [];
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    files.push(blob as Blob);
    return `blob:test-${files.length}`;
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ filename: this.download, url: this.href });
  });
  return { downloads, files, revoke };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    fillRect: vi.fn(), fillText: vi.fn(), save: vi.fn(), translate: vi.fn(), rotate: vi.fn(),
    restore: vi.fn(), strokeRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(png);
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.restoreAllMocks();
});

describe('dataset chart configuration', () => {
  it('requires two numeric fields for scatter and emits the selected field keys', async () => {
    const view = mount(DatasetChartBuilder, { props: { schema, datasetId: 27, result: null, running: false }, attachTo: document.body });
    wrapper = view;
    await fireEvent.click(btn('Scatter'));
    const x = field(/X Axis/);
    expect(within(x).queryByRole('option', { name: /Location/ })).toBeNull();
    await fireEvent.update(x, 'pages');
    expect((btn('Generate Chart') as HTMLButtonElement).disabled).toBe(true);
    const y = field(/Y Axis/);
    await fireEvent.update(y, 'price');
    await fireEvent.click(btn('Generate Chart'));
    expect(view.emitted('run')).toEqual([['chart', {
      chartType: 'scatter', xField: 'pages', yField: 'price',
    }]]);
  });

  it('renders scatter axes and exports the plotted points as PNG and CSV', async () => {
    const downloads = captureDownloads();
    const view = mount(DatasetChartBuilder, {
      props: { schema, datasetId: 27, result: null, running: true }, attachTo: document.body,
    });
    wrapper = view;
    expect(screen.getByText('Generating chart...')).toBeTruthy();

    await view.setProps({
      running: false,
      result: { chartType: 'scatter', title: 'Price by page count', xLabel: 'Pages', yLabel: 'Price',
        chartData: { points: [{ x: 15, y: 9 }, { x: 25, y: 16 }] },
        tableData: { columns: ['Pages', 'Price'], rows: [[15, 9], [25, 16]] },
        stats: { sampleSize: 2, correlation: 0.9864 },
      },
    });
    await waitFor(() => expect(lastChart()).toMatchObject({
      type: 'scatter',
      data: { datasets: [{ label: 'Price by page count', data: [{ x: 15, y: 9 }, { x: 25, y: 16 }] }] },
      options: { scales: { x: { title: { text: 'Pages' } }, y: { title: { text: 'Price' } } } },
    }));

    await fireEvent.click(btn('PNG'));
    await fireEvent.click(btn('CSV'));
    expect(downloads.downloads).toEqual([
      { filename: expect.stringMatching(/^chart-\d+\.png$/), url: png },
      { filename: expect.stringMatching(/^chart-data-\d+\.csv$/), url: 'blob:test-1' },
    ]);
    expect(await downloads.files[0].text()).toBe('Pages,Price\n"15","9"\n"25","16"\n');
    expect(downloads.revoke).toHaveBeenCalledWith('blob:test-1');
    await view.setProps({ result: { error: 'This chart has no matching records' } });
    expect(screen.getByText('This chart has no matching records')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'PNG' })).toBeNull();
  });

  it('restores a saved chart and regenerates it with its original aggregation and order', async () => {
    const view = mount(DatasetChartBuilder, {
      props: { schema, datasetId: 27, result: null, running: false, savedCharts: [saved] }, attachTo: document.body,
    });
    wrapper = view;
    await fireEvent.click(btn(saved.name));
    expect(view.emitted('run')).toEqual([['chart', {
      chartType: 'bar', xField: 'category', yField: 'pages', aggregation: 'sum',
      sortBy: 'label', sortOrder: 'asc', limit: 8,
    }]]);

    await fireEvent.update(field(/Values \(numeric\)/), '');
    await fireEvent.click(btn('Generate Chart'));
    expect(view.emitted('run')?.[1]).toEqual(['chart', {
      chartType: 'bar', xField: 'category', aggregation: 'count', sortBy: 'label', sortOrder: 'asc', limit: 8,
    }]);
  });

  it.each([
    ['line', 'line', { tension: 0.3 }],
    ['pie', 'pie', { backgroundColor: ['hsla(0, 70%, 60%, 0.7)', 'hsla(180, 70%, 60%, 0.7)'] }],
    ['histogram', 'bar', { borderWidth: 1 }],
  ] as const)('renders %s results using the expected chart configuration', async (chartType, type, expected) => {
    wrapper = mount(DatasetChartBuilder, {
      props: {
        schema, datasetId: 27, running: false,
        result: { ...series, chartType, xLabel: 'Month', yLabel: 'Page count' },
      }, attachTo: document.body,
    });
    await waitFor(() => expect(lastChart()).toMatchObject({
      type, data: { labels: series.chartData?.labels, datasets: [{
        data: series.chartData?.values, label: 'Page count', ...expected,
      }] },
    }));
  });
});

describe('dataset statistics', () => {
  it('runs a time series and exports both the rendered chart and its source data', async () => {
    const downloads = captureDownloads();
    const view = mount(DatasetStatsPanel, {
      props: { schema, datasetId: 27, result: null, running: false }, attachTo: document.body,
    });
    wrapper = view;
    await fireEvent.click(btn('Time Series'));
    await fireEvent.update(field('Date field'), 'year');
    await fireEvent.update(field('Value field'), 'pages');
    await fireEvent.update(field('Period'), 'W');
    await fireEvent.click(btn('Run'));
    expect(view.emitted('run')).toEqual([['time-series', {
      fn: 'mean', period: 'W', chartType: 'bar', dateField: 'year', valueField: 'pages',
    }]]);
    await view.setProps({ result: series });
    await waitFor(() => expect(lastChart()).toMatchObject({
      type: 'line', data: { datasets: [{ label: 'Pages', data: [15, 19], tension: 0.3 }] },
    }));
    expect(screen.getByRole('rowheader', { name: '2026-01' })).toBeTruthy();
    await fireEvent.click(btn('Export PNG'));
    await fireEvent.click(btn('Export CSV'));
    expect(downloads.downloads).toEqual([
      { filename: 'stats_time-series.png', url: png },
      { filename: 'analysis_time-series.csv', url: 'blob:test-1' },
    ]);
    expect(await downloads.files[0].text()).toBe('Label,Value\n"2026-01",15\n"2026-02",19\n');
    expect(downloads.revoke).toHaveBeenCalledWith('blob:test-1');
  });

  it('renders field summaries with missing data and shows the next calculation error', async () => {
    const view = mount(DatasetStatsPanel, { props: {
      schema, running: false, result: {
        operation: 'summary', stats: { totalCount: 10, uniqueCount: 2 },
        tableData: { fields: [
          { field: 'pages', name: 'Pages', type: 'number', totalCount: 10, nullCount: 2, nonNullCount: 8,
            nullPercent: 20, mean: 14.5, std: 3, min: 2, max: 16 },
          { field: 'location', name: 'Location', type: 'text', totalCount: 10, nullCount: 0, nonNullCount: 10,
            uniqueCount: 2, topValue: 'Madrid' },
        ] },
      },
    }, attachTo: document.body });
    wrapper = view;
    expect(screen.getByRole('cell', { name: '20%' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: '14.5' })).toBeTruthy();
    expect(screen.getByText('top: Madrid')).toBeTruthy();
    await view.setProps({ result: { error: 'Calculation failed' } });
    expect(screen.getByText('Calculation failed')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('renders the regression as endpoints computed from its slope and intercept', async () => {
    wrapper = mount(DatasetStatsPanel, { props: {
      schema, running: false, selectedOperation: 'distribution',
      result: {
        operation: 'distribution', chartType: 'scatter', field1Name: 'Pages', field2Name: 'Price',
        chartData: { points: [{ x: 2, y: 7 }, { x: 4, y: 13 }], regression: { slope: 3, intercept: 1, xRange: [2, 4] } },
      },
    }, attachTo: document.body });
    await waitFor(() => expect(lastChart()).toMatchObject({
      type: 'scatter', data: { datasets: [
        { label: 'Pages vs Price', data: [{ x: 2, y: 7 }, { x: 4, y: 13 }] },
        { label: 'Regression', type: 'line', data: [{ x: 2, y: 7 }, { x: 4, y: 13 }] },
      ] },
    }));
  });
});

describe('advanced dataset analysis', () => {
  it('runs a pivot with the selected dimensions and renders its totals and stacked chart', async () => {
    const view = mount(DatasetPivotTable, {
      props: { schema, datasetId: 27, result: null, running: false }, attachTo: document.body,
    });
    wrapper = view;
    expect((btn('Generate') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.update(field('Row field *'), 'location');
    await fireEvent.update(field('Column field *'), 'category');
    await fireEvent.update(field('Value field'), 'pages');
    await fireEvent.update(field('Function'), 'sum');
    await fireEvent.click(btn('Generate'));
    expect(view.emitted('run')).toEqual([['pivot-table', {
      rowField: 'location', colField: 'category', valueField: 'pages', fn: 'sum',
    }]]);
    const tableData: PivotTableData = {
      rows: ['Madrid', 'Toledo'], cols: ['Books', 'Letters'],
      values: [[12, 5], [null, 9]], rowTotals: [17, 9], colTotals: [12, 14], grandTotal: 26,
    };
    const result: StatsResult = {
      operation: 'pivot-table', chartType: 'stacked_bar', rowFieldName: 'Location', colFieldName: 'Category',
      valueFieldName: 'Pages', fn: 'sum', tableData,
      chartData: { barLabels: ['Madrid', 'Toledo'], barDatasets: [
        { label: 'Books', data: [12, null], backgroundColor: '#4488aa' },
        { label: 'Letters', data: [5, 9], backgroundColor: '#aa4488' },
      ] },
    };
    await view.setProps({ result });
    expect(screen.getByRole('cell', { name: '26' })).toBeTruthy();
    expect(screen.getByRole('cell', { name: '—' })).toBeTruthy();
    await fireEvent.click(btn('Chart'));
    await waitFor(() => expect(lastChart()).toMatchObject({
      type: 'bar', data: { labels: result.chartData?.barLabels, datasets: result.chartData?.barDatasets },
      options: { scales: { x: { stacked: true }, y: { stacked: true } } },
    }));
  });

  it('renders positive, negative, null and zero correlations and requests scatter for an off-diagonal cell', async () => {
    const view = mount(DatasetCorrelationMatrix, {
      props: { schema, datasetId: 27, result: null, running: false }, attachTo: document.body,
    });
    wrapper = view;
    await fireEvent.click(btn('Deselect all'));
    expect((btn('Compute Matrix') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.click(btn('Select all'));
    await fireEvent.click(btn('Compute Matrix'));
    expect(view.emitted('run')).toEqual([['correlation-matrix', { fields: ['pages', 'price', 'weight'] }]]);

    const matrix: StatsResult = {
      operation: 'correlation-matrix', chartType: 'heatmap', chartData: {
        fields: [{ key: 'pages', name: 'Pages' }, { key: 'price', name: 'Price' }, { key: 'weight', name: 'Weight' }],
        matrix: [[1, -0.83, 0], [-0.83, 1, null], [0, null, 1]],
        pValues: [[0, 0.005, 0.8], [0.005, 0, null], [0.8, null, 0]],
      },
    };
    await view.setProps({ result: matrix });
    expect(screen.getAllByTitle('Insufficient data')).toHaveLength(2);
    const negative = within(screen.getAllByRole('row')[1]).getByText('-0.83');
    expect(negative.getAttribute('title')).toContain('significant');
    await fireEvent.click(negative);
    expect(view.emitted('run')?.[1]).toEqual(['correlation', { field1: 'pages', field2: 'price' }]);

    const exports = captureDownloads();
    await fireEvent.click(btn('Export CSV'));
    expect(exports.downloads[0].filename).toBe('correlation_matrix.csv');
    expect(await exports.files[0].text()).toContain('"Price",-0.8300,1.0000,\n');
  });

  it('separates outliers from typical values and exports the outlier rows', async () => {
    const output = captureDownloads();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const view = mount(DatasetOutlierPanel, {
      props: { schema, datasetId: 27, result: null, running: false }, attachTo: document.body,
    });
    wrapper = view;
    await fireEvent.update(field('Numeric field'), 'pages');
    await fireEvent.click(btn('Detect Outliers'));
    expect(view.emitted('run')).toEqual([['outliers', { field: 'pages' }]]);

    await view.setProps({ result: {
      operation: 'outliers', fieldName: 'Pages', stats: { outlierCount: 1 },
      chartData: {
        lowerFence: -1, upperFence: 20, q1: 6, median: 10, q3: 12,
        allPoints: [{ value: 10, isOutlier: false }, { value: 70, isOutlier: true }],
      },
      tableData: { columns: ['Location', 'Pages'], rows: [['Madrid', 70]] },
    } });
    await waitFor(() => expect(lastChart()).toMatchObject({
      type: 'scatter', data: { datasets: [
        { label: 'Normal', data: [{ x: 10, y: 1 }] },
        { label: 'Outlier', data: [{ x: 70, y: 1 }] },
        { label: 'IQR Box' },
        { label: 'Median' },
      ] },
    }));
    expect(screen.getByRole('cell', { name: 'Madrid' })).toBeTruthy();
    await fireEvent.click(btn('Export CSV'));
    expect(output.downloads[0].filename).toBe('outliers_pages.csv');
    expect(await output.files[0].text()).toBe('Location,Pages\n"Madrid","70"\n');
  });
});
