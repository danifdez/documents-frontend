import { ref } from 'vue';
import apiClient from '../api';

export const useProfile = () => {
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
