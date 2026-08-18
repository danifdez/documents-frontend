import { ref } from 'vue';
import apiClient from '../api';

// NOTE: complements useLookup.ts (pending consolidation). Plain natural
// search, without the RAG/socket merge that useLookup performs.

export const useSearch = () => {
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const search = async (term: string, projectId?: number | string): Promise<any[]> => {
        isLoading.value = true;
        error.value = null;

        try {
            const payload: Record<string, any> = { term };
            if (projectId !== undefined) payload.projectId = projectId;
            const response = await apiClient.post('/search', payload);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Search failed';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        isLoading,
        error,
        search,
    };
};
