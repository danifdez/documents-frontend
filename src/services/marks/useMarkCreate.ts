import { ref } from 'vue';
import apiClient from '../api';

export const useMarkCreate = () => {
    const isLoading = ref(false);
    const error = ref<Error | null>(null);

    const createMark = async (entityId: string, content: string, entityType: 'doc' | 'resource' = 'doc'): Promise<any> => {
        isLoading.value = true;
        error.value = null;

        try {
            const payload: Record<string, any> = { content };
            payload[entityType] = Number(entityId);

            const response = await apiClient.post('/marks', payload);
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
