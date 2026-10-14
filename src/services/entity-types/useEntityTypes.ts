import apiClient from '../api';
import { useApiRequest } from '../../composables/useApiRequest';

export interface EntityType {
    id: number;
    name: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
}

export const useEntityTypes = () => {
    const { isLoading, error, request } = useApiRequest();

    const fetchEntityTypes = (): Promise<EntityType[]> =>
        request('Failed to fetch entity types', async () =>
            (await apiClient.get<EntityType[]>('/entity-types')).data);

    return {
        isLoading,
        error,
        fetchEntityTypes,
    };
};
