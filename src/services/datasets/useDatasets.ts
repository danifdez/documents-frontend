import type { ChartType } from 'chart.js';
import { getResponseError } from '../../utils/errorDetails';
import { ref } from 'vue';
import apiClient from '../api';

export interface DatasetField {
    key: string;
    name: string;
    description?: string;
    type: 'text' | 'number' | 'boolean' | 'date' | 'datetime' | 'time' | 'select';
    required: boolean;
    options?: string[];
    linkedDatasetId?: number;
    linkedLookupField?: string;
    linkedDisplayField?: string;
}

export interface DatasetSourceConfig {
    resourceIds?: number[];
    resourceTypeFilter?: string[];
}

export type DatasetSourceMode = 'manual' | 'project_resources' | 'resource_selection';

export interface DatasetExtractionConfig {
    model: string;
    promptVersion: string;
    lastRunAt: string | null;
}

export interface DatasetDataSource {
    id: number;
    providerType: string;
    lastSyncAt: string | null;
    lastSyncStatus: 'success' | 'failed' | 'running' | null;
    enabled: boolean;
}

export interface Dataset {
    id: number;
    name: string;
    description: string | null;
    schema: DatasetField[];
    project: { id: number; name: string } | null;
    dataSources?: DatasetDataSource[];
    recordCount?: number;
    sourceMode: DatasetSourceMode;
    sourceConfig: DatasetSourceConfig;
    extractionConfig: DatasetExtractionConfig | null;
    createdAt: string;
    updatedAt: string;
}

export interface CellAnchor {
    sourceResourceId: number;
    page: number | null;
    quote: string;
    extractedAt: string;
    model: string;
    promptVersion: string;
    editedByUser: boolean;
}

export type ExtractionStatus = 'pending' | 'in_progress' | 'extracted' | 'failed';

export interface DatasetRecord {
    id: number;
    data: Record<string, unknown>;
    cellMetadata: Record<string, CellAnchor>;
    sourceResourceId: number | null;
    extractionStatus: ExtractionStatus;
    extractionError: string | null;
    createdAt: string;
    updatedAt: string;
}

export type DatasetLinkValues = Record<string, DatasetRecord['data']>;

export interface DatasetRelation {
    id: number;
    name: string | null;
    sourceDataset: Dataset;
    targetDataset: Dataset;
    relationType: string;
    createdAt: string;
}

export interface RecordLink {
    linkId: number;
    relation: { id: number; name: string | null; relationType: string };
    linkedRecord: DatasetRecord;
    linkedDataset: Dataset;
    direction: 'outgoing' | 'incoming';
}

export interface CsvPreview {
    headers: string[];
    previewRows: string[][];
    totalRows: number;
}

export interface ImportResult {
    imported: number;
    errors: { row: number; messages: string[] }[];
}

export interface ImportFromFileResult {
    dataset: Dataset;
    imported: number;
    errors: { row: number; messages: string[] }[];
}

export interface AggregateResult {
    group?: string;
    value: number;
}

export interface FieldStats {
    field: string;
    name: string;
    type: string;
    totalCount: number;
    nonNullCount: number;
    nullCount: number;
    mean?: number;
    median?: number;
    std?: number;
    min?: number;
    max?: number;
    q25?: number;
    q75?: number;
    variance?: number;
    skewness?: number;
    kurtosis?: number;
    histogram?: { counts: number[]; binEdges: number[] };
    outliers?: { count: number; lowerBound: number; upperBound: number; values: number[] };
    frequency?: { values: string[]; counts: number[] };
    uniqueCount?: number;
    textLengths?: { mean: number; min: number; max: number };
    dateRange?: { min: string; max: string };
    temporalDistribution?: { periods: string[]; counts: number[] };
}

export interface CorrelationResult {
    matrix: { fields: { key: string; name: string }[]; values: number[][] };
    pairs: { field1: string; field1Name: string; field2: string; field2Name: string; correlation: number; pValue: number; strength: string }[];
}


export type DatasetChartType = ChartType | 'histogram' | 'box' | 'none' | 'stacked_bar' | 'heatmap';

export interface DatasetAnalysisParameters extends Record<string, unknown> {
    field?: string;
    fields?: string[];
    dateField?: string;
    valueField?: string;
    period?: string;
    rowField?: string;
    colField?: string;
    fn?: string;
}

export interface DatasetChartConfig extends Record<string, unknown> {
    chartType?: DatasetChartType;
    visualMode?: string;
    xField?: string;
    yField?: string;
    aggregation?: string;
    sortBy?: string;
    sortOrder?: string;
    limit?: number;
    operation?: string;
    params?: DatasetAnalysisParameters;
}

