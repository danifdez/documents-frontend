import { ref } from 'vue';
import apiClient from '../api';

export const useMarkDelete = () => {
    const isLoading = ref(false);
    const error = ref<Error | null>(null);

    const deleteMark = async (markId: string): Promise<void> => {
        isLoading.value = true;
        error.value = null;

        try {
            await apiClient.delete(`/marks/${markId}`);
        } catch (e) {
            error.value = e as Error;
            throw e;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        deleteMark,
        isLoading,
        error
    };
};
