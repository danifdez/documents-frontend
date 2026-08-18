import { ref } from 'vue';
import apiClient from '../api';

// NOTE: complements useUsers.ts (pending consolidation).

export const useUserAvatar = () => {
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const fetchUserAvatar = async (userId: number | string): Promise<Blob> => {
        isLoading.value = true;
        error.value = null;

        try {
            const { data } = await apiClient.get(`/users/${userId}/avatar`, {
                responseType: 'blob',
            });
            return data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to fetch avatar';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        isLoading,
        error,
        fetchUserAvatar,
    };
};
