import type { ReadingPoint, ReadingPointAnchor } from './useReadingPoints';
import { ref } from 'vue';
import apiClient from '../api';

export const useReadingPointUpdate = () => {
    const isLoading = ref(false);
    const error = ref<Error | null>(null);

    const updateReadingPoint = async (
        pointId: string | number,
        data: { label?: string } & ReadingPointAnchor,
    ): Promise<ReadingPoint> => {
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
