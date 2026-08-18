import { ref } from 'vue';
import apiClient from '../api';

// NOTE: complements useCanvas.ts / useCanvasList.ts (pending consolidation).

export const useCanvasDirectory = () => {
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const fetchCanvases = async (projectId?: number | string): Promise<any[]> => {
        isLoading.value = true;
        error.value = null;

        try {
            const url = projectId ? `/canvases/project/${projectId}` : '/canvases';
            const response = await apiClient.get(url);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to fetch canvases';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        isLoading,
        error,
        fetchCanvases,
    };
};
