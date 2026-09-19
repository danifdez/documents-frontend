import { ref } from 'vue';
import apiClient from '../api';
import type { ReadingPointAnchor } from './useReadingPoints';

export const useReadingPointUpdate = () => {
    const isLoading = ref(false);
    const error = ref<Error | null>(null);

    const updateReadingPoint = async (
        pointId: string | number,
        data: { label?: string } & ReadingPointAnchor,
    ): Promise<any> => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiClient.patch(`/reading-points/${pointId}`, data);
            return response.data;
        } catch (e) {
            error.value = e as Error;
            throw e;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        updateReadingPoint,
        isLoading,
        error,
    };
};
