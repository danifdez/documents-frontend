import { ref } from 'vue';
import apiClient from '../api';

// NOTE: complements useDatasets.ts (pending consolidation). Unlike
// useDatasets.resolveLinks, this rethrows so callers keep control on failure.

export const useDatasetLinks = () => {
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const resolveDatasetLinks = async (
        datasetId: number | string,
        values: (string | number)[],
        lookupField?: string,
    ): Promise<Record<string, any>> => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiClient.post(`/datasets/${datasetId}/resolve-links`, {
                values,
                lookupField,
            });
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to resolve links';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        isLoading,
        error,
        resolveDatasetLinks,
    };
};
