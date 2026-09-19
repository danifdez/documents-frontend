import { ref } from 'vue';
import apiClient from '../api';

export const useReadingPointDelete = () => {
    const isLoading = ref(false);
    const error = ref<Error | null>(null);

    const deleteReadingPoint = async (pointId: string | number): Promise<void> => {
        isLoading.value = true;
        error.value = null;

        try {
            await apiClient.delete(`/reading-points/${pointId}`);
        } catch (e) {
            error.value = e as Error;
            throw e;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        deleteReadingPoint,
        isLoading,
        error,
    };
};
