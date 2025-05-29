import { ref } from 'vue';
import apiClient from '../api';

export const useMarkUpdate = () => {
    const isLoading = ref(false);
    const error = ref<Error | null>(null);

    const updateMark = async (markId: string, content: string): Promise<any> => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiClient.patch(`/marks/${markId}`, {
                content
            });
            return response.data;
        } catch (e) {
            error.value = e as Error;
            throw e;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        updateMark,
        isLoading,
        error
    };
};
