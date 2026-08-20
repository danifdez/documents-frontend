import apiClient from '../api';
import { useElectronApi } from '../../composables/useElectronApi';

export interface ExecutionCreated {
    executionId: string;
}

export function useModelExecutions() {
    const { getLanguage } = useElectronApi();

    const summarizeResource = async (resourceId: number): Promise<ExecutionCreated> => {
        const response = await apiClient.post<ExecutionCreated>('/model/summarize', {
            targetLanguage: await getLanguage(),
            resourceId,
        });
        return response.data;
    };

    const translateResource = async (resourceId: number): Promise<ExecutionCreated> => {
        const response = await apiClient.post<ExecutionCreated>('/model/translate', {
            resourceId,
            targetLanguage: await getLanguage(),
        });
        return response.data;
    };

    const extractKeyPoints = async (resourceId: number): Promise<ExecutionCreated> => {
        const response = await apiClient.post<ExecutionCreated>('/model/key-points', {
            resourceId,
            targetLanguage: await getLanguage(),
        });
        return response.data;
    };

    const extractKeywords = async (resourceId: number): Promise<ExecutionCreated> => {
        const response = await apiClient.post<ExecutionCreated>('/model/keywords', {
            resourceId,
            targetLanguage: await getLanguage(),
        });
        return response.data;
    };

    const extractEntities = async (resourceId: number): Promise<ExecutionCreated> => {
        const response = await apiClient.post<ExecutionCreated>('/model/extract-entities', { resourceId });
        return response.data;
    };

    const summarizeSelection = async (params: {
        text: string;
        sourceLanguage: string;
        targetLanguage: string;
        targetDocId: number;
    }): Promise<ExecutionCreated> => {
        const response = await apiClient.post<ExecutionCreated>('/model/summarize', { ...params, type: 'workspace-selection' });
        return response.data;
    };

    return {
        summarizeResource,
        translateResource,
        extractKeyPoints,
        extractKeywords,
        extractEntities,
        summarizeSelection,
    };
}
