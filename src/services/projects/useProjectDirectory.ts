import { ref } from 'vue';
import apiClient from '../api';

// NOTE: complements useProject.ts / useProjectList.ts (pending consolidation).
// Unlike those, these helpers return data and rethrow errors so callers keep control.

export const useProjectDirectory = () => {
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

    const fetchProjects = (): Promise<any[]> =>
        request('Failed to fetch projects', async () => (await apiClient.get('/projects')).data);

    const fetchProject = (id: string | number): Promise<any> =>
        request('Failed to fetch project', async () => (await apiClient.get(`/projects/${id}`)).data);

    return {
        isLoading,
        error,
        fetchProjects,
        fetchProject,
    };
};
