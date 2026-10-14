import apiClient from '../api';
import { useApiRequest } from '../../composables/useApiRequest';

// NOTE: complements useLookup.ts (pending consolidation). Plain natural
// search, without the RAG/socket merge that useLookup performs.

export const useSearch = () => {
    const { isLoading, error, request } = useApiRequest();

    const search = (term: string, projectId?: number | string): Promise<any[]> =>
        request('Search failed', async () => {
            const payload: Record<string, any> = { term };
            if (projectId !== undefined) payload.projectId = projectId;
            return (await apiClient.post('/search', payload)).data;
        });

    return {
        isLoading,
        error,
        search,
    };
};
