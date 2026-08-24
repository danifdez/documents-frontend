import { ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import apiClient from '../api';
import { subscribeExecutionPublication } from '../notifications/executionPublication';

export function useAsk() {
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const ask = async (question: string, projectId?: number, context?: string): Promise<void> => {
        isLoading.value = true;
        error.value = null;
        const requestId = uuidv4();

        return new Promise<void>((resolve) => {
            const onResponse = (data: any) => {
                if (data.requestId === requestId) {
                    unsubscribe();
                    isLoading.value = false;
                    resolve();
                }
            };
            let unsubscribe: () => void = () => undefined;
            unsubscribe = subscribeExecutionPublication('askResponse', onResponse);

            apiClient.post('/model/ask', { question, projectId, requestId, context })
                .catch((err: any) => {
                    unsubscribe();
                    error.value = err.message || 'Failed to get response';
                    isLoading.value = false;
                    resolve();
                });
        });
    };

    return { ask, isLoading, error };
}
