import { ref } from 'vue';
import apiClient from '../api';
import { useApiRequest } from '../../composables/useApiRequest';

export function useCanvas() {
    const { isLoading, error, request } = useApiRequest();
    const canvases = ref<any[]>([]);

    const loadCanvas = (id: string): Promise<object> =>
        request('Failed to load canvas', async () => (await apiClient.get(`/canvases/${id}`)).data);

    const saveCanvas = (id: string, canvasData: object): Promise<object> =>
        request('Failed to save canvas', async () => (await apiClient.patch(`/canvases/${id}`, canvasData)).data);

    const createCanvas = (canvasData: object): Promise<object> =>
        request('Failed to create canvas', async () => (await apiClient.post('/canvases', canvasData)).data);

    const removeCanvas = (id: string): Promise<object> =>
        request('Failed to remove canvas', async () => (await apiClient.delete(`/canvases/${id}`)).data);

    const loadCanvasesByThread = (threadId: string | number): Promise<any[]> =>
        request('Failed to load canvases', async () => {
            canvases.value = (await apiClient.get(`/canvases/thread/${threadId}`)).data;
            return canvases.value;
        });

    const loadCanvasesByProject = (projectId: string | number): Promise<any[]> =>
        request('Failed to load canvases', async () => {
            canvases.value = (await apiClient.get(`/canvases/project/${projectId}`)).data;
            return canvases.value;
        });

    const fetchCanvases = (projectId?: number | string): Promise<any[]> =>
        request('Failed to fetch canvases', async () => {
            const url = projectId ? `/canvases/project/${projectId}` : '/canvases';
            canvases.value = (await apiClient.get(url)).data;
            return canvases.value;
        });

    return {
        canvases,
        error,
        isLoading,
        loadCanvas,
        saveCanvas,
        createCanvas,
        removeCanvas,
        loadCanvasesByThread,
        loadCanvasesByProject,
        fetchCanvases,
    };
}
