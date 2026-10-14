import apiClient from '../api';
import { useApiRequest } from '../../composables/useApiRequest';

// NOTE: complements useUsers.ts (pending consolidation).

export const useUserAvatar = () => {
    const { isLoading, error, request } = useApiRequest();

    const fetchUserAvatar = (userId: number | string): Promise<Blob> =>
        request('Failed to fetch avatar', async () => {
            const { data } = await apiClient.get(`/users/${userId}/avatar`, {
                responseType: 'blob',
            });
            return data;
        });

    return {
        isLoading,
        error,
        fetchUserAvatar,
    };
};
