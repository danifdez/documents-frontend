import { ref } from "vue";
import apiClient from "../api";

export function useCanvas() {
    const error = ref(null);
    const isLoading = ref(false);

    const loadCanvas = async (id: string): Promise<object> => {
        isLoading.value = true;
        const response = await apiClient.get(`/canvases/${id}`);
        isLoading.value = false;
        return response.data;
    };

    const saveCanvas = async (id: string, canvasData: object) => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.patch(`/canvases/${id}`, canvasData);
            return response.data;
        } catch (err) {
            error.value = err.message || 'Failed to save canvas';
            console.error(error.value);
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const createCanvas = async (canvasData: object) => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.post(`/canvases`, canvasData);
            return response.data;
        } catch (err) {
            error.value = err.message || 'Failed to create canvas';
            console.error(error.value);
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const removeCanvas = async (id: string) => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.delete(`/canvases/${id}`);
            return response.data;
        } catch (err) {
            error.value = err.message || 'Failed to remove canvas';
            console.error(error.value);
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        error,
        isLoading,
        loadCanvas,
        saveCanvas,
        createCanvas,
        removeCanvas,
    };
}
