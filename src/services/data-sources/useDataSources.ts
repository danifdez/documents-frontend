import apiClient from '../api';
import { useApiRequest } from '../../composables/useApiRequest';

export interface ProviderSchema {
    properties?: Record<string, { type?: string; title?: string; description?: string; enum?: string[]; default?: unknown }>;
    required?: string[];
}

export interface DataSourceProvider {
    type: string;
    displayName: string;
    description: string;
    category: string;
    configSchema: ProviderSchema;
    credentialsSchema: ProviderSchema | null;
    defaultIncrementalKey: string | null;
}

export interface DataSourceSyncLog {
    id: number;
    status: 'success' | 'failed' | 'partial' | 'running';
    startedAt: string;
    finishedAt: string | null;
    recordsFetched: number;
    recordsCreated: number;
    recordsUpdated: number;
    errorMessage: string | null;
}

export interface DataSourceSyncExecution {
    executionId: string;
}

export interface DataSource {
    id: number;
    name: string;
    description: string | null;
    providerType: string;
    config: Record<string, unknown>;
    credentials: Record<string, unknown> | null;
    hasCredentials: boolean;
    schemaMapping: unknown[] | null;
    syncSchedule: string | null;
    syncStrategy: 'full' | 'incremental';
    incrementalKey: string | null;
    lastSyncAt: string | null;
    lastSyncStatus: 'success' | 'failed' | 'running' | null;
    lastSyncError: string | null;
    lastSyncRecordCount: number | null;
    dataset: { id: number; name: string } | null;
    project: { id: number; name: string } | null;
    enabled: boolean;
    rateLimitRpm: number | null;
    createdAt: string;
    updatedAt: string;
}

export function useDataSources() {
    const { isLoading, error, request } = useApiRequest();

    const getProviders = async (): Promise<DataSourceProvider[]> => {
        const response = await apiClient.get('/data-sources/providers');
        return response.data;
    };

    const getAllDataSources = (projectId?: number): Promise<DataSource[]> =>
        request('Failed to load data sources', async () => {
            const params: Record<string, unknown> = {};
            if (projectId) params.projectId = projectId;
            return (await apiClient.get('/data-sources', { params })).data;
        });

    const getDataSource = async (id: number): Promise<DataSource> => {
        const response = await apiClient.get(`/data-sources/${id}`);
        return response.data;
    };

    const createDataSource = (data: {
        name: string;
        description?: string;
        providerType: string;
        config: Record<string, unknown>;
        credentials?: Record<string, unknown>;
        schemaMapping?: unknown[];
        syncSchedule?: string;
        syncStrategy?: 'full' | 'incremental';
        incrementalKey?: string;
        projectId?: number;
        enabled?: boolean;
        rateLimitRpm?: number;
    }): Promise<DataSource> =>
        request('Failed to create data source', async () =>
            (await apiClient.post('/data-sources', data)).data);

    const updateDataSource = async (id: number, data: Record<string, unknown>): Promise<DataSource> => {
        const response = await apiClient.patch(`/data-sources/${id}`, data);
        return response.data;
    };

    const deleteDataSource = async (id: number): Promise<void> => {
        await apiClient.delete(`/data-sources/${id}`);
    };

    const testConnection = async (data: {
        providerType: string;
        config: Record<string, unknown>;
        credentials?: Record<string, unknown>;
    }): Promise<{ success: boolean; message: string; sampleData?: Record<string, unknown>[] }> => {
        const response = await apiClient.post('/data-sources/test', data);
        return response.data;
    };

    const triggerSync = async (id: number): Promise<DataSourceSyncExecution> => {
        const response = await apiClient.post(`/data-sources/${id}/sync`);
        return response.data;
    };

    const getSyncLogs = async (id: number, limit = 20): Promise<DataSourceSyncLog[]> => {
        const response = await apiClient.get(`/data-sources/${id}/sync-logs`, { params: { limit } });
        return response.data;
    };

    const previewData = async (data: {
        providerType: string;
        config: Record<string, unknown>;
        credentials?: Record<string, unknown>;
    }): Promise<{ records: unknown[]; schema?: unknown[]; totalRecords: number; hasMore: boolean }> => {
        const response = await apiClient.post('/data-sources/preview', data);
        return response.data;
    };

    return {
        isLoading,
        error,
        getProviders,
        getAllDataSources,
        getDataSource,
        createDataSource,
        updateDataSource,
        deleteDataSource,
        testConnection,
        triggerSync,
        getSyncLogs,
        previewData,
    };
}
