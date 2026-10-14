import apiClient from '../api';
import { useApiRequest } from '../../composables/useApiRequest';

// NOTE: complements useDatasets.ts (pending consolidation). Unlike
// useDatasets.resolveLinks, this rethrows so callers keep control on failure.

export const useDatasetLinks = () => {
    const { isLoading, error, request } = useApiRequest();

    const resolveDatasetLinks = (
        datasetId: number | string,
        values: (string | number)[],
        lookupField?: string,
    ): Promise<Record<string, any>> =>
        request('Failed to resolve links', async () =>
            (await apiClient.post(`/datasets/${datasetId}/resolve-links`, {
                values,
                lookupField,
            })).data);

    return {
        isLoading,
        error,
        resolveDatasetLinks,
    };
};
