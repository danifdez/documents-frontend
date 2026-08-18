import { ref } from 'vue';
import apiClient from '../api';

const detailEndpoints: Record<string, (refId: string | number) => string> = {
    resource: (refId) => `/resources/${refId}`,
    doc: (refId) => `/docs/${refId}`,
    mark: (refId) => `/marks/${refId}`,
    knowledge: (refId) => `/knowledge-entries/${refId}`,
};

export const useReferences = () => {
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const request = async <R>(failureMessage: string, run: () => Promise<R>): Promise<R> => {
        isLoading.value = true;
        error.value = null;

        try {
            return await run();
        } catch (err: any) {
            error.value = err.response?.data?.message || failureMessage;
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const searchReferences = (query: string, type?: string): Promise<any[]> =>
        request('Failed to search references', async () =>
            (await apiClient.get('/reference/search', {
                params: {
                    q: query,
                    ...(type ? { type } : {}),
                },
            })).data);

    const fetchReferenceDetail = (refType: string, refId: string | number): Promise<any | null> =>
        request('Failed to fetch reference detail', async () => {
            const endpoint = detailEndpoints[refType];
            if (!endpoint) return null;
            return (await apiClient.get(endpoint(refId))).data;
        });

    return {
        isLoading,
        error,
        searchReferences,
        fetchReferenceDetail,
    };
};
