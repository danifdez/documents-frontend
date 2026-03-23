import { ref } from 'vue';
import apiClient from '../api';
import type { BibliographyEntry } from '../../types/Bibliography';

export function useBibliography() {
    const entries = ref<BibliographyEntry[]>([]);
    const error = ref(null);
    const isLoading = ref(false);

    const loadAll = async () => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get('/bibliography');
            entries.value = response.data;
            return response.data;
        } catch (err) {
            error.value = err;
            entries.value = [];
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const loadGlobal = async () => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get('/bibliography/global');
            entries.value = response.data;
            return response.data;
        } catch (err) {
            error.value = err;
            entries.value = [];
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const loadByProject = async (projectId: string | number) => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get(`/bibliography/project/${projectId}`);
            entries.value = response.data;
            return response.data;
        } catch (err) {
            error.value = err;
            entries.value = [];
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const createEntry = async (data: Partial<BibliographyEntry>) => {
        try {
            const response = await apiClient.post('/bibliography', data);
            return response.data as BibliographyEntry;
        } catch (err) {
            error.value = err;
            throw err;
        }
    };

    const updateEntry = async (id: number, data: Partial<BibliographyEntry>) => {
        try {
            const response = await apiClient.patch(`/bibliography/${id}`, data);
            return response.data as BibliographyEntry;
        } catch (err) {
            error.value = err;
            throw err;
        }
    };

    const deleteEntry = async (id: number) => {
        try {
            const response = await apiClient.delete(`/bibliography/${id}`);
            return response.data;
        } catch (err) {
            error.value = err;
            throw err;
        }
    };

    const importFromResource = async (resourceId: number, projectId?: number) => {
        try {
            const response = await apiClient.post(
                `/bibliography/import/resource/${resourceId}`,
                projectId != null ? { projectId } : {},
            );
            return response.data as BibliographyEntry;
        } catch (err) {
            error.value = err;
            throw err;
        }
    };

    const importBibTeX = async (bibtex: string, projectId?: number) => {
        try {
            const response = await apiClient.post('/bibliography/import/bibtex', {
                bibtex,
                projectId,
            });
            return response.data as BibliographyEntry[];
        } catch (err) {
            error.value = err;
            throw err;
        }
    };

    const exportBibTeX = async (projectId?: number, ids?: number[]) => {
        const params: Record<string, string> = {};
        if (projectId != null) params.projectId = String(projectId);
        if (ids && ids.length > 0) params.ids = ids.join(',');
        const response = await apiClient.get('/bibliography/export/bibtex', {
            params,
            responseType: 'text',
        });
        return response.data as string;
    };

    return {
        entries,
        error,
        isLoading,
        loadAll,
        loadGlobal,
        loadByProject,
        createEntry,
        updateEntry,
        deleteEntry,
        importFromResource,
        importBibTeX,
        exportBibTeX,
    };
}
