import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DatasetCorrelationMatrix from '@/components/datasets/DatasetCorrelationMatrix.vue';
import type { DatasetChart, DatasetField, StatsResult } from '@/services/datasets/useDatasets';

const { Chart, destroy } = vi.hoisted(() => {
  const destroy = vi.fn();
  return { destroy, Chart: Object.assign(vi.fn(function () { return { destroy }; }), { register: vi.fn() }) };
});
vi.mock('chart.js', () => ({ Chart, registerables: [] }));

const fields = [{ key: 'x', name: 'Age' }, { key: 'y', name: 'Height' }, { key: 'z', name: 'Weight' }];
const schema: DatasetField[] = [...fields.map((field) => ({ ...field, type: 'number' as const, required: false })), { key: 'name', name: 'Name', type: 'text', required: false }];
const matrix: StatsResult = {
  operation: 'correlation-matrix',
  chartData: { fields, matrix: [[1, -0.85, null], [-0.85, 1, 0], [null, 0, 1]],
    pValues: [[0, 0.023, null], [0.023, 0, 0.9], [null, 0.9, 0]] },
  stats: { strongCorrelations: [
    { field1: 'x', field2: 'y', field1Name: 'Age', field2Name: 'Height', correlation: -0.85, pValue: 0.023, strength: 'strong' },
  ] },
};
const saved: DatasetChart = { id: 75, name: 'Saved correlation', config: {}, createdAt: '', updatedAt: '' };
const button = (name: string) => screen.getByRole('button', { name });

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe('dataset correlations', () => {
  it('runs on numeric fields only, with a minimum of two, and emits saved view actions', async () => {
    const run = vi.fn();
    const loadSaved = vi.fn();
    const deleteSaved = vi.fn();
    render(DatasetCorrelationMatrix, { props: {
      schema, result: matrix, running: false, mode: 'sidebar', savedViews: [saved], onRun: run, onLoadSaved: loadSaved, onDeleteSaved: deleteSaved,
    } });

    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByText('Name')).toBeNull();
    await fireEvent.click(button('Deselect all'));
    expect((button('Compute Matrix') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.click(button('Select all'));
    await fireEvent.click(button('Compute Matrix'));
    expect(run).toHaveBeenCalledExactlyOnceWith('correlation-matrix', { fields: ['x', 'y', 'z'] });
    await fireEvent.click(button(saved.name));
    await fireEvent.click(button('Delete saved view'));
    expect(loadSaved).toHaveBeenCalledExactlyOnceWith(saved);
    expect(deleteSaved).toHaveBeenCalledExactlyOnceWith(saved.id);
  });

  it('explains significance and missing data and requests scatter details only for distinct fields', async () => {
    const run = vi.fn();
    const view = render(DatasetCorrelationMatrix, { props: { schema, result: matrix, running: false, mode: 'display', onRun: run } });
    expect(screen.queryByRole('button', { name: 'Compute Matrix' })).toBeNull();
    expect(screen.getByText('r=-0.85')).toBeTruthy();
    const diagonal = screen.getByTitle(/Age ↔ Age/);
    await fireEvent.click(diagonal);
    expect(run).not.toHaveBeenCalled();

    const cross = screen.getByTitle(/Age ↔ Height/);
    expect(cross.title).toContain('p = 0.0230 (significant)');
    expect(cross.textContent?.trim()).toBe('-0.85');
    expect(screen.getAllByTitle('Insufficient data')[0].textContent?.trim()).toBe('—');
    await fireEvent.click(cross);
    expect(run).toHaveBeenCalledExactlyOnceWith('correlation', { field1: 'x', field2: 'y' });

    await view.rerender({ result: { error: 'At least two records are required' } });
    expect(screen.getByText('At least two records are required')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('renders regression points and replaces the previous scatter chart when another pair is returned', async () => {
    const ctx = {} as CanvasRenderingContext2D;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
    const view = render(DatasetCorrelationMatrix, { props: { schema, result: matrix, running: false } });
    const scatter: StatsResult = {
      operation: 'correlation', field1Name: 'Age', field2Name: 'Height',
      chartData: { ...matrix.chartData, points: [{ x: 1, y: 4 }, { x: 3, y: 8 }], regression: { slope: 2, intercept: 2, xRange: [1, 3] } },
      stats: { correlation: 0.798, pValue: 0.008 },
    };
    await view.rerender({ result: scatter });
    await waitFor(() => expect(Chart).toHaveBeenCalledTimes(1));
    expect(screen.getByText('r=0.798, p=0.0080')).toBeTruthy();
    expect(Chart).toHaveBeenLastCalledWith(ctx, expect.objectContaining({
      type: 'scatter', data: { datasets: [
        expect.objectContaining({ label: 'Age vs Height', data: scatter.chartData?.points }),
        expect.objectContaining({ label: 'Regression', type: 'line', data: [{ x: 1, y: 4 }, { x: 3, y: 8 }] }),
      ] },
    }));
    await view.rerender({ result: { ...scatter, field2Name: 'Weight', chartData: { ...matrix.chartData, points: [{ x: 1, y: 6 }] } } });
    await waitFor(() => expect(Chart).toHaveBeenCalledTimes(2));
    expect(destroy).toHaveBeenCalledTimes(1);
    await fireEvent.click(button('Close scatter plot'));
    expect(screen.queryByText(/Age vs Weight/)).toBeNull();
    view.unmount();
    expect(destroy).toHaveBeenCalledTimes(2);
  });

  it('exports annotated rows to CSV and renders an image of the matrix with missing values', async () => {
    const save = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:matrix');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const canvasContext = { fillRect: vi.fn(), strokeRect: vi.fn(), fillText: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,aW1hZ2U=');
    render(DatasetCorrelationMatrix, { props: { schema, result: matrix, running: false } });

    await fireEvent.click(button('Export CSV'));
    const csv = create.mock.calls[0][0] as Blob;
    expect(csv.type).toBe('text/csv');
    expect(await csv.text()).toContain('"Age",1.0000,-0.8500,\n');
    expect((save.mock.contexts[0] as HTMLAnchorElement).download).toBe('correlation_matrix.csv');
    expect(revoke).toHaveBeenCalledWith('blob:matrix');

    await fireEvent.click(button('Export PNG'));
    expect((save.mock.contexts[1] as HTMLAnchorElement).download).toBe('correlation_matrix.png');
    expect(canvasContext.fillText).toHaveBeenCalledWith('—', expect.any(Number), expect.any(Number));
    expect(canvasContext.strokeRect).toHaveBeenCalledTimes(9);
  });
});
