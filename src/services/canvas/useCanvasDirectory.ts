import apiClient from '../api';
import { useApiRequest } from '../../composables/useApiRequest';

// NOTE: complements useCanvas.ts / useCanvasList.ts (pending consolidation).

export const useCanvasDirectory = () => {
    const { isLoading, error, request } = useApiRequest();

    const fetchCanvases = (projectId?: number | string): Promise<any[]> =>
        request('Failed to fetch canvases', async () => {
            const url = projectId ? `/canvases/project/${projectId}` : '/canvases';
            return (await apiClient.get(url)).data;
        });

    return {
        isLoading,
        error,
        fetchCanvases,
    };
};
