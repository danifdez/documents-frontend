import apiClient from '../api';
import { useApiRequest } from '../../composables/useApiRequest';

export const useProfile = () => {
    const { isLoading, error, request } = useApiRequest();

    const fetchMe = (): Promise<any> =>
        request('Failed to fetch profile', async () => (await apiClient.get('/auth/me')).data);

    const updateMe = (payload: Record<string, any>): Promise<any> =>
        request('Failed to update profile', async () => (await apiClient.patch('/auth/me', payload)).data);

    const uploadMyAvatar = (file: File): Promise<any> =>
        request('Failed to upload avatar', async () => {
            const fd = new FormData();
            fd.append('avatar', file);
            const response = await apiClient.post('/auth/me/avatar', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        });

    const removeMyAvatar = (): Promise<any> =>
        request('Failed to remove avatar', async () => (await apiClient.delete('/auth/me/avatar')).data);

    return {
        isLoading,
        error,
        fetchMe,
        updateMe,
        uploadMyAvatar,
        removeMyAvatar,
    };
};
