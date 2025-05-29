import { ref } from 'vue';
import apiClient from '../api';

export const useMarkCreate = () => {
    const isLoading = ref(false);
    const error = ref<Error | null>(null);

    const createMark = async (docId: string, content: string): Promise<any> => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiClient.post('/marks', {
                doc: docId,
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
        createMark,
        isLoading,
        error
    };
};
