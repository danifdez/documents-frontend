import { ref } from "vue";
import apiClient from "../api";

export function useResource() {
    const error = ref(null);
    const isLoading = ref(false);

    const loadResource = async (id: string): Promise<object> => {
        isLoading.value = true;
        const response = await apiClient.get(`/resources/${id}`);

        isLoading.value = false;
        return response.data;
    };

    const updateResource = async (id: string, resourceData: any) => {
        try {
            const response = await apiClient.patch(`/resources/${id}`, resourceData);
            return response.data;
        } catch (error) {
            console.error("Error updating resource:", error);
            throw error;
        }
    };

    const deleteResource = async (id: string) => {
        isLoading.value = true;
        error.value = null;
        try {
            await apiClient.delete(`/resources/${id}`);
            return true;
        } catch (err) {
            error.value = err.message || "Failed to delete resource";
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        error,
        isLoading,
        loadResource,
        updateResource,
        deleteResource,
    };
}