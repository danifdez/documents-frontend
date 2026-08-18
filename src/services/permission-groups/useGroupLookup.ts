import { ref } from 'vue';
import apiClient from '../api';
import type { PermissionGroup } from './usePermissionGroups';

// NOTE: complements usePermissionGroups.ts (pending consolidation).

export const useGroupLookup = () => {
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const fetchGroup = async (id: number | string): Promise<PermissionGroup> => {
        isLoading.value = true;
        error.value = null;

        try {
            const { data } = await apiClient.get<PermissionGroup>(`/groups/${id}`);
            return data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to fetch group';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        isLoading,
        error,
        fetchGroup,
    };
};
