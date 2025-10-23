import { ref } from 'vue';
import apiClient from '../api';

export const useMarks = () => {
    const marks = ref<any[]>([]);
    const isLoading = ref(false);
    const error = ref<Error | null>(null);

    const loadMarks = async (resourceId: string): Promise<any[]> => {
        if (!resourceId) return [];

        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiClient.get(`/marks/resource/${resourceId}`);
            marks.value = response.data;
            return response.data;
        } catch (e) {
            error.value = e as Error;
            throw e;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        marks,
        loadMarks,
        isLoading,
        error
    };
};
