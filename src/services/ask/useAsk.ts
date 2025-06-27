import { ref } from 'vue';
import apiClient from '../api';

export function useAsk() {
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const ask = async (question: string): Promise<string | null> => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.post('/ask', { question });
            return response.data.response;
        } catch (err: any) {
            error.value = err.message || 'Failed to get response';
            return null;
        } finally {
            isLoading.value = false;
        }
    };

    return { ask, isLoading, error };
}