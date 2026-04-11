import { ref } from 'vue';
import apiClient from '../api';

export interface DatasetField {
    key: string;
    name: string;
    type: 'text' | 'number' | 'boolean' | 'date' | 'datetime' | 'time' | 'select';
    required: boolean;
    options?: string[];
    linkedDatasetId?: number;
    linkedLookupField?: string;
    linkedDisplayField?: string;
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
    createdAt: string;
    updatedAt: string;
}

export interface DatasetRecord {
    id: number;
    data: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

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

export interface CrossTabResult {
    field1: string; field1Name: string;
    field2: string; field2Name: string;
    chi2: number; pValue: number; dof: number;
    table: { rows: string[]; cols: string[]; values: number[][] };
}

export interface StatsResult {
    datasetId: number;
    recordCount: number;
    fieldCount: number;
    descriptive: Record<string, FieldStats>;
    correlation: CorrelationResult | null;
    crossTabs: CrossTabResult[] | null;
    error?: string;
}

export interface DatasetChart {
    id: number;
    name: string;
    config: Record<string, any>;
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

    // --- Datasets ---

    const getAllDatasets = async (projectId?: number): Promise<Dataset[]> => {
        isLoading.value = true;
        error.value = null;
        try {
            const params = projectId ? { projectId } : {};
            const response = await apiClient.get('/datasets', { params });
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to load datasets';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const getDataset = async (id: number): Promise<Dataset> => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get(`/datasets/${id}`);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to load dataset';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const createDataset = async (data: { name: string; description?: string; projectId?: number; schema: DatasetField[] }): Promise<Dataset> => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.post('/datasets', data);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to create dataset';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const updateDataset = async (id: number, data: { name?: string; description?: string; projectId?: number; schema?: DatasetField[] }): Promise<Dataset> => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.patch(`/datasets/${id}`, data);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to update dataset';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const deleteDataset = async (id: number): Promise<void> => {
        isLoading.value = true;
        error.value = null;
        try {
            await apiClient.delete(`/datasets/${id}`);
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to delete dataset';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const requestStats = async (datasetId: number, operation: string = 'summary', params: Record<string, any> = {}): Promise<{ jobId: number; message: string }> => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.post(`/datasets/${datasetId}/stats`, { operation, params });
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to request stats';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const getStatsResult = async (datasetId: number, jobId: number): Promise<{ status: string; result: StatsResult | null }> => {
        error.value = null;
        try {
            const response = await apiClient.get(`/datasets/${datasetId}/stats/${jobId}`);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to get stats result';
            throw err;
        }
    };

    const analyzeSchemaChange = async (id: number, schema: DatasetField[]): Promise<SchemaAnalysis> => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.post(`/datasets/${id}/analyze-schema`, { schema });
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to analyze schema changes';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // --- Records ---

    const getRecords = async (datasetId: number, params: Record<string, any> = {}): Promise<{ records: DatasetRecord[]; total: number }> => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get(`/datasets/${datasetId}/records`, { params });
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to load records';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const resolveLinks = async (datasetId: number, values: (string | number)[], lookupField?: string): Promise<Record<string, any>> => {
        if (!values.length) return {};
        try {
            const response = await apiClient.post(`/datasets/${datasetId}/resolve-links`, { values, lookupField });
            return response.data;
        } catch {
            return {};
        }
    };

    const createRecord = async (datasetId: number, data: Record<string, any>): Promise<DatasetRecord> => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.post(`/datasets/${datasetId}/records`, { data });
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to create record';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const updateRecord = async (datasetId: number, recordId: number, data: Record<string, any>): Promise<DatasetRecord> => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.patch(`/datasets/${datasetId}/records/${recordId}`, { data });
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to update record';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const deleteRecord = async (datasetId: number, recordId: number): Promise<void> => {
        isLoading.value = true;
        error.value = null;
        try {
            await apiClient.delete(`/datasets/${datasetId}/records/${recordId}`);
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to delete record';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const getLinkedRecords = async (datasetId: number, recordId: number): Promise<RecordLink[]> => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get(`/datasets/${datasetId}/records/${recordId}/links`);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to load linked records';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // --- Aggregation ---

    const aggregate = async (datasetId: number, field: string, fn: string, groupBy?: string): Promise<AggregateResult[]> => {
        isLoading.value = true;
        error.value = null;
        try {
            const params: Record<string, string> = { field, fn };
            if (groupBy) params.groupBy = groupBy;
            const response = await apiClient.get(`/datasets/${datasetId}/aggregate`, { params });
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to aggregate data';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // --- CSV Import ---

    const uploadCsvPreview = async (datasetId: number, file: File): Promise<CsvPreview> => {
        isLoading.value = true;
        error.value = null;
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await apiClient.post(`/datasets/${datasetId}/import`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to parse CSV';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const confirmCsvImport = async (datasetId: number, file: File, mappings: { csvColumn: string; fieldKey: string }[], skipFirstRow: boolean = true): Promise<ImportResult> => {
        isLoading.value = true;
        error.value = null;
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('mappings', JSON.stringify(mappings));
            formData.append('skipFirstRow', String(skipFirstRow));
            const response = await apiClient.post(`/datasets/${datasetId}/import/confirm`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to import CSV';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const importFromFile = async (file: File, name?: string, projectId?: number): Promise<ImportFromFileResult> => {
        isLoading.value = true;
        error.value = null;
        try {
            const formData = new FormData();
            formData.append('file', file);
            if (name) formData.append('name', name);
            if (projectId) formData.append('projectId', String(projectId));
            const response = await apiClient.post('/datasets/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to import file';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const createFromTable = async (data: {
        name: string; headers: string[]; rows: string[][]; projectId?: number;
    }): Promise<ImportFromFileResult> => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.post('/datasets/from-table', data);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to create dataset from table';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // --- Export CSV ---

    const exportDatasetCsv = async (id: number): Promise<void> => {
        try {
            const response = await apiClient.get(`/datasets/${id}/export`, { responseType: 'blob' });
            const disposition = response.headers['content-disposition'] || '';
            const filenameMatch = disposition.match(/filename="?(.+?)"?$/);
            const filename = filenameMatch ? filenameMatch[1] : 'dataset.csv';
            const url = URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to export CSV';
            throw err;
        }
    };

    // --- Bulk Delete ---

    const bulkDeleteRecords = async (datasetId: number, recordIds: number[]): Promise<{ deleted: number }> => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.delete(`/datasets/${datasetId}/records/bulk`, { data: { recordIds } });
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to delete records';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    // --- Saved Charts ---

    const getSavedCharts = async (datasetId: number): Promise<DatasetChart[]> => {
        try {
            const response = await apiClient.get(`/datasets/${datasetId}/charts`);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to load charts';
            throw err;
        }
    };

    const saveChart = async (datasetId: number, name: string, config: Record<string, any>): Promise<DatasetChart> => {
        try {
            const response = await apiClient.post(`/datasets/${datasetId}/charts`, { name, config });
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to save chart';
            throw err;
        }
    };

    const updateSavedChart = async (chartId: number, data: { name?: string; config?: Record<string, any> }): Promise<DatasetChart> => {
        try {
            const response = await apiClient.patch(`/datasets/charts/${chartId}`, data);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to update chart';
            throw err;
        }
    };

    const deleteSavedChart = async (chartId: number): Promise<void> => {
        try {
            await apiClient.delete(`/datasets/charts/${chartId}`);
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to delete chart';
            throw err;
        }
    };

    // --- Relations ---

    const getRelations = async (datasetId: number): Promise<DatasetRelation[]> => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get(`/datasets/${datasetId}/relations`);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to load relations';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const createRelation = async (data: { sourceDatasetId: number; targetDatasetId: number; relationType: string; name?: string }): Promise<DatasetRelation> => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.post('/datasets/relations', data);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to create relation';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const deleteRelation = async (relationId: number): Promise<void> => {
        isLoading.value = true;
        error.value = null;
        try {
            await apiClient.delete(`/datasets/relations/${relationId}`);
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to delete relation';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const linkRecords = async (relationId: number, sourceRecordId: number, targetRecordId: number): Promise<any> => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.post(`/datasets/relations/${relationId}/links`, { sourceRecordId, targetRecordId });
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to link records';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const unlinkRecords = async (relationId: number, linkId: number): Promise<void> => {
        isLoading.value = true;
        error.value = null;
        try {
            await apiClient.delete(`/datasets/relations/${relationId}/links/${linkId}`);
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to unlink records';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        isLoading,
        error,
        getAllDatasets,
        getDataset,
        createDataset,
        updateDataset,
        analyzeSchemaChange,
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
