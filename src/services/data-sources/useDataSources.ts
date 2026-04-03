import { ref } from 'vue';
import apiClient from '../api';

export interface DataSourceProvider {
    type: string;
    displayName: string;
    description: string;
    category: string;
    configSchema: Record<string, any>;
    credentialsSchema: Record<string, any> | null;
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

export interface DataSource {
    id: number;
    name: string;
    description: string | null;
    providerType: string;
    config: Record<string, any>;
    credentials: Record<string, any> | null;
    hasCredentials: boolean;
    schemaMapping: any[] | null;
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
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const getProviders = async (): Promise<DataSourceProvider[]> => {
        const response = await apiClient.get('/data-sources/providers');
        return response.data;
    };

    const getAllDataSources = async (projectId?: number): Promise<DataSource[]> => {
        isLoading.value = true;
        error.value = null;
        try {
            const params: Record<string, any> = {};
            if (projectId) params.projectId = projectId;
            const response = await apiClient.get('/data-sources', { params });
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to load data sources';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const getDataSource = async (id: number): Promise<DataSource> => {
        const response = await apiClient.get(`/data-sources/${id}`);
        return response.data;
    };

    const createDataSource = async (data: {
        name: string;
        description?: string;
        providerType: string;
        config: Record<string, any>;
        credentials?: Record<string, any>;
        schemaMapping?: any[];
        syncSchedule?: string;
        syncStrategy?: 'full' | 'incremental';
        incrementalKey?: string;
        projectId?: number;
        enabled?: boolean;
        rateLimitRpm?: number;
    }): Promise<DataSource> => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.post('/data-sources', data);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to create data source';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const updateDataSource = async (id: number, data: Record<string, any>): Promise<DataSource> => {
        const response = await apiClient.patch(`/data-sources/${id}`, data);
        return response.data;
    };

    const deleteDataSource = async (id: number): Promise<void> => {
        await apiClient.delete(`/data-sources/${id}`);
    };

    const testConnection = async (data: {
        providerType: string;
        config: Record<string, any>;
        credentials?: Record<string, any>;
    }): Promise<{ success: boolean; message: string; sampleData?: any[] }> => {
        const response = await apiClient.post('/data-sources/test', data);
        return response.data;
    };

    const triggerSync = async (id: number): Promise<DataSourceSyncLog> => {
        const response = await apiClient.post(`/data-sources/${id}/sync`);
        return response.data;
    };

    const getSyncLogs = async (id: number, limit = 20): Promise<DataSourceSyncLog[]> => {
        const response = await apiClient.get(`/data-sources/${id}/sync-logs`, { params: { limit } });
        return response.data;
    };

    const previewData = async (data: {
        providerType: string;
        config: Record<string, any>;
        credentials?: Record<string, any>;
    }): Promise<{ records: any[]; schema?: any[]; totalRecords: number; hasMore: boolean }> => {
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
