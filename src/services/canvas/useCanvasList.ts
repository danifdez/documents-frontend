import { ref } from "vue";
import apiClient from "../api";

export function useCanvasList() {
    const canvases = ref([]);
    const error = ref(null);
    const isLoading = ref(false);

    const loadCanvasesByThread = async (threadId: string) => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get(`/canvases/thread/${threadId}`);
            canvases.value = response.data;
            return response.data;
        } catch (err) {
            error.value = err;
            canvases.value = [];
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const loadCanvasesByProject = async (projectId: string) => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get(`/canvases/project/${projectId}`);
            canvases.value = response.data;
            return response.data;
        } catch (err) {
            error.value = err;
            canvases.value = [];
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        canvases,
        error,
        isLoading,
        loadCanvasesByThread,
        loadCanvasesByProject,
    };
}
