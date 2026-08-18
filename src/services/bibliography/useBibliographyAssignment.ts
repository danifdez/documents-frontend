import { ref } from 'vue';
import apiClient from '../api';

// NOTE: complements useBibliography.ts (pending consolidation).

export const useBibliographyAssignment = () => {
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

    const makeEntryGlobal = (id: number): Promise<any> =>
        request('Failed to make entry global', async () =>
            (await apiClient.patch(`/bibliography/${id}/make-global`)).data);

    const assignEntryToProject = (id: number, projectId: string | number): Promise<any> =>
        request('Failed to assign entry to project', async () =>
            (await apiClient.patch(`/bibliography/${id}/assign-project`, { projectId })).data);

    return {
        isLoading,
        error,
        makeEntryGlobal,
        assignEntryToProject,
    };
};
