import type { ChartConfiguration } from 'chart.js';
import type { DatasetChartType, StatsResult } from './useDatasets';

type DatasetChartData = NonNullable<StatsResult['chartData']>;

function scatterConfiguration(data: DatasetChartData, label: string): ChartConfiguration | undefined {
    if (!data.points) return undefined;
    return {
        type: 'scatter',
        data: { datasets: [{
            label,
            data: data.points,
            backgroundColor: 'rgba(99, 102, 241, 0.5)',
            pointRadius: 4,
        }] },
    };
}

export function seriesConfiguration(
    chartType: DatasetChartType | undefined,
    data: DatasetChartData,
    label: string,
    colorDoughnut = false,
): ChartConfiguration | undefined {
    if (!chartType || chartType === 'none' || chartType === 'box' || chartType === 'heatmap' || chartType === 'stacked_bar') {
        return undefined;
    }
    if (!data.labels || !data.values) return undefined;

    const labels = data.labels;
    const coloredSlices = chartType === 'pie' || (colorDoughnut && chartType === 'doughnut');
    const backgroundColor = coloredSlices
        ? labels.map((_, index) => `hsla(${index * 360 / labels.length}, 70%, 60%, 0.7)`)
        : 'rgba(99, 102, 241, 0.6)';
    const lineStyle = chartType === 'line'
        ? { borderColor: 'rgba(99, 102, 241, 0.8)', borderWidth: 2, fill: false, tension: 0.3 }
        : { borderWidth: 1 };

    return {
        type: chartType === 'histogram' ? 'bar' : chartType,
        data: { labels, datasets: [{ label, data: data.values, backgroundColor, ...lineStyle }] },
    };
}

export function datasetChartConfiguration(result: StatsResult, colorDoughnut = false): ChartConfiguration | undefined {
    const { chartData, chartType, title, yLabel } = result;
    if (!chartData) return undefined;
    if (chartType === 'scatter' && chartData.points) return scatterConfiguration(chartData, title || 'Data');
    return seriesConfiguration(chartType, chartData, yLabel || title || 'Value', colorDoughnut);
}
