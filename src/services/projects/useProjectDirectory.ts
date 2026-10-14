import apiClient from '../api';
import { useApiRequest } from '../../composables/useApiRequest';

// NOTE: complements useProject.ts / useProjectList.ts (pending consolidation).
// Unlike those, these helpers return data and rethrow errors so callers keep control.

export const useProjectDirectory = () => {
    const { isLoading, error, request } = useApiRequest();

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
