import apiClient from '../api';
import { useApiRequest } from '../../composables/useApiRequest';
import type { PermissionGroup } from './usePermissionGroups';

// NOTE: complements usePermissionGroups.ts (pending consolidation).

export const useGroupLookup = () => {
    const { isLoading, error, request } = useApiRequest();

    const fetchGroup = (id: number | string): Promise<PermissionGroup> =>
        request('Failed to fetch group', async () => {
            const { data } = await apiClient.get<PermissionGroup>(`/groups/${id}`);
            return data;
        });

    return {
        isLoading,
        error,
        fetchGroup,
    };
};
