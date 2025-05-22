import { ref } from "vue";
import apiClient from "../api";

export function useThreadCreate() {
    const newThreadId = ref<string | null>(null);
    const status = ref<boolean>(false);
    const error = ref<string | null>(null);
    const isLoading = ref<boolean>(false);

    const createThread = async (name: string, projectId: string, description?: string) => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiClient.post('/threads', {
                name,
                project: projectId,
                description,
            });

            newThreadId.value = response.data._id;
            status.value = true;
            return response.data;
        } catch (err) {
            console.error('Error creating thread:', err);
            error.value = err.response?.data?.message || 'Failed to create thread';
            status.value = false;
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        newThreadId,
        status,
        error,
        isLoading,
        createThread,
    };
}