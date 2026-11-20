import apiClient from '../api';
import { useApiRequest } from '../../composables/useApiRequest';

// NOTE: complements useLookup.ts (pending consolidation). Plain natural
// search, without the RAG/socket merge that useLookup performs.

export interface SearchResult {
    id: number | string;
    name: string;
    collection: string;
    score: number;
    highlightedName?: string;
    highlightedTitle?: string;
    highlightedContent?: string;
    metadata?: Record<string, unknown>;
}

export const useSearch = () => {
    const { isLoading, error, request } = useApiRequest();

    const search = (term: string, projectId?: number | string): Promise<SearchResult[]> =>
        request('Search failed', async () => {
            const payload = projectId === undefined ? { term } : { term, projectId };
            return (await apiClient.post('/search', payload)).data;
        });

    return {
        isLoading,
        error,
        search,
    };
};
