import { ref } from 'vue';
import apiClient from '../api';

export interface KnowledgeEntry {
    id: number;
    title: string;
    content: string | null;
    summary: string | null;
    tags: string[] | null;
    createdAt: string;
    updatedAt: string;
}

export function useKnowledgeBase() {
    const entries = ref<KnowledgeEntry[]>([]);
    const entry = ref<KnowledgeEntry | null>(null);
    const error = ref<string | null>(null);
    const isLoading = ref(false);

    const loadEntries = async (q?: string) => {
        isLoading.value = true;
        error.value = null;
        try {
            const params = q ? { q } : {};
            const response = await apiClient.get('/knowledge-entries', { params });
            entries.value = response.data;
            return response.data;
        } catch (err: any) {
            error.value = err?.message || 'Failed to load entries';
            entries.value = [];
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const loadEntry = async (id: number | string) => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get(`/knowledge-entries/${id}`);
            entry.value = response.data;
            return response.data;
        } catch (err: any) {
            error.value = err?.message || 'Failed to load entry';
            entry.value = null;
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const createEntry = async (data: Partial<KnowledgeEntry>) => {
        try {
            const response = await apiClient.post('/knowledge-entries', data);
            return response.data;
        } catch (err: any) {
            error.value = err?.message || 'Failed to create entry';
            throw err;
        }
    };

    const updateEntry = async (id: number | string, data: Partial<KnowledgeEntry>) => {
        try {
            const response = await apiClient.patch(`/knowledge-entries/${id}`, data);
            return response.data;
        } catch (err: any) {
            error.value = err?.message || 'Failed to update entry';
            throw err;
        }
    };

    const deleteEntry = async (id: number | string) => {
        try {
            const response = await apiClient.delete(`/knowledge-entries/${id}`);
            return response.data;
        } catch (err: any) {
            error.value = err?.message || 'Failed to delete entry';
            throw err;
        }
    };

    return {
        entries,
        entry,
        error,
        isLoading,
        loadEntries,
        loadEntry,
        createEntry,
        updateEntry,
        deleteEntry,
    };
}