interface DatasetChartData {
    labels?: string[];
    values?: (number | null)[];
    points?: { x: number; y: number }[];
    regression?: { slope: number; intercept: number; xRange: [number, number] };
    fields?: { key: string; name: string }[];
    matrix?: (number | null)[][];
    pValues?: (number | null)[][];
    allPoints?: { value: number; isOutlier: boolean }[];
    outliers?: number[];
    min?: number;
    max?: number;
    lowerFence?: number;
    upperFence?: number;
    q1?: number;
    q3?: number;
    median?: number;
    barLabels?: string[];
    barDatasets?: { label: string; data: (number | null)[]; backgroundColor: string }[];
}

type TableCell = string | number | boolean | null;

interface DatasetTableData {
    fields?: (FieldStats & { nullPercent?: number; topValue?: string })[];
    labels?: string[];
    values?: (number | null | (number | null)[])[];
    columns?: string[];
    rows?: (TableCell | TableCell[])[];
}

export interface PivotTableData extends DatasetTableData {
    cols: string[];
    rows: string[];
    values: (number | null)[][];
    rowTotals: (number | null)[];
    colTotals: (number | null)[];
    grandTotal: number | null;
}

export interface StatsResult {
    error?: string;
    operation?: string;
    chartType?: DatasetChartType;
    chartData?: DatasetChartData;
    tableData?: DatasetTableData;
    stats?: Record<string, unknown> & {
        correlation?: number;
        pValue?: number;
        strongCorrelations?: CorrelationResult['pairs'];
    };
    title?: string;
    xLabel?: string;
    yLabel?: string;
    fieldName?: string;
    field1Name?: string;
    field2Name?: string;
    rowFieldName?: string;
    colFieldName?: string;
    valueFieldName?: string;
    fn?: string;
}

export interface DatasetChart {
    id: number;
    name: string;
    config: DatasetChartConfig;
    createdAt: string;
    updatedAt: string;
}

export interface SchemaAnalysis {
    removedFields: { key: string; name: string; affectedRecords: number }[];
    typeChanges: { key: string; name: string; oldType: string; newType: string; incompatibleRecords: number }[];
    safe: boolean;
}

