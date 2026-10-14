import apiClient from '../api';
import { useApiRequest } from '../../composables/useApiRequest';

// NOTE: complements useBibliography.ts (pending consolidation).

export const useBibliographyAssignment = () => {
    const { isLoading, error, request } = useApiRequest();

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
