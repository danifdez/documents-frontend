import apiClient from '../api';
import { useElectronApi } from '../../composables/useElectronApi';

export function useModelJobs() {
    const { getLanguage } = useElectronApi();

    const summarizeResource = async (resourceId: number): Promise<void> => {
        await apiClient.post('/model/summarize', {
            targetLanguage: await getLanguage(),
            resourceId,
        });
    };

    const translateResource = async (resourceId: number): Promise<void> => {
        await apiClient.post('/model/translate', {
            resourceId,
            targetLanguage: await getLanguage(),
        });
    };

    const extractKeyPoints = async (resourceId: number): Promise<void> => {
        await apiClient.post('/model/key-points', {
            resourceId,
            targetLanguage: await getLanguage(),
        });
    };

    const extractKeywords = async (resourceId: number): Promise<void> => {
        await apiClient.post('/model/keywords', {
            resourceId,
            targetLanguage: await getLanguage(),
        });
    };

    const extractEntities = async (resourceId: number): Promise<void> => {
        await apiClient.post('/model/extract-entities', { resourceId });
    };

    const summarizeSelection = async (params: {
        text: string;
        sourceLanguage: string;
        targetLanguage: string;
        targetDocId: number;
    }): Promise<void> => {
        await apiClient.post('/model/summarize', { ...params, type: 'workspace-selection' });
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
