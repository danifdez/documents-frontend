import { ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import apiClient from '../api';
import { getSocket } from '../notifications/notification';

export function useAsk() {
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const ask = async (question: string, projectId?: number, context?: string): Promise<void> => {
        isLoading.value = true;
        error.value = null;
        const requestId = uuidv4();

        return new Promise<void>((resolve) => {
            const socket = getSocket();

            const onResponse = (data: any) => {
                if (data.requestId === requestId) {
                    socket.off('askResponse', onResponse);
                    isLoading.value = false;
                    resolve();
                }
            };
            socket.on('askResponse', onResponse);

            apiClient.post('/model/ask', { question, projectId, requestId, context })
                .catch((err: any) => {
                    socket.off('askResponse', onResponse);
                    error.value = err.message || 'Failed to get response';
                    isLoading.value = false;
                    resolve();
                });
        });
    };

    return { ask, isLoading, error };
}