export const useDatasets = () => {
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const captureError = async <R>(failureMessage: string, run: () => Promise<R>): Promise<R> => {
        try {
            return await run();
        } catch (err: unknown) {
            error.value = getResponseError(err) || failureMessage;
            throw err;
        }
    };

    const withLoading = async <R>(failureMessage: string, run: () => Promise<R>): Promise<R> => {
        isLoading.value = true;
        error.value = null;
        try {
            return await captureError(failureMessage, run);
        } finally {
            isLoading.value = false;
        }
    };

    // --- Datasets ---

    const getAllDatasets = (projectId?: number): Promise<Dataset[]> =>
        withLoading('Failed to load datasets', async () => {
            const params = projectId ? { projectId } : {};
            const response = await apiClient.get('/datasets', { params });
            return response.data;
        });

    const getDataset = (id: number): Promise<Dataset> =>
        withLoading('Failed to load dataset', async () => (await apiClient.get(`/datasets/${id}`)).data);

    const createDataset = (data: { name: string; description?: string; projectId?: number; schema: DatasetField[]; sourceMode?: DatasetSourceMode; sourceConfig?: DatasetSourceConfig }): Promise<Dataset> =>
        withLoading('Failed to create dataset', async () => (await apiClient.post('/datasets', data)).data);

    const updateDataset = (id: number, data: { name?: string; description?: string; projectId?: number; schema?: DatasetField[]; sourceMode?: DatasetSourceMode; sourceConfig?: DatasetSourceConfig }): Promise<Dataset> =>
        withLoading('Failed to update dataset', async () => (await apiClient.patch(`/datasets/${id}`, data)).data);

    const deleteDataset = async (id: number): Promise<void> => {
        await withLoading('Failed to delete dataset', () => apiClient.delete(`/datasets/${id}`));
    };

    const requestStats = (datasetId: number, operation: string = 'summary', params: Record<string, unknown> = {}): Promise<{ executionId: string; message: string }> =>
        withLoading('Failed to request stats', async () => (await apiClient.post(`/datasets/${datasetId}/stats`, { operation, params })).data);

    const getStatsResult = async (datasetId: number, executionId: string): Promise<{ status: string; result: StatsResult | null }> => {
        error.value = null;
        return captureError('Failed to get stats result', async () => (await apiClient.get(`/datasets/${datasetId}/stats/${executionId}`)).data);
    };

    const extractAll = (datasetId: number): Promise<{ rowsQueued: number }> =>
        withLoading('Failed to start extraction', async () => (await apiClient.post(`/datasets/${datasetId}/extract`, {})).data);

    const reExtractRow = (
        datasetId: number,
        recordId: number,
        columnsToExtract?: string[],
    ): Promise<{ executionId: string | null }> =>
        captureError('Failed to re-extract row', async () => (await apiClient.post(
            `/datasets/${datasetId}/records/${recordId}/re-extract`,
            { columnsToExtract },
        )).data);

    const proposeColumns = async (
        resourceIds: number[],
        projectId?: number,
    ): Promise<{ executionId: string | null }> => {
        const response = await apiClient.post('/datasets/propose-columns', { resourceIds, projectId });
        return response.data;
    };

    const getProposeColumnsResult = async (
        executionId: string,
    ): Promise<{ status: string; result: { columns: DatasetField[] } | null }> => {
        const response = await apiClient.get(`/datasets/propose-columns/${executionId}`);
        return response.data;
    };

    const reExtractCell = (
        datasetId: number,
        recordId: number,
        fieldKey: string,
        force = false,
    ): Promise<{ executionId: string | null } | { requiresConfirmation: true; reason: string }> =>
        captureError('Failed to re-extract cell', async () => (await apiClient.post(
            `/datasets/${datasetId}/records/${recordId}/cells/${encodeURIComponent(fieldKey)}/re-extract`,
            { force },
        )).data);

    const analyzeSchemaChange = (id: number, schema: DatasetField[]): Promise<SchemaAnalysis> =>
        withLoading('Failed to analyze schema changes', async () => (await apiClient.post(`/datasets/${id}/analyze-schema`, { schema })).data);

    // --- Records ---

    const getRecords = (datasetId: number, params: Record<string, unknown> = {}): Promise<{ records: DatasetRecord[]; total: number }> =>
        withLoading('Failed to load records', async () => (await apiClient.get(`/datasets/${datasetId}/records`, { params })).data);

    const resolveLinks = async (datasetId: number, values: (string | number)[], lookupField?: string): Promise<DatasetLinkValues> => {
        if (!values.length) return {};
        try {
            const response = await apiClient.post(`/datasets/${datasetId}/resolve-links`, { values, lookupField });
            return response.data;
        } catch {
            return {};
        }
    };

    const createRecord = (datasetId: number, data: Record<string, unknown>): Promise<DatasetRecord> =>
        withLoading('Failed to create record', async () => (await apiClient.post(`/datasets/${datasetId}/records`, { data })).data);

    const updateRecord = (datasetId: number, recordId: number, data: Record<string, unknown>): Promise<DatasetRecord> =>
        withLoading('Failed to update record', async () => (await apiClient.patch(`/datasets/${datasetId}/records/${recordId}`, { data })).data);

    const deleteRecord = async (datasetId: number, recordId: number): Promise<void> => {
        await withLoading('Failed to delete record', () => apiClient.delete(`/datasets/${datasetId}/records/${recordId}`));
    };

    const getLinkedRecords = (datasetId: number, recordId: number): Promise<RecordLink[]> =>
        withLoading('Failed to load linked records', async () => (await apiClient.get(`/datasets/${datasetId}/records/${recordId}/links`)).data);

    // --- Aggregation ---

    const aggregate = (datasetId: number, field: string, fn: string, groupBy?: string): Promise<AggregateResult[]> =>
        withLoading('Failed to aggregate data', async () => {
            const params: Record<string, string> = { field, fn };
            if (groupBy) params.groupBy = groupBy;
            const response = await apiClient.get(`/datasets/${datasetId}/aggregate`, { params });
            return response.data;
        });

    // --- CSV Import ---

    const uploadCsvPreview = (datasetId: number, file: File): Promise<CsvPreview> =>
        withLoading('Failed to parse CSV', async () => {
            const formData = new FormData();
            formData.append('file', file);
            const response = await apiClient.post(`/datasets/${datasetId}/import`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        });

    const confirmCsvImport = (datasetId: number, file: File, mappings: { csvColumn: string; fieldKey: string }[], skipFirstRow: boolean = true): Promise<ImportResult> =>
        withLoading('Failed to import CSV', async () => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('mappings', JSON.stringify(mappings));
            formData.append('skipFirstRow', String(skipFirstRow));
            const response = await apiClient.post(`/datasets/${datasetId}/import/confirm`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        });

    const importFromFile = (file: File, name?: string, projectId?: number): Promise<ImportFromFileResult> =>
        withLoading('Failed to import file', async () => {
            const formData = new FormData();
            formData.append('file', file);
            if (name) formData.append('name', name);
            if (projectId) formData.append('projectId', String(projectId));
            const response = await apiClient.post('/datasets/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        });

    const createFromTable = (data: {
        name: string; headers: string[]; rows: string[][]; projectId?: number;
    }): Promise<ImportFromFileResult> =>
        withLoading('Failed to create dataset from table', async () => (await apiClient.post('/datasets/from-table', data)).data);

    // --- Export CSV ---

    const exportDatasetCsv = (id: number, includeAnchors = false): Promise<void> =>
        captureError('Failed to export CSV', async () => {
            const params = includeAnchors ? { include_anchors: 'true' } : {};
            const response = await apiClient.get(`/datasets/${id}/export`, { params, responseType: 'blob' });
            const disposition = response.headers['content-disposition'] || '';
            const filenameMatch = disposition.match(/filename="?(.+?)"?$/);
            const filename = filenameMatch ? filenameMatch[1] : 'dataset.csv';
            const url = URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        });

    // --- Bulk Delete ---

    const bulkDeleteRecords = (datasetId: number, recordIds: number[]): Promise<{ deleted: number }> =>
        withLoading('Failed to delete records', async () => (await apiClient.delete(`/datasets/${datasetId}/records/bulk`, { data: { recordIds } })).data);

    // --- Saved Charts ---

    const getSavedCharts = (datasetId: number): Promise<DatasetChart[]> =>
        captureError('Failed to load charts', async () => (await apiClient.get(`/datasets/${datasetId}/charts`)).data);

    const saveChart = (datasetId: number, name: string, config: DatasetChartConfig): Promise<DatasetChart> =>
        captureError('Failed to save chart', async () => (await apiClient.post(`/datasets/${datasetId}/charts`, { name, config })).data);

    const updateSavedChart = (chartId: number, data: { name?: string; config?: DatasetChartConfig }): Promise<DatasetChart> =>
        captureError('Failed to update chart', async () => (await apiClient.patch(`/datasets/charts/${chartId}`, data)).data);

    const deleteSavedChart = async (chartId: number): Promise<void> => {
        await captureError('Failed to delete chart', () => apiClient.delete(`/datasets/charts/${chartId}`));
    };

    // --- Relations ---

    const getRelations = (datasetId: number): Promise<DatasetRelation[]> =>
        withLoading('Failed to load relations', async () => (await apiClient.get(`/datasets/${datasetId}/relations`)).data);

    const createRelation = (data: { sourceDatasetId: number; targetDatasetId: number; relationType: string; name?: string }): Promise<DatasetRelation> =>
        withLoading('Failed to create relation', async () => (await apiClient.post('/datasets/relations', data)).data);

    const deleteRelation = async (relationId: number): Promise<void> => {
        await withLoading('Failed to delete relation', () => apiClient.delete(`/datasets/relations/${relationId}`));
    };

    const linkRecords = (relationId: number, sourceRecordId: number, targetRecordId: number): Promise<unknown> =>
        withLoading('Failed to link records', async () => (await apiClient.post(`/datasets/relations/${relationId}/links`, { sourceRecordId, targetRecordId })).data);

    const unlinkRecords = async (relationId: number, linkId: number): Promise<void> => {
        await withLoading('Failed to unlink records', () => apiClient.delete(`/datasets/relations/${relationId}/links/${linkId}`));
    };

    return {
        isLoading,
        error,
        getAllDatasets,
        getDataset,
        createDataset,
        updateDataset,
        analyzeSchemaChange,
        extractAll,
        reExtractRow,
        reExtractCell,
        proposeColumns,
        getProposeColumnsResult,
        requestStats,
        getStatsResult,
        deleteDataset,
        getRecords,
        resolveLinks,
        createRecord,
        updateRecord,
        deleteRecord,
        getLinkedRecords,
        aggregate,
        uploadCsvPreview,
        confirmCsvImport,
        importFromFile,
        createFromTable,
        exportDatasetCsv,
        bulkDeleteRecords,
        getSavedCharts,
        saveChart,
        updateSavedChart,
        deleteSavedChart,
        getRelations,
        createRelation,
        deleteRelation,
        linkRecords,
        unlinkRecords,
    };
};
