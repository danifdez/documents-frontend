import type { ZoteroCreator } from '../../types/Bibliography';
import apiClient from '../api';
import { useApiRequest } from '../../composables/useApiRequest';

export interface ReferenceSearchResult {
    id: string;
    type: 'resource' | 'doc' | 'mark' | 'knowledge';
    name: string;
    content?: string;
    meta?: { creators?: ZoteroCreator[]; year?: string; journal?: string; entryType?: string };
}

export interface ReferenceDetail {
    name?: string;
    title?: string;
    author?: string;
    publicationDate?: string;
    type?: string;
    url?: string;
    project?: { name: string };
    content?: string;
    note?: string;
    resource?: { id: number; name?: string; title?: string };
    doc?: { id: number; name: string };
    summary?: string;
    tags?: string[];
}

const detailEndpoints: Record<string, (refId: string | number) => string> = {
    resource: (refId) => `/resources/${refId}`,
    doc: (refId) => `/docs/${refId}`,
    mark: (refId) => `/marks/${refId}`,
    knowledge: (refId) => `/knowledge-entries/${refId}`,
};

export const useReferences = () => {
    const { isLoading, error, request } = useApiRequest();

    const searchReferences = (query: string, type?: string): Promise<ReferenceSearchResult[]> =>
        request('Failed to search references', async () =>
            (await apiClient.get('/reference/search', {
                params: {
                    q: query,
                    ...(type ? { type } : {}),
                },
            })).data);

    const fetchReferenceDetail = (refType: string, refId: string | number): Promise<ReferenceDetail | null> =>
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
