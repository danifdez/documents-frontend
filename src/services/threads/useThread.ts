import { ref } from "vue";
import apiClient from "../api";

export function useThread() {
    const error = ref(null);
    const isLoading = ref(false);

    const loadThread = async (id: string): Promise<object> => {
        isLoading.value = true;
        const response = await apiClient.get(`/threads/${id}`);

        isLoading.value = false;
        return response.data;
    };

    const updateThread = async (id: string, threadData: any) => {
        try {
            const response = await apiClient.patch(`/threads/${id}`, threadData);
            return response.data;
        } catch (error) {
            console.error("Error updating thread:", error);
            throw error;
        }
    };

    const deleteThread = async (id: string) => {
        isLoading.value = true;
        error.value = null;
        try {
            await apiClient.delete(`/threads/${id}`);
            return true;
        } catch (err) {
            error.value = err.message || "Failed to delete thread";
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        error,
        isLoading,
        loadThread,
        updateThread,
        deleteThread,
    };
}