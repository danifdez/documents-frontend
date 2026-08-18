import apiClient from '../api';

export function useResourcePendingEntities() {
    const fetchPendingEntities = async (resourceId: string): Promise<any> => {
        const response = await apiClient.get(`/pending-entities/resource/${resourceId}`);
        return response.data;
    };

    return {
        fetchPendingEntities,
    };
}
