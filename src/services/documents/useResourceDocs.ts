import type { DocumentRecord } from './useDocument';
import apiClient from '../api';

export function useResourceDocs() {
    const fetchWorkspaceDocument = async (resourceId: string): Promise<DocumentRecord> => {
        const response = await apiClient.get(`/docs/resource/${resourceId}`);
        return response.data;
    };

    const createDocument = async (payload: Record<string, unknown>): Promise<DocumentRecord> => {
        const response = await apiClient.post('/docs', payload);
        return response.data;
    };

    const appendToDocument = async (docId: number, htmlFragment: string): Promise<void> => {
        const doc = await apiClient.get(`/docs/${docId}`);
        const existing = doc.data.content || '';
        await apiClient.patch(`/docs/${docId}`, { content: existing + htmlFragment });
    };

    return {
        fetchWorkspaceDocument,
        createDocument,
        appendToDocument,
    };
}
